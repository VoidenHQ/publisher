import { renderBlock, COPYABLE_TYPES } from "./blocks/_registry.js";
import type { Block, RenderContext } from "./blocks/_registry.js";
import type { ParsedNode, MdastNode, ProseMirrorNode } from "./parser.js";

function esc(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Markdown AST to HTML ---

function renderMdastInline(children: MdastNode[] | undefined): string {
  if (!children) return "";
  return children
    .map((node) => {
      switch (node.type) {
        case "text":
          return esc(node.value || "");
        case "emphasis":
          return `<em>${renderMdastInline(node.children)}</em>`;
        case "strong":
          return `<strong>${renderMdastInline(node.children)}</strong>`;
        case "delete":
          return `<del>${renderMdastInline(node.children)}</del>`;
        case "inlineCode":
          return `<code>${esc(node.value || "")}</code>`;
        case "link":
          return `<a href="${esc(node.url || "")}">${renderMdastInline(node.children)}</a>`;
        case "image":
          return `<img src="${esc(node.url || "")}" alt="${esc(node.alt || "")}" />`;
        case "break":
          return "<br />";
        default:
          return node.value ? esc(node.value) : "";
      }
    })
    .join("");
}

function renderMdastNode(node: MdastNode): string {
  switch (node.type) {
    case "heading":
      return `<h${node.depth}>${renderMdastInline(node.children)}</h${node.depth}>`;
    case "paragraph":
      return `<p>${renderMdastInline(node.children)}</p>`;
    case "blockquote":
      return `<blockquote>${(node.children || []).map(renderMdastNode).join("\n")}</blockquote>`;
    case "list": {
      const tag = node.ordered ? "ol" : "ul";
      return `<${tag}>${(node.children || []).map(renderMdastNode).join("\n")}</${tag}>`;
    }
    case "listItem":
      return `<li>${(node.children || []).map(renderMdastNode).join("\n")}</li>`;
    case "code":
      return `<pre><code class="language-${esc(node.lang || "")}">${esc(node.value || "")}</code></pre>`;
    case "thematicBreak":
      return "<hr />";
    case "table": {
      let html = '<table class="md-table"><thead><tr>';
      if (node.children?.[0]) {
        for (const cell of node.children[0].children || []) {
          html += `<th>${renderMdastInline(cell.children)}</th>`;
        }
      }
      html += "</tr></thead><tbody>";
      for (const row of node.children?.slice(1) || []) {
        html += "<tr>";
        for (const cell of row.children || []) {
          html += `<td>${renderMdastInline(cell.children)}</td>`;
        }
        html += "</tr>";
      }
      html += "</tbody></table>";
      return html;
    }
    case "html":
      return node.value || "";
    default:
      if (node.children) return node.children.map(renderMdastNode).join("\n");
      return node.value ? `<p>${esc(node.value)}</p>` : "";
  }
}

function renderMarkdownNodes(children: MdastNode[]): string {
  return children.map(renderMdastNode).join("\n");
}

// --- Main renderer ---

function renderVoidBlock(block: Block, blockIndex: Map<string, Block>): string {
  const ctx: RenderContext = { blockIndex, renderBlock };
  return renderBlock(block, ctx);
}

/**
 * Wrap a rendered void block with a copy-to-voiden button.
 */
function wrapWithCopyButton(blockHtml: string, prosemirrorJson: ProseMirrorNode | undefined, blockType: string): string {
  if (!prosemirrorJson || !COPYABLE_TYPES.has(blockType)) return blockHtml;

  const jsonStr = JSON.stringify(prosemirrorJson);
  const encoded = Buffer.from(jsonStr, "utf-8").toString("base64");

  return `<div class="void-block-wrapper">
  ${blockHtml}
  <button class="copy-block-btn" data-block="${encoded}" onclick="copyVoidBlock(this)" title="Copy to Voiden">
    <svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
    <svg class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    <span class="copy-label">Copy to Voiden</span>
  </button>
</div>`;
}

/**
 * Collect all void blocks on the page in reverse order.
 */
export function collectPageBlocks(nodes: ParsedNode[]): ProseMirrorNode[] {
  const blocks = nodes
    .filter((n): n is Extract<ParsedNode, { type: "void" }> => n.type === "void" && !!(n as any).prosemirrorJson)
    .map((n) => n.prosemirrorJson);
  return blocks.reverse();
}

/**
 * Collect only request void blocks, reversed for correct paste order.
 */
export function collectRequestBlocks(nodes: ParsedNode[]): ProseMirrorNode[] {
  const blocks = nodes
    .filter((n): n is Extract<ParsedNode, { type: "void" }> =>
      n.type === "void" && !!(n as any).prosemirrorJson && (n as any).block.type === "request"
    )
    .map((n) => n.prosemirrorJson);
  return blocks.reverse();
}

/**
 * Render parsed nodes (from parseVoidFile) into HTML body content.
 */
export function renderNodes(nodes: ParsedNode[], blockIndex: Map<string, Block>): string {
  return nodes
    .map((node) => {
      if (node.type === "markdown") {
        return renderMarkdownNodes(node.children);
      }
      if (node.type === "void") {
        const blockHtml = renderVoidBlock(node.block, blockIndex);
        return wrapWithCopyButton(blockHtml, node.prosemirrorJson, node.block.type);
      }
      return "";
    })
    .join("\n");
}
