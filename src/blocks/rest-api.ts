/**
 * Block renderers for the voiden-rest-api plugin.
 *
 * Handles: request, headers-table, query-table, path-table,
 *          url-table, multipart-table, json_body, xml_body, yml_body
 */
import { esc, extractText, renderMethodBadge, renderKeyValueTable, renderBodyBlock } from "./_helpers.js";
import type { Block, BlockPlugin } from "./_registry.js";

const TABLE_LABELS: Record<string, string> = {
  "headers-table": "Headers",
  "query-table": "Query Parameters",
  "path-table": "Path Parameters",
  "url-table": "URL Encoded Body",
  "multipart-table": "Multipart Form Data",
};

function renderRequestBlock(block: Block): string {
  let method = "GET";
  let url = "";
  for (const child of block.content || []) {
    if (child.type === "method") {
      method = extractText(child.content);
    } else if (child.type === "url") {
      url = extractText(child.content);
    }
  }
  return `<div class="void-block void-request">
  ${renderMethodBadge(method)}
  <span class="request-url">${esc(url)}</span>
</div>`;
}

export default {
  types: [
    "request",
    "headers-table", "query-table", "path-table", "url-table", "multipart-table",
    "json_body", "jsonBody", "xml_body", "xmlBody", "yml_body", "ymlBody",
  ],
  copyable: [
    "request",
    "headers-table", "query-table", "path-table", "url-table", "multipart-table",
    "json_body", "jsonBody", "xml_body", "xmlBody", "yml_body", "ymlBody",
  ],
  render(block) {
    switch (block.type) {
      case "request":
        return renderRequestBlock(block);
      case "headers-table":
      case "query-table":
      case "path-table":
      case "url-table":
      case "multipart-table":
        return renderKeyValueTable(block, TABLE_LABELS[block.type]);
      case "json_body":
      case "jsonBody":
        return renderBodyBlock(block, "json");
      case "xml_body":
      case "xmlBody":
        return renderBodyBlock(block, "xml");
      case "yml_body":
      case "ymlBody":
        return renderBodyBlock(block, "yaml");
      default:
        return "";
    }
  },
} satisfies BlockPlugin;
