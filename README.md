# CDN Checker

A Visual Studio Code extension that checks if image/video/script links in your project are broken, redirecting, or too large.

## Features

- ✅ **Link Validation**: Checks HTTP/HTTPS links for images, videos, scripts, and stylesheets
- 🔍 **Comprehensive Scanning**: Supports HTML, CSS, JavaScript, TypeScript, Markdown, and more
- 📊 **Detailed Reports**: Shows broken links, redirects, oversized files, and timeouts
- ⚙️ **Configurable**: Customizable file size limits, timeouts, and file extensions
- 🚀 **Fast**: Uses HEAD requests for efficient checking

## Supported Link Types

- **Images**: `<img src="...">`, `url()` in CSS, `![](...)` in Markdown
- **Videos**: `<video src="...">`, `<source src="...">`
- **Scripts**: `<script src="...">`, `import ... from "..."`
- **Stylesheets**: `<link href="...">`
- **Generic URLs**: Any HTTP/HTTPS URL found in text

## Commands

- **CDN Checker: Check All Links** - Scans all files in the workspace
- **CDN Checker: Check Current File Links** - Scans only the currently open file

## Usage

1. Open a project in VS Code
2. Right-click in the Explorer or Editor
3. Select "CDN Checker: Check All Links" or "CDN Checker: Check Current File Links"
4. View the results in the generated report

## Configuration

Open VS Code settings and configure:

```json
{
  "cdn-checker.maxFileSize": 5242880,
  "cdn-checker.timeout": 10000,
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
    ".json"
  ]
}
```

### Settings

- `cdn-checker.maxFileSize`: Maximum file size in bytes (default: 5MB)
- `cdn-checker.timeout`: Request timeout in milliseconds (default: 10s)
- `cdn-checker.fileExtensions`: File extensions to scan for links

## Results

The extension generates a detailed markdown report showing:

- **Summary**: Count of working links and issues found
- **Issues by Category**:
  - Broken links (4xx/5xx status codes)
  - Redirects (3xx status codes)
  - Too large files (exceeding size limit)
  - Timeouts and errors
- **Working Links**: List of all validated links

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to compile TypeScript
4. Press `F5` to open a new VS Code window with the extension loaded

## Building

```bash
npm install
npm run compile
```

## Development

```bash
npm run watch  # Watch for changes and recompile
```

## Requirements

- Visual Studio Code 1.74.0 or higher
- Node.js for development

## License

MIT License
