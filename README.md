# @voiden/publish

Static documentation site generator for Voiden projects. Converts `.void` and `.md` files into a self-contained, searchable docs site with zero runtime dependencies.

## Install

```bash
npm install @voiden/publish
```

## Usage

### Build

Generate a static site from a directory of `.void` and `.md` files:

```bash
voiden-publish build ./my-docs
voiden-publish build ./my-docs --out ./dist
voiden-publish build ./my-docs --repo-url https://github.com/myorg/myrepo
```

### Serve

Run a dev server with live reload:

```bash
voiden-publish serve ./my-docs
voiden-publish serve ./my-docs --port 3000
```

The server watches for file changes and rebuilds automatically.

## Configuration

Create a `voiden.publish.yaml` in your docs root to customize the generated site:

```yaml
# Site title (shown in sidebar and <title> tag)
title: "My API Docs"

# Logo — file path (relative to docs root), URL, or inline SVG
logo: "./logo.svg"

# Favicon — file path or URL
favicon: "./favicon.png"

# Primary accent color (CSS hex)
accentColor: "#a78bfa"

# Footer
footer:
  links:
    - label: "GitHub"
      url: "https://github.com/myorg"
    - label: "Discord"
      url: "https://discord.gg/myserver"
  copyright: "© 2026 My Company"

# Raw HTML injected into <head>
headTags: |
  <script defer src="https://analytics.example.com/script.js"></script>

# Path to a custom CSS file (relative to docs root)
customCSS: "./custom.css"
```

All fields are optional. Without a config file, the site uses default branding.

## Features

- **Void block rendering** — request, headers, query params, path params, JSON/XML/YAML bodies, auth, file links, linked blocks, and tables
- **Copy to Voiden** — one-click copy of individual blocks or entire pages back into the Voiden editor
- **Sidebar navigation** — auto-generated file tree with folder collapsing and active page highlighting
- **Search** — client-side file search with `/` keyboard shortcut
- **Project ZIP** — downloadable archive of all `.void` source files
- **Fully self-contained** — each HTML page embeds all CSS and JS, no external assets needed
- **Dark theme** — built-in dark UI with customizable accent color
- **Responsive** — collapsible sidebar on small screens

## Project Structure

```
src/
  cli.ts              CLI entry point
  build.ts            Static site builder + ZIP generation
  serve.ts            Dev server with file watching
  config.ts           voiden.publish.yaml loader
  parser.ts           .void and .md file parser
  renderer.ts         Parsed nodes to HTML
  template.ts         Page template, CSS, and client JS
  blocks/
    _registry.ts      Block plugin registry
    _helpers.ts       Shared rendering helpers
    core.ts           Table, fileLink, linkedBlock
    rest-api.ts       HTTP request blocks
    auth.ts           Authentication blocks
```

## Supported Block Types

| Category | Types |
|----------|-------|
| **REST API** | `request`, `headers-table`, `query-table`, `path-table`, `url-table`, `multipart-table`, `json_body`, `xml_body`, `yml_body` |
| **Auth** | `auth` |
| **Core** | `table`, `fileLink`, `linkedBlock` |
