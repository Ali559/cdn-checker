# CDN Checker

A Visual Studio Code extension that helps you identify broken, redirecting, or oversized external links in your project files. Perfect for maintaining healthy CDN references, image links, video embeds, and other external resources.

## Features

- 🔍 **Comprehensive Link Detection**: Automatically finds external links in various file types
- 🏥 **Health Checks**: Identifies broken links, redirects, oversized files, and timeouts
- 📁 **Workspace & File Scanning**: Check all files in your workspace or just the current file
- 📊 **Detailed Reports**: Get comprehensive markdown reports with actionable insights
- ⚙️ **Configurable**: Customize file types, size limits, timeouts, and more
- 🎯 **Selective Scanning**: Choose specific resource types to check (images, videos, documents, etc.)

### Supported Link Types

- **Images**: JPG, PNG, GIF, BMP, SVG, WebP, TIFF, ICO, AVIF, HEIC
- **Videos**: MP4, AVI, MOV, WMV, FLV, MKV, WebM, 3GP, OGG, YouTube, Vimeo
- **Documents**: Google Docs/Sheets/Slides, Microsoft Office files, PDFs
- **Scripts**: JavaScript files, ES6 imports
- **Stylesheets**: CSS files, @import statements
- **CDN Resources**: Any external HTTP/HTTPS resource

## Installation

1. Open Visual Studio Code
2. Press `Ctrl+P` (or `Cmd+P` on Mac) to open the Quick Open dialog
3. Type `ext install alibarznji.cdn-checker`
4. Press Enter and reload VS Code

## Usage

### Commands

The extension provides two main commands accessible via the Command Palette (`Ctrl+Shift+P`):

#### Check All Links
- **Command**: `CDN Checker: Check All Links`
- Scans all files in your workspace for external links
- Respects the configured file extensions and link types

#### Check Current File Links
- **Command**: `CDN Checker: Check Current File Links`
- Scans only the currently active file for external links

### Context Menus

- **Explorer Context Menu**: Right-click in the file explorer to check all workspace links
- **Editor Context Menu**: Right-click in any file to check links in that specific file

### Results

After scanning, you'll receive:
- ✅ **Success notification** if all links are working
- ⚠️ **Warning notification** with issue count if problems are found
- 📄 **Detailed markdown report** listing all issues and working links

## Configuration

Customize the extension behavior through VS Code settings:

```json
{
  "cdn-checker.maxFileSize": 5242880,
  "cdn-checker.timeout": 10000,
  "cdn-checker.fileExtensions": [
    ".html", ".htm", ".js", ".ts", ".jsx", ".tsx",
    ".css", ".scss", ".sass", ".less",
    ".vue", ".svelte", ".md", ".json",
    "*.go", "*.py", "*.php", "*.rb", "*.java",
    "*.kt", "*.swift", "*.c", "*.cpp", "*.txt", "*.cs"
  ],
  "cdn-checker.filesToCheckFor": "all"
}
```

### Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `maxFileSize` | number | 5242880 | Maximum file size in bytes (5MB default) |
| `timeout` | number | 10000 | Request timeout in milliseconds (10s default) |
| `fileExtensions` | array | [see above] | File extensions to scan for links |
| `filesToCheckFor` | string | "all" | Types of links to check: `image`, `video`, `document`, `pdf`, `script`, `stylesheet`, or `all` |

## Example Use Cases

### Web Development
```html
<!-- These links will be checked -->
<img src="https://cdn.example.com/images/logo.png" alt="Logo">
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto">
```

### Markdown Documentation
```markdown
![Screenshot](https://example.com/screenshot.png)
[Download PDF](https://example.com/document.pdf)
```

### React/Vue Components
```jsx
import axios from 'https://cdn.skypack.dev/axios';

const VideoPlayer = () => (
  <video src="https://example.com/video.mp4" controls />
);
```

## Link Status Types

- **✅ OK**: Link is working correctly
- **🔴 Broken**: Link returns 4xx or 5xx HTTP status
- **🔄 Redirect**: Link redirects (301/302 status)
- **📦 Too Large**: File exceeds configured size limit
- **⏰ Timeout**: Request timed out
- **❌ Error**: Network or other error occurred

## Report Format

The extension generates detailed markdown reports with:

```markdown
# CDN Checker Results

**Summary:** 15 OK, 3 issues found

## Issues Found

### BROKEN
- **https://example.com/missing-image.png**
  - File: index.html:42:15
  - Type: image
  - Status Code: 404
  - Error: HTTP 404

### REDIRECT
- **http://old-cdn.com/script.js**
  - File: main.js:1:25
  - Type: script
  - Status Code: 301
  - Redirects to: https://new-cdn.com/script.js

## Working Links (15)
- ✅ https://cdn.example.com/logo.png (header.html:12)
- ✅ https://fonts.googleapis.com/css?family=Roboto (styles.css:5)
```

## Performance

- **Efficient Scanning**: Uses HEAD requests to check link status without downloading content
- **Parallel Processing**: Checks multiple links simultaneously
- **Cancellable Operations**: Long-running scans can be cancelled by the user
- **Progress Tracking**: Real-time progress updates during scanning

## Contributing

We welcome contributions! Please see our [GitHub repository](https://github.com/ali559/cdn-checker) for:
- 🐛 Bug reports
- 💡 Feature requests
- 🔧 Pull requests
- 📚 Documentation improvements

## License

This extension is licensed under the MIT License.

## Release Notes

### 0.0.1
- Initial release
- Basic link checking functionality
- Support for images, videos, documents, scripts, and stylesheets
- Configurable scanning options
- Markdown report generation

---

**Enjoy using CDN Checker!** 🚀

For support or questions, please visit our [GitHub Issues](https://github.com/ali559/cdn-checker/issues) page.