import { readdir, readFile, mkdir, writeFile, stat } from "fs/promises";
import { join, relative, dirname, basename, extname } from "path";
import { deflateRawSync } from "zlib";
import { parseVoidFile } from "./parser.js";
import type { ParsedNode } from "./parser.js";
import { renderNodes, collectPageBlocks, collectRequestBlocks } from "./renderer.js";
import { htmlPage, renderSidebar } from "./template.js";
import type { Block } from "./blocks/_registry.js";
import type { PublishConfig } from "./config.js";

const IGNORED = new Set([".git", ".voiden", "node_modules", "voiden-publish", ".env", ".env.local"]);

interface FileEntry {
  fullPath: string;
  relPath: string;
}

interface FileTreeEntry {
  name: string;
  href?: string;
  children?: FileTreeEntry[];
}

interface BuildOptions {
  repoUrl?: string;
  config?: PublishConfig;
}

async function collectFiles(dir: string, baseDir: string): Promise<FileEntry[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: FileEntry[] = [];

  for (const entry of entries) {
    if (IGNORED.has(entry.name) || entry.name.startsWith(".")) continue;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await collectFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.name.endsWith(".void") || entry.name.endsWith(".md")) {
      const relPath = relative(baseDir, fullPath);
      files.push({ fullPath, relPath });
    }
  }

  return files;
}

function buildFileTree(files: FileEntry[]): FileTreeEntry[] {
  const tree: FileTreeEntry[] = [];
  const folders: Record<string, FileTreeEntry> = {};

  for (const file of files) {
    const parts = file.relPath.split("/");
    const href = file.relPath.replace(/\.(void|md)$/, "");
    const name = basename(file.relPath, extname(file.relPath));

    if (parts.length === 1) {
      tree.push({ name, href });
    } else {
      const folderName = parts[0];
      if (!folders[folderName]) {
        folders[folderName] = { name: folderName, children: [] };
        tree.push(folders[folderName]);
      }
      folders[folderName].children!.push({ name, href });
    }
  }

  // Sort: folders first, then files alphabetically. Put "start" and "hello" first.
  const priority = (name: string): number => {
    const n = name.toLowerCase();
    if (n === "start") return 0;
    if (n === "hello") return 1;
    return 10;
  };

  tree.sort((a, b) => {
    if (a.children && !b.children) return -1;
    if (!a.children && b.children) return 1;
    const pa = priority(a.name);
    const pb = priority(b.name);
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });

  return tree;
}

// --- Git remote URL detection ---
async function detectRepoUrl(inputDir: string): Promise<string> {
  try {
    const gitConfig = await readFile(join(inputDir, ".git", "config"), "utf-8");
    const match = gitConfig.match(/\[remote "origin"\][^\[]*url\s*=\s*(.+)/m);
    return match ? match[1].trim() : "";
  } catch {
    return "";
  }
}

// --- Minimal ZIP builder (no external deps) ---
interface ZipEntry {
  path: string;
  data: Buffer;
}

function buildZip(files: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(file.path, "utf-8");
    const compressed = deflateRawSync(file.data);
    const crc = crc32(file.data);

    // Local file header
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // compression: deflate
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0, 12); // mod date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28); // extra field length
    nameBytes.copy(local, 30);

    // Central directory header
    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(8, 10); // compression
    central.writeUInt16LE(0, 12); // mod time
    central.writeUInt16LE(0, 14); // mod date
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30); // extra field length
    central.writeUInt16LE(0, 32); // file comment length
    central.writeUInt16LE(0, 34); // disk number start
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42); // local header offset
    nameBytes.copy(central, 46);

    localHeaders.push(Buffer.concat([local, compressed]));
    centralHeaders.push(central);
    offset += local.length + compressed.length;
  }

  const centralDirOffset = offset;
  const centralDirBuf = Buffer.concat(centralHeaders);

  // End of central directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with central dir
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localHeaders, centralDirBuf, eocd]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export async function buildSite(inputDir: string, outputDir: string, opts: BuildOptions = {}): Promise<{ fileCount: number; outputDir: string }> {
  const files = await collectFiles(inputDir, inputDir);

  // Detect repo URL
  const repoUrl = opts.repoUrl || (await detectRepoUrl(inputDir));

  // Filter out empty files
  const validFiles: FileEntry[] = [];
  for (const file of files) {
    const s = await stat(file.fullPath);
    if (s.size > 0) validFiles.push(file);
  }

  const fileTree = buildFileTree(validFiles);

  // First pass: parse all files and build a UID-to-block index
  const parsedFiles: { file: FileEntry; source: string; nodes: ParsedNode[] }[] = [];
  const blockIndex = new Map<string, Block>(); // uid -> block

  for (const file of validFiles) {
    const source = await readFile(file.fullPath, "utf-8");
    const nodes = parseVoidFile(source);
    parsedFiles.push({ file, source, nodes });

    // Index all void blocks by their uid
    for (const node of nodes) {
      if (node.type === "void" && node.block?.attrs?.uid) {
        blockIndex.set(node.block.attrs.uid as string, node.block);
      }
    }
  }

  await mkdir(outputDir, { recursive: true });

  // Build searchable file list for the client
  const allFiles = validFiles.map((f) => {
    const parts = f.relPath.split("/");
    return {
      name: basename(f.relPath, extname(f.relPath)),
      href: f.relPath.replace(/\.(void|md)$/, ""),
      folder: parts.length > 1 ? parts.slice(0, -1).join("/") : null,
    };
  });
  const allFilesJson = JSON.stringify(allFiles);

  // Second pass: render with the block index available for linkedBlock resolution
  for (const { file, source, nodes } of parsedFiles) {
    const bodyHtml = renderNodes(nodes, blockIndex);
    const pageBlocks = collectPageBlocks(nodes);
    const requestBlocks = collectRequestBlocks(nodes);
    const title = extractTitle(source, file.relPath);
    const outputPath = join(outputDir, file.relPath.replace(/\.(void|md)$/, ".html"));
    const currentHref = file.relPath.replace(/\.(void|md)$/, "");
    const sidebar = renderSidebar(fileTree, currentHref);

    const page = htmlPage(title, bodyHtml, {
      sidebar,
      allFiles: allFilesJson,
      pageBlocks,
      requestBlocks,
      repoUrl,
      config: opts.config,
    });

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, page, "utf-8");
  }

  // Generate project.zip with all .void files
  const voidFiles = validFiles.filter((f) => f.relPath.endsWith(".void"));
  if (voidFiles.length > 0) {
    const zipEntries: ZipEntry[] = [];
    for (const f of voidFiles) {
      const data = await readFile(f.fullPath);
      zipEntries.push({ path: f.relPath, data: Buffer.from(data) });
    }
    const zipBuf = buildZip(zipEntries);
    await writeFile(join(outputDir, "project.zip"), zipBuf);
  }

  // Write index.html redirecting to first file
  if (validFiles.length > 0) {
    const firstHref = validFiles[0].relPath.replace(/\.(void|md)$/, "");
    const indexPath = join(outputDir, "index.html");
    const indexHtml = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${firstHref}" /></head><body></body></html>`;
    await writeFile(indexPath, indexHtml, "utf-8");
  }

  return { fileCount: validFiles.length, outputDir };
}

function extractTitle(source: string, relPath: string): string {
  const match = source.match(/^#+\s+(.+)$/m);
  if (match) return match[1].replace(/[*_`]/g, "");
  return basename(relPath, extname(relPath));
}
