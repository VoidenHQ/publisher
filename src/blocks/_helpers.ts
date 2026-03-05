import { extractText } from "../parser.js";
import type { Block, CellNode } from "./_registry.js";

export { extractText };

export function esc(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escAttr(str: string): string {
  return esc(str).replace(/'/g, "&#39;");
}

// --- Shared rendering primitives ---

/**
 * Render a method badge (GET, POST, etc.)
 */
export function renderMethodBadge(method: string): string {
  const m = (method || "GET").toUpperCase();
  return `<span class="method-badge method-${m.toLowerCase()}">${esc(m)}</span>`;
}

/**
 * Render a key-value table from a block that contains a `table` child with `rows`.
 */
export function renderKeyValueTable(block: Block, label?: string): string {
  let html = `<div class="void-block void-kv-table">`;
  if (label) html += `<div class="void-block-label">${esc(label)}</div>`;
  html += `<table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>`;

  const tableChild = (block.content || []).find((c) => c.type === "table") as Block | undefined;
  if (tableChild && tableChild.rows) {
    for (const row of tableChild.rows) {
      const disabled = row.attrs?.disabled;
      const cells = row.cells || [];
      const key = cells[0]?.value || cells[0]?.text || extractText(cells[0]) || "";
      const val = cells[1]?.value || cells[1]?.text || extractText(cells[1]) || "";
      html += `<tr${disabled ? ' class="disabled"' : ""}>`;
      html += `<td class="kv-key">${esc(key)}</td>`;
      html += `<td class="kv-value">${esc(val)}</td>`;
      html += `</tr>`;
    }
  }

  html += `</tbody></table></div>`;
  return html;
}

/**
 * Render a body block (JSON, XML, YAML, etc.)
 */
export function renderBodyBlock(block: Block, language: string): string {
  const body = (block.attrs?.body as string) || "";
  return `<div class="void-block void-body">
  <div class="void-block-label">${esc(language)} Body</div>
  <pre><code class="language-${esc(language)}">${esc(body)}</code></pre>
</div>`;
}

/**
 * Render a cell node (text, fileLink, or mixed).
 */
export function renderCellNode(cell: CellNode): string {
  if (!cell) return "";
  if (cell.type === "text") return esc(cell.value || cell.text || "");
  if (cell.type === "fileLink") {
    const filename = (cell.attrs?.filename as string) || (cell.attrs?.filePath as string) || "";
    const href = ((cell.attrs?.filePath as string) || "").replace(/\.void$/, ".html");
    return `<a href="${esc(href)}" class="file-link">${esc(filename)}</a>`;
  }
  if (cell.type === "mixed" && cell.children) {
    return cell.children.map(renderCellNode).join("");
  }
  return esc(extractText(cell));
}

/**
 * Extract content from a ProseMirror tableCell node.
 */
export function extractCellContent(cell: CellNode): string {
  if (!cell.content) return "";
  const content = cell.content;
  if (typeof content === "string") return esc(content);
  return (Array.isArray(content) ? content : [content])
    .map((para) => {
      if (!para.content) return "";
      if (typeof para.content === "string") return esc(para.content);
      return (Array.isArray(para.content) ? para.content : [para.content])
        .map((node) => {
          if (node.type === "text") return esc(node.text || node.value || "");
          if (node.type === "fileLink") {
            const filename = (node.attrs?.filename as string) || (node.attrs?.filePath as string) || "";
            const href = ((node.attrs?.filePath as string) || "").replace(/\.void$/, ".html");
            return `<a href="${esc(href)}" class="file-link">${esc(filename)}</a>`;
          }
          return esc(extractText(node.content));
        })
        .join("");
    })
    .join("");
}
