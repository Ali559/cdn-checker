-----
# CDN Checker

A Visual Studio Code extension that helps you identify and fix issues with external image, video, script, stylesheet, and document links in your project. It checks if these links are broken, redirecting, or too large, ensuring the integrity of your content.

-----

## Features

  * ✅ **Link Validation**: Verifies the status of external HTTP/HTTPS links, including images, videos, scripts, stylesheets, and various document types.
  * 🔍 **Comprehensive Scanning**: Scans a wide range of file types, including HTML, CSS, JavaScript, TypeScript, Markdown, and more, to find external URLs.
  * 📊 **Detailed Reports**: Generates a comprehensive Markdown report highlighting broken links, redirects, oversized files, and timeout issues.
  * ⚙️ **Highly Configurable**: Offers extensive customization for maximum file size, request timeouts, and the specific file extensions and types to scan.
  * 🚀 **Efficient Checking**: Utilizes HEAD requests for quick and resource-friendly link verification.

-----

## Supported Link Types

The extension is designed to detect and validate the following types of external links:

  * **Images**: Common image formats (e.g., `.jpg`, `.png`, `.gif`, `.svg`, `.webp`, `.tiff`, `.ico`, `.avif`, `.heic`), including those in `<img>` tags, CSS `url()` properties, and Markdown `![](...)` syntax.
  * **Videos**: Standard video formats (e.g., `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.mkv`, `.webm`, `.3gp`, `.ogg`), along with YouTube and Vimeo links.
  * **Scripts**: JavaScript files linked via `<script src="...">` tags or imported using ES module syntax (`import ... from "..."`).
  * **Stylesheets**: CSS files linked via `<link href="...">` tags or directly referenced `.css` URLs.
  * **Documents**: Google Docs/Drive links (documents, presentations, spreadsheets, forms, drawings), Microsoft Office documents (e.g., `.docx`, `.xlsx`, `.pptx`, `.doc`, `.xls`, `.ppt` from SharePoint/OneDrive/docs.microsoft.com), and PDF files (`.pdf`).

-----

## Commands

Access these commands through the VS Code Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) or via context menus in the Explorer and Editor:

  * **CDN Checker: Check All Links**: Initiates a scan of all supported external links across your entire workspace.
  * **CDN Checker: Check Current File Links**: Scans only the currently active file for external links.

-----

## Usage

1.  Open your project or a specific file in VS Code.
2.  Right-click in the **Explorer** (for `Check All Links`) or the **Editor** (for `Check Current File Links`).
3.  Select the desired "CDN Checker" command.
4.  A progress notification will appear, and once the scan is complete, a new Markdown document will open displaying the detailed results.

-----

## Configuration

You can customize the extension's behavior by adjusting the settings in your VS Code `settings.json` file (File \> Preferences \> Settings, then search for "CDN Checker" or edit JSON directly).

```json
{
  "cdn-checker.maxFileSize": 5242880, // Default: 5MB
  "cdn-checker.timeout": 10000,      // Default: 10 seconds
  "cdn-checker.fileExtensions": [
    ".html",
    ".htm",
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".vue",
    ".svelte",
    ".md",
    ".json",
    "*.go",
    "*.py",
    "*.php",
    "*.rb",
    "*.java",
    "*.kt",
    "*.swift",
    "*.c",
    "*.cpp",
    "*.txt",
    "*.cs"
  ],
  "cdn-checker.filesToCheckFor": "all" // Options: "image", "video", "script", "stylesheet", "document", "pdf", "all"
}
```

### Settings Explained

  * `cdn-checker.maxFileSize`: Sets the **maximum allowed size for external files** (in bytes). Links to files exceeding this size will be flagged. The default is `5242880` bytes (5 MB).
  * `cdn-checker.timeout`: Defines the **request timeout** for checking links (in milliseconds). If a link doesn't respond within this period, it will be flagged as a timeout. The default is `10000` milliseconds (10 seconds).
  * `cdn-checker.fileExtensions`: An array of **file extensions to scan** for links. The extension will only parse files with these specified endings.
  * `cdn-checker.filesToCheckFor`: Specifies the **types of external files to check**.
      * `"image"`: Only checks image links.
      * `"video"`: Only checks video links.
      * `"script"`: Only checks script links.
      * `"stylesheet"`: Only checks stylesheet links.
      * `"document"`: Only checks document links (Google Docs, Microsoft Office docs).
      * `"pdf"`: Only checks PDF links.
      * `"all"`: Checks all supported link types (default).

-----

## Results Report

After a scan, the extension generates a detailed Markdown report with the following sections:

  * **Summary**: A quick overview of how many links were checked and how many issues were found.
  * **Issues Found**: Categorized problems for easy identification:
      * **BROKEN**: Links returning 4xx or 5xx HTTP status codes.
      * **REDIRECT**: Links that lead to a redirect (3xx status codes), including the target URL.
      * **TOO LARGE**: Files that exceed the `cdn-checker.maxFileSize` configuration.
      * **TIMEOUT**: Links that failed to respond within the `cdn-checker.timeout` period.
      * **ERROR**: Other network or request-related errors.
        Each issue includes the URL, file path, line/column number, detected type, and relevant status/error details.
  * **Working Links**: A list of all links that were successfully validated.

-----

## Installation (for Development)

If you'd like to contribute or run the extension from source:

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-repo/cdn-checker.git
    cd cdn-checker
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Compile the TypeScript source:
    ```bash
    pnpm run compile
    ```
4.  To launch a new VS Code window with the extension running, press `F5` in your development VS Code instance.

-----

## Building (for Production)

To create a VSIX package for distribution:

```bash
pnpm install
pnpm run package
```

-----

## Development Workflow

For active development, use the watch command to automatically recompile on changes:

```bash
pnpm run watch
```

This command runs `esbuild` in watch mode and `tsc` for type checking, ensuring your changes are compiled as you code.

-----

## Requirements

  * Visual Studio Code version `^1.102.0` or newer.
  * Node.js (LTS version recommended) for development and building.

-----

## License

This extension is licensed under the [MIT License](https://www.google.com/search?q=LICENSE).
