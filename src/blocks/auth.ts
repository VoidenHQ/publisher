/**
 * Block renderer for the voiden-advanced-auth plugin.
 *
 * Handles: auth
 */
import { esc } from "./_helpers.js";
import type { Block, BlockPlugin } from "./_registry.js";

function renderAuthBlock(block: Block): string {
  const authType = (block.attrs?.authType as string) || "unknown";
  let html = `<div class="void-block void-auth">
  <div class="void-block-label">Auth: ${esc(authType)}</div>`;

  const tableChild = (block.content || []).find((c) => c.type === "table") as Block | undefined;
  if (tableChild && tableChild.rows) {
    html += `<table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>`;
    for (const row of tableChild.rows) {
      const cells = row.cells || [];
      const key = cells[0]?.value || cells[0]?.text || "";
      const val = cells[1]?.value || cells[1]?.text || "";
      html += `<tr><td class="kv-key">${esc(key)}</td><td class="kv-value">${esc(val)}</td></tr>`;
    }
    html += `</tbody></table>`;
  }
  html += `</div>`;
  return html;
}

export default {
  types: ["auth"],
  copyable: ["auth"],
  render(block) {
    return renderAuthBlock(block);
  },
} satisfies BlockPlugin;
