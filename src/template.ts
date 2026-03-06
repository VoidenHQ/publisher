import type { ProseMirrorNode } from "./parser.js";
import type { PublishConfig } from "./config.js";

interface FileTreeEntry {
  name: string;
  href?: string;
  children?: FileTreeEntry[];
}

interface HtmlPageOptions {
  sidebar?: string;
  allFiles?: string;
  pageBlocks?: ProseMirrorNode[];
  requestBlocks?: ProseMirrorNode[];
  repoUrl?: string;
  config?: PublishConfig;
}

export function htmlPage(title: string, bodyHtml: string, { sidebar = "", allFiles = "[]", pageBlocks = [], requestBlocks = [], repoUrl = "", config }: HtmlPageOptions = {}): string {
  const pageBlocksEncoded = Buffer.from(JSON.stringify(pageBlocks), "utf-8").toString("base64");
  const requestBlocksEncoded = Buffer.from(JSON.stringify(requestBlocks), "utf-8").toString("base64");
  const hasBlocks = pageBlocks.length > 0;
  const hasRequests = requestBlocks.length > 0;

  const siteTitle = config?.title || "Voiden Docs";
  const accentColor = config?.accentColor || "";
  const faviconTag = config?.favicon ? `<link rel="icon" href="${esc(config.favicon)}" />` : "";
  const headTags = config?.headTags || "";
  const customCSS = config?.customCSS || "";

  // Build accent color CSS overrides
  let accentOverride = "";
  if (accentColor) {
    accentOverride = `<style>:root { --accent: ${esc(accentColor)}; --accent-dim: ${esc(accentColor)}14; --accent-subtle: ${esc(accentColor)}26; }</style>`;
  }

  // Build logo HTML
  let logoHtml: string;
  if (config?.logo) {
    const logo = config.logo;
    if (logo.trimStart().startsWith("<")) {
      // Inline SVG
      logoHtml = `<div class="logo">${logo}<span>${esc(siteTitle)}</span></div>`;
    } else {
      // URL or data URI
      logoHtml = `<div class="logo"><img src="${esc(logo)}" alt="" width="20" height="20" /><span>${esc(siteTitle)}</span></div>`;
    }
  } else {
    logoHtml = `<div class="logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
          <span>${esc(siteTitle)}</span>
        </div>`;
  }

  // Build footer HTML
  let footerHtml = "";
  if (config?.footer && (config.footer.links.length > 0 || config.footer.copyright)) {
    const linksHtml = config.footer.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("");
    footerHtml = `<footer class="site-footer">
      ${linksHtml ? `<div class="footer-links">${linksHtml}</div>` : ""}
      ${config.footer.copyright ? `<div class="footer-copyright">${esc(config.footer.copyright)}</div>` : ""}
    </footer>`;
  }

  const actionBar = `<div class="page-action-bar">
  <div class="action-bar-left">
    <div class="action-dropdown">
      <button class="action-trigger" onclick="toggleActionMenu(this)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <span>Copy</span>
        <svg class="action-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="action-menu">
        ${hasBlocks ? `<button class="action-item" onclick="copyPageBlocks(this)" data-blocks="${pageBlocksEncoded}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <div class="action-item-text">
            <span class="action-item-label">Copy Current Page</span>
            <span class="action-item-desc">All blocks as Voiden paste</span>
          </div>
        </button>` : ""}
        ${hasRequests ? `<button class="action-item" onclick="copyPageBlocks(this)" data-blocks="${requestBlocksEncoded}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <div class="action-item-text">
            <span class="action-item-label">Copy Just Request</span>
            <span class="action-item-desc">Only request block(s)</span>
          </div>
        </button>` : ""}
        <a class="action-item" href="/project.zip" download>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <div class="action-item-text">
            <span class="action-item-label">Project Zip</span>
            <span class="action-item-desc">Download all .void files</span>
          </div>
        </a>
        ${repoUrl ? `<button class="action-item" onclick="copyRepoUrl(this)" data-url="${esc(repoUrl)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
          <div class="action-item-text">
            <span class="action-item-label">Project Checkout</span>
            <span class="action-item-desc">Copy git URL to clipboard</span>
          </div>
        </button>` : ""}
      </div>
    </div>
  </div>
</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} — ${esc(siteTitle)}</title>
  ${faviconTag}
  <style>${CSS}</style>
  ${customCSS ? `<style>${customCSS}</style>` : ""}
  ${accentOverride}
  ${headTags}
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        ${logoHtml}
      </div>
      <div class="search-container">
        <div class="search-box">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" class="search-input" placeholder="Search docs..." id="searchInput" autocomplete="off" />
          <kbd class="search-kbd">/</kbd>
        </div>
        <div class="search-results" id="searchResults"></div>
      </div>
      <nav class="sidebar-nav" id="sidebarNav">
        ${sidebar}
      </nav>
    </aside>
    <main class="content">
      <article>${actionBar}${bodyHtml}</article>
    </main>
    ${footerHtml}
  </div>
  <script>
    const ALL_FILES = ${allFiles};
    ${SCRIPT}
  </script>
</body>
</html>`;
}

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderSidebar(fileTree: FileTreeEntry[], currentPath: string): string {
  return renderTree(fileTree, currentPath, 0);
}

function renderTree(entries: FileTreeEntry[], currentPath: string, depth: number): string {
  const cls = depth === 0 ? ' class="nav-root"' : ' class="nav-children"';
  let html = `<ul${cls}>`;
  for (const entry of entries) {
    if (entry.children) {
      const hasActive = containsActive(entry.children, currentPath);
      html += `<li class="nav-folder">
        <button class="folder-toggle${hasActive ? " has-active" : ""}" onclick="this.parentElement.classList.toggle('open')" aria-expanded="${hasActive}">
          <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          <svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>${esc(entry.name)}</span>
        </button>
        ${renderTree(entry.children, currentPath, depth + 1)}
      </li>`;
    } else {
      const active = entry.href === currentPath;
      html += `<li class="nav-item">
        <a href="/${esc(entry.href || "")}" class="${active ? "active" : ""}">
          <svg class="file-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>${esc(entry.name)}</span>
        </a>
      </li>`;
    }
  }
  html += "</ul>";
  return html;
}

function containsActive(children: FileTreeEntry[], currentPath: string): boolean {
  for (const c of children) {
    if (c.href === currentPath) return true;
    if (c.children && containsActive(c.children, currentPath)) return true;
  }
  return false;
}

const SCRIPT = `
// Copy void block to clipboard in Voiden's block:// format
function copyVoidBlock(btn) {
  var encoded = btn.getAttribute('data-block');
  var json = atob(encoded);
  var clipboardText = 'block://' + json;
  navigator.clipboard.writeText(clipboardText).then(function() {
    btn.classList.add('copied');
    setTimeout(function() { btn.classList.remove('copied'); }, 1800);
  });
}

// Page-level action menu
function toggleActionMenu(btn) {
  var dropdown = btn.closest('.action-dropdown');
  dropdown.classList.toggle('open');
}

function closeAllMenus() {
  document.querySelectorAll('.action-dropdown.open').forEach(function(d) {
    d.classList.remove('open');
  });
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.action-dropdown')) closeAllMenus();
});

function flashActionItem(btn, ok) {
  btn.classList.add(ok ? 'flash-ok' : 'flash-err');
  setTimeout(function() { btn.classList.remove('flash-ok', 'flash-err'); }, 1800);
  closeAllMenus();
}

function copyPageBlocks(btn) {
  var encoded = btn.getAttribute('data-blocks');
  var json = atob(encoded);
  navigator.clipboard.writeText(json).then(
    function() { flashActionItem(btn, true); },
    function() { flashActionItem(btn, false); }
  );
}

function copyRepoUrl(btn) {
  var url = btn.getAttribute('data-url');
  navigator.clipboard.writeText(url).then(
    function() { flashActionItem(btn, true); },
    function() { flashActionItem(btn, false); }
  );
}

(function() {
  // Collapsible folders — open ones containing active link
  document.querySelectorAll('.nav-folder').forEach(f => {
    if (f.querySelector('.active')) f.classList.add('open');
  });

  // Search
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  const nav = document.getElementById('sidebarNav');

  input.addEventListener('input', function() {
    const q = this.value.trim().toLowerCase();
    if (!q) {
      results.innerHTML = '';
      results.classList.remove('visible');
      nav.style.display = '';
      return;
    }
    nav.style.display = 'none';
    const matches = ALL_FILES.filter(f => f.name.toLowerCase().includes(q) || (f.folder && f.folder.toLowerCase().includes(q)));
    if (matches.length === 0) {
      results.innerHTML = '<div class="search-empty">No results</div>';
    } else {
      results.innerHTML = matches.map(f =>
        '<a class="search-result" href="/' + f.href + '">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
          '<div class="search-result-text"><span class="search-result-name">' + f.name + '</span>' +
          (f.folder ? '<span class="search-result-path">' + f.folder + '</span>' : '') +
          '</div>' +
        '</a>'
      ).join('');
    }
    results.classList.add('visible');
  });

  // Keyboard shortcut: / to focus search
  document.addEventListener('keydown', function(e) {
    if (e.key === '/' && document.activeElement !== input && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      input.focus();
    }
    if (e.key === 'Escape' && document.activeElement === input) {
      input.value = '';
      input.dispatchEvent(new Event('input'));
      input.blur();
    }
  });
})();
`;

const CSS = `
:root {
  --bg: #09090b;
  --bg-surface: #0f0f12;
  --bg-elevated: #18181b;
  --bg-hover: #1e1e23;
  --border: #27272a;
  --border-subtle: #1e1e23;
  --text: #fafafa;
  --text-secondary: #a1a1aa;
  --text-tertiary: #71717a;
  --accent: #6d9fff;
  --accent-dim: rgba(109, 159, 255, 0.08);
  --accent-subtle: rgba(109, 159, 255, 0.15);
  --green: #4ade80;
  --green-dim: rgba(74, 222, 128, 0.12);
  --yellow: #facc15;
  --yellow-dim: rgba(250, 204, 21, 0.12);
  --red: #f87171;
  --red-dim: rgba(248, 113, 113, 0.12);
  --purple: #c084fc;
  --purple-dim: rgba(192, 132, 252, 0.12);
  --blue: #60a5fa;
  --blue-dim: rgba(96, 165, 250, 0.12);
  --radius: 8px;
  --radius-sm: 6px;
  --sidebar-width: 272px;
  --mono: "SF Mono", "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace;
  --sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  --transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  font-family: var(--sans);
  background: var(--bg);
  color: var(--text);
  line-height: 1.7;
  font-size: 15px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background: var(--accent-subtle);
  color: var(--text);
}

.layout {
  display: flex;
  min-height: 100vh;
}

/* ==================== SIDEBAR ==================== */
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.sidebar-header {
  padding: 16px 16px 0;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  padding: 4px 0 12px;
  letter-spacing: -0.01em;
}

.logo svg { color: var(--accent); opacity: 0.9; }

/* Search */
.search-container {
  padding: 0 12px 8px;
  flex-shrink: 0;
  position: relative;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 10px;
  transition: border-color var(--transition), box-shadow var(--transition);
}

.search-box:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

.search-icon { color: var(--text-tertiary); flex-shrink: 0; }

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 13px;
  font-family: var(--sans);
  padding: 8px 0;
  min-width: 0;
}

.search-input::placeholder { color: var(--text-tertiary); }

.search-kbd {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 6px;
  line-height: 1.4;
  flex-shrink: 0;
}

.search-results {
  display: none;
  position: absolute;
  top: 100%;
  left: 12px;
  right: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  max-height: 320px;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  z-index: 200;
}

.search-results.visible { display: block; }

.search-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: background var(--transition);
}

.search-result:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.search-result svg { flex-shrink: 0; opacity: 0.5; }

.search-result-text { display: flex; flex-direction: column; min-width: 0; }
.search-result-name { font-size: 13px; font-weight: 500; color: var(--text); }
.search-result-path { font-size: 11px; color: var(--text-tertiary); }
.search-empty { padding: 16px; text-align: center; color: var(--text-tertiary); font-size: 13px; }

/* Sidebar nav */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 16px;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.sidebar-nav::-webkit-scrollbar { width: 4px; }
.sidebar-nav::-webkit-scrollbar-track { background: transparent; }
.sidebar-nav::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

.nav-root, .nav-children {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-root { padding: 0 8px; }

.nav-children {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease;
  padding-left: 8px;
}

.nav-folder.open > .nav-children {
  max-height: 800px;
  opacity: 1;
}

/* Folder toggle */
.folder-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 500;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition);
  text-align: left;
}

.folder-toggle:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.folder-toggle .chevron {
  transition: transform 200ms ease;
  flex-shrink: 0;
  opacity: 0.5;
}

.nav-folder.open > .folder-toggle .chevron {
  transform: rotate(90deg);
}

.folder-toggle .folder-icon {
  flex-shrink: 0;
  opacity: 0.5;
}

.folder-toggle:hover .folder-icon,
.folder-toggle:hover .chevron { opacity: 0.8; }

/* Nav items */
.nav-item { margin: 1px 0; }

.nav-item a {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px 5px 12px;
  color: var(--text-tertiary);
  text-decoration: none;
  font-size: 13px;
  border-radius: var(--radius-sm);
  transition: all var(--transition);
  position: relative;
}

.nav-item a .file-icon { flex-shrink: 0; opacity: 0.35; transition: opacity var(--transition); }

.nav-item a:hover {
  color: var(--text-secondary);
  background: var(--bg-hover);
}

.nav-item a:hover .file-icon { opacity: 0.6; }

.nav-item a.active {
  color: var(--accent);
  background: var(--accent-dim);
  font-weight: 500;
}

.nav-item a.active .file-icon { opacity: 0.8; color: var(--accent); }

/* ==================== CONTENT ==================== */
.content {
  margin-left: var(--sidebar-width);
  flex: 1;
  max-width: 820px;
  padding: 48px 56px 80px;
}

article > * + * { margin-top: 20px; }

h1 {
  font-size: 2em;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.2;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-subtle);
}

h2 {
  font-size: 1.5em;
  font-weight: 650;
  letter-spacing: -0.02em;
  margin-top: 40px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-subtle);
}

h3 { font-size: 1.2em; font-weight: 600; margin-top: 32px; letter-spacing: -0.01em; }
h4, h5, h6 { font-size: 1em; font-weight: 600; margin-top: 24px; }

p { margin-top: 12px; color: var(--text-secondary); }
p strong { color: var(--text); }

a { color: var(--accent); text-decoration: none; transition: opacity var(--transition); }
a:hover { opacity: 0.8; }

code {
  background: var(--bg-elevated);
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 0.88em;
  font-family: var(--mono);
  color: var(--text);
  border: 1px solid var(--border-subtle);
}

pre {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 20px;
  overflow-x: auto;
}

pre code {
  background: none;
  padding: 0;
  font-size: 13px;
  line-height: 1.65;
  border: none;
  color: var(--text-secondary);
}

blockquote {
  border-left: 3px solid var(--accent);
  padding: 12px 20px;
  color: var(--text-secondary);
  background: var(--accent-dim);
  border-radius: 0 var(--radius) var(--radius) 0;
  font-size: 14px;
}

hr {
  border: none;
  border-top: 1px solid var(--border-subtle);
  margin: 32px 0;
}

ul, ol { padding-left: 24px; color: var(--text-secondary); }
li { margin: 6px 0; }
li strong { color: var(--text); }

img { max-width: 100%; border-radius: var(--radius); }

/* Markdown tables */
table.md-table, table.void-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.md-table th, .md-table td,
.void-table th, .void-table td {
  border-bottom: 1px solid var(--border-subtle);
  padding: 10px 14px;
  text-align: left;
}

.md-table tr:last-child td, .void-table tr:last-child td { border-bottom: none; }

.md-table th, .void-table th {
  background: var(--bg-elevated);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
}

/* ==================== VOID BLOCKS ==================== */
.void-block {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin: 20px 0;
  overflow: hidden;
  background: var(--bg-surface);
}

.void-block-label {
  background: var(--bg-elevated);
  padding: 7px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border-subtle);
}

/* Request block */
.void-request {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--bg-surface);
}

.method-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-weight: 700;
  font-size: 12px;
  font-family: var(--mono);
  letter-spacing: 0.03em;
  min-width: 56px;
  text-align: center;
}

.method-get { background: var(--green-dim); color: var(--green); border: 1px solid rgba(74,222,128,0.2); }
.method-post { background: var(--yellow-dim); color: var(--yellow); border: 1px solid rgba(250,204,21,0.2); }
.method-put { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(96,165,250,0.2); }
.method-patch { background: var(--purple-dim); color: var(--purple); border: 1px solid rgba(192,132,252,0.2); }
.method-delete { background: var(--red-dim); color: var(--red); border: 1px solid rgba(248,113,113,0.2); }
.method-options, .method-head { background: var(--bg-elevated); color: var(--text-tertiary); border: 1px solid var(--border); }

.request-url {
  font-family: var(--mono);
  font-size: 13.5px;
  color: var(--text-secondary);
  word-break: break-all;
}

/* Key-value tables */
.void-kv-table table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.void-kv-table th, .void-kv-table td {
  padding: 9px 16px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 13px;
}

.void-kv-table tr:last-child td { border-bottom: none; }

.void-kv-table th {
  background: var(--bg-elevated);
  font-weight: 600;
  color: var(--text-tertiary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.void-kv-table tr.disabled {
  opacity: 0.35;
}

.void-kv-table tr.disabled .kv-key,
.void-kv-table tr.disabled .kv-value {
  text-decoration: line-through;
}

.kv-key {
  font-family: var(--mono);
  color: var(--accent);
  white-space: nowrap;
  font-size: 13px;
}

.kv-value {
  font-family: var(--mono);
  color: var(--text-secondary);
  word-break: break-all;
  font-size: 13px;
}

/* Body blocks */
.void-body pre {
  margin: 0;
  border: none;
  border-radius: 0;
  border-top: none;
}

/* File links */
.file-link {
  color: var(--accent);
  font-family: var(--mono);
  font-size: 13px;
}

.void-file-link {
  padding: 12px 18px;
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Auth */
.void-auth table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.void-auth th, .void-auth td {
  padding: 9px 16px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 13px;
}

.void-auth tr:last-child td { border-bottom: none; }

.void-auth th {
  background: var(--bg-elevated);
  font-weight: 600;
  color: var(--text-tertiary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Linked block */
.void-linked {
  background: var(--bg-surface);
}

.void-linked-header {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.void-linked-content {
  padding: 4px;
}

.void-linked-content .void-block {
  margin: 0;
  border: none;
  background: transparent;
}

.linked-label {
  color: var(--text-tertiary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

/* Table block wrapper */
.void-table-block {
  border: none;
  background: transparent;
}

/* Unknown */
.void-unknown {
  background: var(--bg-surface);
}

/* ==================== COPY BUTTON ==================== */
.void-block-wrapper {
  position: relative;
  margin: 20px 0;
}

.void-block-wrapper .void-block {
  margin: 0;
}

.copy-block-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  padding: 5px 10px;
  font-size: 11px;
  font-family: var(--sans);
  font-weight: 500;
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition);
  z-index: 10;
  letter-spacing: 0.01em;
}

.void-block-wrapper:hover .copy-block-btn {
  opacity: 1;
}

.copy-block-btn:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
  border-color: var(--text-tertiary);
}

.copy-block-btn:active {
  transform: scale(0.96);
}

.copy-block-btn .check-icon {
  display: none;
  color: var(--green);
}

.copy-block-btn .copy-icon { display: inline; }

.copy-block-btn.copied {
  opacity: 1;
  color: var(--green);
  border-color: rgba(74, 222, 128, 0.3);
  background: var(--green-dim);
}

.copy-block-btn.copied .copy-icon { display: none; }
.copy-block-btn.copied .check-icon { display: inline; }
.copy-block-btn.copied .copy-label::after { content: 'Copied!'; }
.copy-block-btn.copied .copy-label { font-size: 0; }
.copy-block-btn.copied .copy-label::after { font-size: 11px; }

/* ==================== PAGE ACTION BAR ==================== */
.page-action-bar {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.action-bar-left {
  margin-left: auto;
}

.action-dropdown {
  position: relative;
}

.action-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  padding: 6px 12px;
  font-size: 12px;
  font-family: var(--sans);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.action-trigger:hover {
  color: var(--text-secondary);
  border-color: var(--text-tertiary);
  background: var(--bg-hover);
}

.action-chevron {
  transition: transform 200ms ease;
}

.action-dropdown.open .action-chevron {
  transform: rotate(180deg);
}

.action-menu {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 240px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 4px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  z-index: 200;
}

.action-dropdown.open .action-menu {
  display: block;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-family: var(--sans);
  font-size: 13px;
  cursor: pointer;
  transition: background var(--transition);
  text-decoration: none;
  text-align: left;
}

.action-item:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.action-item svg {
  flex-shrink: 0;
  opacity: 0.6;
}

.action-item:hover svg {
  opacity: 1;
}

.action-item-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.action-item-label {
  font-weight: 500;
  font-size: 13px;
}

.action-item-desc {
  font-size: 11px;
  color: var(--text-tertiary);
}

.action-item.flash-ok {
  color: var(--green);
  background: var(--green-dim);
}

.action-item.flash-ok .action-item-label::after {
  content: ' — Copied!';
  font-weight: 400;
}

.action-item.flash-err {
  color: var(--red);
  background: var(--red-dim);
}

/* ==================== FOOTER ==================== */
.site-footer {
  margin-left: var(--sidebar-width);
  padding: 32px 56px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 20px;
}

.footer-links a {
  color: var(--text-tertiary);
  font-size: 13px;
  text-decoration: none;
  transition: color var(--transition);
}

.footer-links a:hover {
  color: var(--text-secondary);
}

.footer-copyright {
  color: var(--text-tertiary);
  font-size: 13px;
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 860px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 250ms ease;
  }
  .sidebar.open { transform: translateX(0); }
  .content { margin-left: 0; padding: 24px 20px 60px; }
  .site-footer { margin-left: 0; padding: 24px 20px; }
}
`;
