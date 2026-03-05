import YAML from "yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Block, CellNode } from "./blocks/_registry.js";

// --- Parsed node types ---

export interface VoidNode {
  type: "void";
  block: Block;
  prosemirrorJson: ProseMirrorNode;
}

export interface MarkdownNode {
  type: "markdown";
  children: MdastNode[];
}

export type ParsedNode = VoidNode | MarkdownNode;

export interface MdastNode {
  type: string;
  children?: MdastNode[];
  value?: string;
  depth?: number;
  ordered?: boolean;
  lang?: string;
  url?: string;
  alt?: string;
  [key: string]: unknown;
}

export interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorNode[] | string;
  text?: string;
  [key: string]: unknown;
}

interface SimplifiedTableRow {
  attrs?: Record<string, unknown>;
  row: unknown[];
}

interface SimplifiedNode {
  type: string;
  rows?: SimplifiedTableRow[];
  content?: unknown;
  attrs?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Strip the YAML frontmatter (version, generatedBy, etc.) from a .void file.
 */
function stripFrontmatter(markdown: string): string {
  if (markdown.startsWith("---")) {
    const parts = markdown.split("---");
    if (parts.length >= 3) {
      return parts.slice(2).join("---").trimStart();
    }
  }
  return markdown;
}

/**
 * Inflate a simplified table (with `rows` array) back into a renderer-friendly structure.
 */
function inflateTableNode(simplified: SimplifiedNode): Block {
  const rows: Block["rows"] = [];
  if (!simplified.rows || !Array.isArray(simplified.rows)) return { type: "table", rows: [] };

  for (const rowObj of simplified.rows) {
    const cells: CellNode[] = [];
    for (const cellValue of rowObj.row || []) {
      if (typeof cellValue === "string") {
        cells.push({ type: "text", value: cellValue });
      } else if (Array.isArray(cellValue)) {
        cells.push({
          type: "mixed",
          children: cellValue.map((item: unknown) =>
            typeof item === "string"
              ? { type: "text", value: item }
              : item as CellNode
          ),
        });
      } else if (cellValue && typeof cellValue === "object") {
        cells.push(cellValue as CellNode);
      } else {
        cells.push({ type: "text", value: "" });
      }
    }
    rows.push({ attrs: rowObj.attrs || {}, cells });
  }

  return { type: "table", rows };
}

/**
 * Inflate collapsed text content back to structured form (for rendering).
 */
function inflateContent(node: SimplifiedNode): Block {
  if (!node || typeof node !== "object") return node as unknown as Block;

  if (node.type === "table" && node.rows) {
    return inflateTableNode(node);
  }

  if (typeof node.content === "string") {
    (node as Record<string, unknown>).content = [{ type: "text", text: node.content }];
  } else if (Array.isArray(node.content)) {
    (node as Record<string, unknown>).content = node.content.map((child: unknown) =>
      inflateContent(child as SimplifiedNode)
    );
  }

  return node as unknown as Block;
}

/**
 * Inflate a simplified table to full ProseMirror JSON (tableRow > tableCell > paragraph > text).
 */
function inflateTableToProseMirror(simplified: SimplifiedNode): ProseMirrorNode {
  const tableNode: ProseMirrorNode = { type: "table", content: [] };
  if (!simplified.rows || !Array.isArray(simplified.rows)) return tableNode;

  for (const rowObj of simplified.rows) {
    const tableRow: ProseMirrorNode = { type: "tableRow", attrs: rowObj.attrs || {}, content: [] };

    for (const cellValue of rowObj.row || []) {
      const paragraph: ProseMirrorNode = { type: "paragraph", content: [] };
      const paragraphContent = paragraph.content as ProseMirrorNode[];

      if (cellValue === null || cellValue === undefined) {
        // empty
      } else if (typeof cellValue === "string") {
        paragraphContent.push({ type: "text", text: cellValue });
      } else if (Array.isArray(cellValue)) {
        for (const item of cellValue) {
          if (typeof item === "string") {
            paragraphContent.push({ type: "text", text: item });
          } else if (typeof item === "object") {
            paragraphContent.push(item as ProseMirrorNode);
          }
        }
      } else if (typeof cellValue === "object") {
        paragraphContent.push(cellValue as ProseMirrorNode);
      }

      (tableRow.content as ProseMirrorNode[]).push({
        type: "tableCell",
        attrs: { colspan: 1, rowspan: 1, colwidth: null },
        content: [paragraph],
      });
    }
    (tableNode.content as ProseMirrorNode[]).push(tableRow);
  }
  return tableNode;
}

/**
 * Inflate a simplified node to full ProseMirror JSON (for clipboard).
 */
function inflateToProseMirror(node: unknown): ProseMirrorNode {
  if (!node || typeof node !== "object") return node as unknown as ProseMirrorNode;

  // Deep clone to avoid mutating the original
  const cloned = JSON.parse(JSON.stringify(node)) as SimplifiedNode;

  if (cloned.type === "table" && cloned.rows) {
    return inflateTableToProseMirror(cloned);
  }

  if (typeof cloned.content === "string") {
    (cloned as Record<string, unknown>).content = [{ type: "text", text: cloned.content }];
  } else if (Array.isArray(cloned.content)) {
    (cloned as Record<string, unknown>).content = cloned.content.map((child: unknown) =>
      inflateToProseMirror(child)
    );
  }

  return cloned as unknown as ProseMirrorNode;
}

/**
 * Parse a void block's YAML body into a structured node.
 * Returns { block, prosemirrorJson } where block is renderer-friendly
 * and prosemirrorJson is the full ProseMirror node for clipboard.
 */
function parseVoidBlock(yamlText: string): { block: Block; prosemirrorJson: ProseMirrorNode } | null {
  const lines = yamlText.split("\n");
  if (lines[0].trim() !== "---") return null;

  const headerEnd = lines.indexOf("---", 1);
  if (headerEnd === -1) return null;

  const headerYaml = lines.slice(1, headerEnd).join("\n");
  const nodeJson = YAML.parse(headerYaml) as SimplifiedNode;

  // Full ProseMirror JSON for clipboard (before renderer-specific inflation)
  const prosemirrorJson = inflateToProseMirror(nodeJson);

  // Renderer-friendly inflation
  const block = inflateContent(nodeJson);

  return { block, prosemirrorJson };
}

/**
 * Extract text from a ProseMirror-style content array.
 */
export function extractText(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((c: Record<string, unknown>) => {
      if (c.type === "text" && c.text) return c.text as string;
      if (c.type === "text" && c.value) return c.value as string;
      if (c.value) return c.value as string;
      if (c.text) return c.text as string;
      return extractText(c.content);
    }).join("");
  }
  return "";
}

/**
 * Parse a .void or .md file into a list of renderable nodes.
 * Each node is either:
 *   - { type: "markdown", children: [...mdast nodes] } — regular markdown
 *   - { type: "void", block: {...}, prosemirrorJson: {...} } — a parsed void block
 */
export function parseVoidFile(source: string): ParsedNode[] {
  const stripped = stripFrontmatter(source);
  const mdast = unified().use(remarkParse).use(remarkGfm).parse(stripped);

  const nodes: ParsedNode[] = [];

  for (const child of (mdast as unknown as { children: MdastNode[] }).children) {
    if (child.type === "code" && child.lang === "void") {
      const result = parseVoidBlock(child.value || "");
      if (result) {
        nodes.push({ type: "void", block: result.block, prosemirrorJson: result.prosemirrorJson });
      }
    } else {
      // Accumulate consecutive markdown nodes
      const last = nodes[nodes.length - 1];
      if (last && last.type === "markdown") {
        last.children.push(child);
      } else {
        nodes.push({ type: "markdown", children: [child] });
      }
    }
  }

  return nodes;
}

export { inflateTableNode, parseVoidBlock };
