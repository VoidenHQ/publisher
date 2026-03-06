import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { buildSite } from "./build.js";
import { loadConfig, type PublishConfig } from "./config.js";

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
};

export interface ServeOptions {
  repoUrl?: string;
  config?: PublishConfig;
}

export async function serve(inputDir: string, outputDir: string, port: number, opts: ServeOptions = {}): Promise<void> {
  // Initial build
  console.log(`Building from ${inputDir}...`);
  const result = await buildSite(inputDir, outputDir, opts);
  console.log(`Built ${result.fileCount} pages`);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    if (!extname(urlPath)) urlPath += ".html";

    const filePath = join(outputDir, urlPath);
    try {
      const content = await readFile(filePath);
      const ext = extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "text/html" });
      res.end(content);
    } catch {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("<h1>404 Not Found</h1>");
    }
  });

  server.listen(port, () => {
    console.log(`\n  Voiden Docs running at http://localhost:${port}\n`);
  });

  // Watch for changes and rebuild
  try {
    const { watch } = await import("chokidar");
    const watcher = watch(inputDir, {
      ignored: /(^|[\/\\])(\.|node_modules|void-docs)/,
      persistent: true,
      ignoreInitial: true,
    });

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const rebuild = (): void => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(async () => {
        console.log("Rebuilding...");
        const freshConfig = await loadConfig(inputDir);
        const r = await buildSite(inputDir, outputDir, { ...opts, config: freshConfig });
        console.log(`Rebuilt ${r.fileCount} pages`);
      }, 300);
    };

    watcher.on("change", rebuild).on("add", rebuild).on("unlink", rebuild);
  } catch {
    // chokidar not available — no live reload
  }
}
