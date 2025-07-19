import * as vscode from 'vscode';
import axios, { AxiosResponse } from 'axios';
import * as path from 'path';
import * as fs from 'fs';

interface LinkInfo {
	url: string;
	line: number;
	column: number;
	file: string;
	type: 'image' | 'video' | 'document' | 'pdf' | 'script' | 'stylesheet' | 'all';
}

interface CheckResult {
	url: string;
	status: 'ok' | 'broken' | 'redirect' | 'too_large' | 'timeout' | 'error';
	statusCode?: number;
	redirectUrl?: string;
	size?: number;
	error?: string;
}

/**
 * Activates the CDN Checker extension.
 *
 * This function is called when the extension is activated. It registers the
 * commands for checking all links in the workspace and checking links in the
 * current file, and adds them to the extension's subscriptions for proper
 * cleanup when the extension is deactivated.
 *
 * @param context - The extension context provided by VS Code, which is used
 * to manage the extension's lifecycle and state.
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('CDN Checker extension is now active!');

	const checkLinksCommand = vscode.commands.registerCommand('cdn-checker.checkLinks', async () => {
		await checkAllLinks();
	});

	const checkCurrentFileCommand = vscode.commands.registerCommand('cdn-checker.checkCurrentFile', async () => {
		await checkCurrentFile();
	});

	context.subscriptions.push(checkLinksCommand, checkCurrentFileCommand);
}



/**
 * Scans all files in the workspace for external links and checks their status.
 *
 * This function retrieves the workspace folder, obtains the configuration for
 * file extensions to scan, and the types of files to check for links. It then
 * iterates over all matching files in the workspace, extracting links and
 * checking their status using the CDN Checker. Progress is reported to the user
 * during the operation, and any errors encountered are displayed as messages.
 *
 * The function utilizes a progress notification to provide feedback on the
 * scanning and checking processes. If the user cancels the operation, it
 * terminates early.
 */
async function checkAllLinks() {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		vscode.window.showErrorMessage('No workspace folder found');
		return;
	}

	const config = vscode.workspace.getConfiguration('cdn-checker');
	const fileExtensions = config.get<string[]>('fileExtensions') || [];
	const filesToCheckFor = config.get<string>('filesToCheckFor') || 'all';
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'CDN Checker: Scanning files...',
		cancellable: true
	}, async (progress, token) => {
		try {
			const files = await findFilesInWorkspace(workspaceFolder.uri.fsPath, fileExtensions);
			const allLinks: LinkInfo[] = [];

			for (let i = 0; i < files.length; i++) {
				if (token.isCancellationRequested) {
					return;
				}

				progress.report({
					message: `Scanning ${path.basename(files[i])} (${i + 1}/${files.length})`,
					increment: (1 / files.length) * 50
				});

				const links = await extractLinksFromFile(files[i], filesToCheckFor);
				allLinks.push(...links);
			}

			progress.report({ message: 'Checking links...', increment: 50 });
			await checkLinks(allLinks, progress, token);
		} catch (error) {
			vscode.window.showErrorMessage(`Error scanning files: ${error}`);
		}
	});
}

/**
 * Checks all external links in the currently active file for their status.
 *
 * This function retrieves the active text editor and file path, then uses the
 * configured link types to scan the file for external URLs. It reports progress
 * during the operation and handles any errors that occur.
 *
 * If no active file is found, an error message is displayed to the user.
 * If no links of the specified types are found, an informational message is shown.
 *
 * Progress is reported through a notification, and the link checking can be
 * canceled by the user. Results are processed and displayed by the link checking
 * function.
 */
async function checkCurrentFile() {
	const activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor) {
		vscode.window.showErrorMessage('No active file');
		return;
	}

	const filePath = activeEditor.document.fileName;
	const config = vscode.workspace.getConfiguration('cdn-checker');
	const filesToCheckFor = config.get<string>('filesToCheckFor') || 'all';
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'CDN Checker: Checking current file...',
		cancellable: true
	}, async (progress, token) => {
		try {
			const links = await extractLinksFromFile(filePath, filesToCheckFor);

			if (links.length === 0) {
				vscode.window.showInformationMessage(`No links of type ${filesToCheckFor === 'all' ? 'Image | Video | Document | PDF' : filesToCheckFor.toUpperCase()} found in current file`);
				return;
			}

			await checkLinks(links, progress, token);
		} catch (error) {
			vscode.window.showErrorMessage(`Error checking file: ${error}`);
		}
	});
}

/**
 * Recursively scans the given workspace directory and its subdirectories for files
 * with the given extensions. Ignores hidden directories and the node_modules
 * directory. Returns a promise that resolves to an array of file paths.
 *
 * @param workspacePath The path to the workspace directory to scan.
 * @param extensions An array of file extensions (without leading dots) to search
 * for.
 * @returns A promise that resolves to an array of file paths.
 */
async function findFilesInWorkspace(workspacePath: string, extensions: string[]): Promise<string[]> {
	const files: string[] = [];

	async function scanDirectory(dir: string) {
		const entries = await fs.promises.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
				await scanDirectory(fullPath);
			} else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
				files.push(fullPath);
			}
		}
	}

	await scanDirectory(workspacePath);
	return files;
}

	/**
	 * Extracts links from the given file. The links are extracted from the file content
	 * using regular expressions. The links are then returned as an array of objects with
	 * the following properties: `url`, `line`, `column`, `file`, and `type`.
	 *
	 * @param filePath The path to the file to extract links from.
	 * @param fileTypeToLookFor The type of file to look for links in. Can be 'image', 'video', 'document', 'pdf', 'script', 'stylesheet', or 'all'.
	 * @returns A promise that resolves to an array of link objects.
	 */
async function extractLinksFromFile(filePath: string, fileTypeToLookFor: string): Promise<LinkInfo[]> {
	const content = await fs.promises.readFile(filePath, 'utf-8');
	const links: LinkInfo[] = [];
	const lines = content.split('\n');
	const urlPattern = 'https?://(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,6}(?:/[^#?&]*)?(?:/[a-zA-Z0-9_-]+/)*(?:[a-zA-Z0-9_.-]+\\.(?:[a-zA-Z0-9]+))?(?:\\?[^#\\s]*)?(?:#[^\\s]*)?';
	// Regular expressions for different link types
	const patterns = [
		// Absolute URLs
		{ regex: /(?:)(https?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(?:\/[^#?&]*)?\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:jpe?g|png|gif|bmp|svg|webp|tiff|ico|avif|heic))/gi, type: 'image' as const },
		{ regex: /(?:)(https?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(?:\/[^#?&]*)?\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:mp4|avi|mov|wmv|flv|mkv|webm|3gp|ogg)|https?:\/\/(?:www\.)?youtube\.com\/(?:watch\?v=|embed\/|v\/|)([a-zA-Z0-9_-]{11})|https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})|https?:\/\/(?:www\.)?vimeo\.com\/([0-9]+))/gi, type: 'video' as const },
		{ regex: /(?:)(https?:\/\/(?:docs|drive)\.google\.com\/(?:document|presentation|spreadsheets|forms|drawings)\/d\/([a-zA-Z0-9_-]+)(?:\/edit|\/view|\/preview|\/pub)?(?:[?#].*)?)/gi, type: 'document' as const },
		{ regex: /(?:)(https?:\/\/(?:(?:[a-zA-Z0-9-]+\.)*sharepoint\.com|(?:[a-zA-Z0-9-]+\.)*onedrive\.live\.com|docs\.microsoft\.com)\/[^#?&]+\.(?:docx|xlsx|pptx|doc|xls|ppt)(?:[?#].*)?)/gi, type: 'document' as const },
		{ regex: /(?:)(https?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(?:\/[^#?&]*)?\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.pdf(?:[?#].*)?)/gi, type: 'document' as const },
		{ regex: /(?:)(https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:unsplash\.com|img[a-zA-Z0-9-]*\.[a-zA-Z]{2,6}|cdn[a-zA-Z0-9-]*\.[a-zA-Z]{2,6}|images?\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,6})\/(?:[^\s?#]+\/)*[^\s?#]+\?[^#\s]+)/gi, type: 'image' as const },
		{ regex: /!\[.*?\]\(([^)]+)\)/gi, type: 'image' as const },
		// Images: <img src="...">, url() in CSS, ![](...) in Markdown, general image URLs
		{ regex: new RegExp(`(?:<img[^>]*src=["'](${urlPattern})["']|url\\(['"]?(${urlPattern})['"]?\\)|!\\[.*?\\]\\((${urlPattern})\\)|${urlPattern}\\.(?:jpe?g|png|gif|bmp|svg|webp|tiff|ico|avif|heic))`, 'gi'), type: 'image' as const },
		// Videos: <video src="...">, <source src="...">, YouTube, Vimeo
		{ regex: new RegExp(`(?:<video[^>]*src=["'](${urlPattern})["']|<source[^>]*src=["'](${urlPattern})["']|https?://(?:www\\.)?youtube\\.com/(?:watch\\?v=|embed/|v/)([a-zA-Z0-9_-]{11})|https?://(?:www\\.)?youtu\\.be/([a-zA-Z0-9_-]{11})|https?://(?:www\\.)?vimeo\\.com/([0-9]+))`, 'gi'), type: 'video' as const },
		// Scripts: <script src="...">, import ... from "...", general JS files
		{ regex: new RegExp(`(?:<script[^>]*src=["'](${urlPattern})["']|import\\s+(?:\\{[^}]*\\}|\\*\\s+as\\s+\\w+)?\\s*from\\s*["'](${urlPattern})["']|${urlPattern}\\.js)`, 'gi'), type: 'script' as const },
		// Stylesheets: <link href="...">, url() in CSS (already covered by image, but good to have a specific catch for .css), general CSS files
		{ regex: new RegExp(`(?:<link[^>]*href=["'](${urlPattern})["']|${urlPattern}\\.css)`, 'gi'), type: 'stylesheet' as const },
		// Documents: Google Docs/Drive, Microsoft Office (SharePoint/OneDrive/docs.microsoft.com)
		{ regex: new RegExp(`(?:https?://(?:docs|drive)\\.google\\.com/(?:document|presentation|spreadsheets|forms|drawings)/d/([a-zA-Z0-9_-]+)(?:/edit|/view|/preview|/pub)?(?:[?#].*)?|https?://(?:(?:[a-zA-Z0-9-]+\\.)*sharepoint\\.com|(?:[a-zA-Z0-9-]+\\.)*onedrive\\.live\\.com|docs\\.microsoft\\.com)/[^#?&]+\\.(?:docx|xlsx|pptx|doc|xls|ppt)(?:[?#].*)?)`, 'gi'), type: 'document' as const },
		// PDFs: Specific PDF links
		{ regex: new RegExp(`(?:${urlPattern}\\.pdf)`, 'gi'), type: 'pdf' as const },
	];

	const filePatterns = patterns.filter((pattern) => {
		if (fileTypeToLookFor === 'all') {
			return true;
		}
		return pattern.type === fileTypeToLookFor;
	});

	lines.forEach((line, lineIndex) => {
		for (let i = 0; i < filePatterns.length; i++) {
			const { regex, type } = filePatterns[i];
			let match;
			while ((match = regex.exec(line)) !== null) {
				const url = match[1] || match[0];

				// Only process external URLs (http/https)
				if (url.startsWith('http://') || url.startsWith('https://')) {
					links.push({
						url,
						line: lineIndex + 1,
						column: match.index + 1,
						file: filePath,
						type
					});
				}
			}
		}
	});

	return links;
}

	/**
	 * Checks a list of links and reports on their status.
	 *
	 * The function takes a list of LinkInfo objects and a progress
	 * notification, and checks each link for its status. The results
	 * are then processed and displayed in a report.
	 *
	 * @param links - A list of LinkInfo objects to check.
	 * @param progress - A progress notification to report on the
	 * checking process.
	 * @param token - A cancellation token to check if the user has
	 * canceled the operation.
	 */
async function checkLinks(links: LinkInfo[], progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken) {
	const config = vscode.workspace.getConfiguration('cdn-checker');
	const maxFileSize = config.get<number>('maxFileSize') || 5242880; // 5MB
	const timeout = config.get<number>('timeout') || 10000; // 10s

	const results: (LinkInfo & CheckResult)[] = [];

	for (let i = 0; i < links.length; i++) {
		if (token.isCancellationRequested) {
			return;
		}

		const link = links[i];
		progress.report({
			message: `Checking ${link.url} (${i + 1}/${links.length})`,
			increment: (1 / links.length) * 50
		});

		try {
			const result = await checkSingleLink(link.url, maxFileSize, timeout);
			results.push({ ...link, ...result });
		} catch (error) {
			results.push({
				...link,
				status: 'error',
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	await showResults(results);
}

/**
 * Checks the status of a single URL by performing an HTTP HEAD request.
 *
 * This function determines if the URL is working, redirects, is too large, or
 * if there are other issues. It checks for redirections (301, 302), ensures
 * the file size does not exceed the given maximum size, and handles timeouts
 * and errors.
 *
 * @param url - The URL to be checked.
 * @param maxFileSize - The maximum allowed file size in bytes.
 * @param timeout - The maximum time to wait for a response in milliseconds.
 * @returns A promise that resolves with a CheckResult object describing the
 * status of the link, including any errors, status codes, or redirection
 * details.
 */

async function checkSingleLink(url: string, maxFileSize: number, timeout: number): Promise<CheckResult> {
	try {
		const response: AxiosResponse = await axios.head(url, {
			timeout,
			maxRedirects: 0,
			validateStatus: (status) => status < 400 || status === 301 || status === 302
		});

		const contentLength = response.headers['content-length'];
		const size = contentLength ? parseInt(contentLength, 10) : undefined;

		// Check for redirects
		if (response.status === 301 || response.status === 302) {
			return {
				url,
				status: 'redirect',
				statusCode: response.status,
				redirectUrl: response.headers.location,
				size
			};
		}

		// Check file size
		if (size && size > maxFileSize) {
			return {
				url,
				status: 'too_large',
				statusCode: response.status,
				size
			};
		}

		return {
			url,
			status: 'ok',
			statusCode: response.status,
			size
		};

	} catch (error: any) {
		if (error.code === 'ECONNABORTED') {
			return { url, status: 'timeout', error: 'Request timeout' };
		}

		if (error.response) {
			return {
				url,
				status: 'broken',
				statusCode: error.response.status,
				error: `HTTP ${error.response.status}`
			};
		}

		return {
			url,
			status: 'error',
			error: error.message || 'Unknown error'
		};
	}
}

/**
 * Displays the results of the link check to the user.
 *
 * If no problems were found, a simple informational message is displayed.
 * If there were problems, a new Markdown document is created and opened with
 * the detailed results, and a warning message is displayed with the number of
 * issues found.
 *
 * @param results - An array of objects with link information and check results.
 */
async function showResults(results: (LinkInfo & CheckResult)[]) {
	const problems = results.filter(r => r.status !== 'ok');

	if (problems.length === 0) {
		vscode.window.showInformationMessage(`CDN Checker: All ${results.length} links are working correctly!`);
		return;
	}

	// Create and show results in a new document
	const resultDoc = await vscode.workspace.openTextDocument({
		content: generateResultsReport(results),
		language: 'markdown'
	});

	await vscode.window.showTextDocument(resultDoc);

	vscode.window.showWarningMessage(
		`CDN Checker: Found ${problems.length} issues out of ${results.length} links checked`
	);
}

/**
 * Generates a Markdown report for the given link check results.
 *
 * The report summarizes the number of OK and problem links, and then lists
 * all problems found, grouped by status. Each problem is listed with its
 * URL, file location, type, and any relevant additional information (e.g.
 * status code, redirect URL, size, error message).
 *
 * If there are working links, they are listed at the end of the report.
 *
 * @param results - An array of objects with link information and check results.
 * @returns A Markdown-formatted string containing the report.
 */
function generateResultsReport(results: (LinkInfo & CheckResult)[]): string {
	const problems = results.filter(r => r.status !== 'ok');
	const okCount = results.filter(r => r.status === 'ok').length;

	let report = `# CDN Checker Results\n\n`;
	report += `**Summary:** ${okCount} OK, ${problems.length} issues found\n\n`;

	if (problems.length > 0) {
		report += `## Issues Found\n\n`;

		const groupedProblems = problems.reduce((acc, problem) => {
			if (!acc[problem.status]) {
				acc[problem.status] = [];
			}
			acc[problem.status].push(problem);
			return acc;
		}, {} as Record<string, (LinkInfo & CheckResult)[]>);

		Object.entries(groupedProblems).forEach(([status, items]) => {
			report += `### ${status.toUpperCase().replace('_', ' ')}\n\n`;

			items.forEach(item => {
				report += `- **${item.url}**\n`;
				report += `  - File: ${path.basename(item.file)}:${item.line}:${item.column}\n`;
				report += `  - Type: ${item.type}\n`;

				if (item.statusCode) {
					report += `  - Status Code: ${item.statusCode}\n`;
				}

				if (item.redirectUrl) {
					report += `  - Redirects to: ${item.redirectUrl}\n`;
				}

				if (item.size) {
					report += `  - Size: ${(item.size / 1024 / 1024).toFixed(2)} MB\n`;
				}

				if (item.error) {
					report += `  - Error: ${item.error}\n`;
				}

				report += '\n';
			});
		});
	}

	if (okCount > 0) {
		report += `## Working Links (${okCount})\n\n`;
		const okLinks = results.filter(r => r.status === 'ok');

		okLinks.forEach(link => {
			report += `- ✅ ${link.url} (${path.basename(link.file)}:${link.line})\n`;
		});
	}

	return report;
}

export function deactivate() { }