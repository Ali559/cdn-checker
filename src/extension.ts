import * as vscode from 'vscode';
import axios, { AxiosResponse } from 'axios';
import * as path from 'path';
import * as fs from 'fs';

interface LinkInfo {
	url: string;
	line: number;
	column: number;
	file: string;
	type: 'image' | 'video' | 'script' | 'stylesheet' | 'unknown';
}

interface CheckResult {
	url: string;
	status: 'ok' | 'broken' | 'redirect' | 'too_large' | 'timeout' | 'error';
	statusCode?: number;
	redirectUrl?: string;
	size?: number;
	error?: string;
}

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

async function checkAllLinks() {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		vscode.window.showErrorMessage('No workspace folder found');
		return;
	}

	const config = vscode.workspace.getConfiguration('cdn-checker');
	const fileExtensions = config.get<string[]>('fileExtensions') || [];

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

				const links = await extractLinksFromFile(files[i]);
				allLinks.push(...links);
			}

			progress.report({ message: 'Checking links...', increment: 50 });
			await checkLinks(allLinks, progress, token);
		} catch (error) {
			vscode.window.showErrorMessage(`Error scanning files: ${error}`);
		}
	});
}

async function checkCurrentFile() {
	const activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor) {
		vscode.window.showErrorMessage('No active file');
		return;
	}

	const filePath = activeEditor.document.fileName;

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'CDN Checker: Checking current file...',
		cancellable: true
	}, async (progress, token) => {
		try {
			const links = await extractLinksFromFile(filePath);

			if (links.length === 0) {
				vscode.window.showInformationMessage('No links found in current file');
				return;
			}

			await checkLinks(links, progress, token);
		} catch (error) {
			vscode.window.showErrorMessage(`Error checking file: ${error}`);
		}
	});
}

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

async function extractLinksFromFile(filePath: string): Promise<LinkInfo[]> {
	const content = await fs.promises.readFile(filePath, 'utf-8');
	const links: LinkInfo[] = [];
	const lines = content.split('\n');

	// Regular expressions for different link types
	const patterns = [
		// HTML img src
		{ regex: /<img[^>]+src\s*=\s*["']([^"']+)["']/gi, type: 'image' as const },
		// HTML video src
		{ regex: /<video[^>]+src\s*=\s*["']([^"']+)["']/gi, type: 'video' as const },
		// HTML source src (for video/audio)
		{ regex: /<source[^>]+src\s*=\s*["']([^"']+)["']/gi, type: 'video' as const },
		// HTML script src
		{ regex: /<script[^>]+src\s*=\s*["']([^"']+)["']/gi, type: 'script' as const },
		// HTML link href (stylesheets)
		{ regex: /<link[^>]+href\s*=\s*["']([^"']+)["']/gi, type: 'stylesheet' as const },
		// CSS url() - images and fonts
		{ regex: /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi, type: 'image' as const },
		// JavaScript/TypeScript imports
		{ regex: /import\s+.*\s+from\s+["']([^"']+)["']/gi, type: 'script' as const },
		// Markdown images
		{ regex: /!\[.*?\]\(([^)]+)\)/gi, type: 'image' as const },
		// Generic HTTP/HTTPS URLs
		{ regex: /https?:\/\/[^\s"'<>]+/gi, type: 'unknown' as const }
	];

	lines.forEach((line, lineIndex) => {
		patterns.forEach(({ regex, type }) => {
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
		});
	});

	return links;
}

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