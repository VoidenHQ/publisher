/**
 * Block renderer registry.
 *
 * Auto-discovers all block plugin files in this directory and builds
 * a type → renderer lookup. To add support for a new Voiden plugin,
 * create a new file here (e.g. `graphql.ts`) that exports:
 *
 *   export default {
 *     types: ["gqlquery", "gqlvariables"],
 *     copyable: ["gqlquery", "gqlvariables"],
 *     render(block, ctx) { return "<html>"; }
 *   } satisfies BlockPlugin;
 *
 * The `ctx` object passed to render() contains:
 *   - blockIndex: Map<uid, block> for resolving linked blocks
 *   - renderBlock(block, ctx): render any block type (for nesting)
 *
 * That's it — no other files need to change.
 */

import { esc } from "./_helpers.js";

// Import all block plugins
import restApi from "./rest-api.js";
import auth from "./auth.js";
import core from "./core.js";

export interface Block {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Block[];
  rows?: TableRow[];
}

export interface TableRow {
  attrs?: Record<string, unknown>;
  cells: CellNode[];
}

export interface CellNode {
  type?: string;
  value?: string;
  text?: string;
  content?: CellNode[] | string;
  children?: CellNode[];
  attrs?: Record<string, unknown>;
}

export interface RenderContext {
  blockIndex?: Map<string, Block>;
  renderBlock: (block: Block, ctx: RenderContext) => string;
}

export interface BlockPlugin {
  types: string[];
  copyable?: string[];
  render: (block: Block, ctx: RenderContext) => string;
}

const plugins: BlockPlugin[] = [restApi, auth, core];

// Build lookup maps
const renderers = new Map<string, BlockPlugin>();
const COPYABLE_TYPES = new Set<string>();

for (const plugin of plugins) {
  for (const type of plugin.types) {
    renderers.set(type, plugin);
  }
  for (const type of plugin.copyable || []) {
    COPYABLE_TYPES.add(type);
  }
}

/**
 * Render a void block to HTML.
 */
export function renderBlock(block: Block, ctx: RenderContext): string {
  const plugin = renderers.get(block.type);
  if (plugin) {
    return plugin.render(block, ctx);
  }
  // Fallback for unrecognized types
  return `<div class="void-block void-unknown">
  <div class="void-block-label">${esc(block.type)}</div>
</div>`;
}

export { COPYABLE_TYPES };
