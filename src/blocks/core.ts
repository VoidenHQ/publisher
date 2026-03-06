/**
 * Block renderers for core Voiden block types (not plugin-specific).
 *
 * Handles: table, fileLink, linkedBlock
 */
import { esc, renderCellNode, extractCellContent } from "./_helpers.js";
import type { Block, BlockPlugin, RenderContext } from "./_registry.js";

function renderVoidTable(block: Block): string {
  if (block.content && Array.isArray(block.content)) {
    let html = '<table class="void-table"><tbody>';
    for (const row of block.content) {
      if (row.type !== "tableRow") continue;
      html += "<tr>";
      for (const cell of row.content || []) {
        const tag = cell.type === "tableHeader" ? "th" : "td";
        const cellText = extractCellContent(cell);
        html += `<${tag}>${cellText}</${tag}>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table>";
    return `<div class="void-block void-table-block">${html}</div>`;
  }

  if (block.rows) {
    let html = '<table class="void-table"><tbody>';
    for (const row of block.rows) {
      html += "<tr>";
      for (const cell of row.cells || []) {
        html += `<td>${renderCellNode(cell)}</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table>";
    return `<div class="void-block void-table-block">${html}</div>`;
  }

  return "";
}

function renderFileLinkBlock(block: Block): string {
  const filename = (block.attrs?.filename as string) || (block.attrs?.filePath as string) || "";
  const href = ((block.attrs?.filePath as string) || "").replace(/\.void$/, "");
  return `<div class="void-block void-file-link">
  <a href="${esc(href)}" class="file-link">${esc(filename)}</a>
</div>`;
}

function renderLinkedBlock(block: Block, ctx: RenderContext): string {
  const originalFile = (block.attrs?.originalFile as string) || (block.attrs?.filePath as string) || "";
  const blockUid = (block.attrs?.blockUid as string) || "";
  const href = originalFile.replace(/\.void$/, "");

  const resolvedBlock = ctx.blockIndex?.get(blockUid);
  let resolvedHtml = "";
  if (resolvedBlock) {
    resolvedHtml = ctx.renderBlock(resolvedBlock, ctx);
  }

  return `<div class="void-block void-linked">
  <div class="void-linked-header">
    <span class="linked-label">Imported from</span>
    <a href="${esc(href)}" class="file-link">${esc(originalFile)}</a>
  </div>
  ${resolvedHtml ? `<div class="void-linked-content">${resolvedHtml}</div>` : ""}
</div>`;
}

export default {
  types: ["table", "fileLink", "linkedBlock"],
  copyable: ["linkedBlock"],
  render(block, ctx) {
    switch (block.type) {
      case "table":
        return renderVoidTable(block);
      case "fileLink":
        return renderFileLinkBlock(block);
      case "linkedBlock":
        return renderLinkedBlock(block, ctx);
      default:
        return "";
    }
  },
} satisfies BlockPlugin;
