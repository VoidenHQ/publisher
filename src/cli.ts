#!/usr/bin/env node

import { resolve } from "path";
import { buildSite } from "./build.js";
import { serve } from "./serve.js";

const args = process.argv.slice(2);
const command = args[0];

const inputDir = resolve(args.find((a) => !a.startsWith("-") && a !== command) || ".");
const outFlag = args.indexOf("--out");
const outputDir = outFlag !== -1 ? resolve(args[outFlag + 1]) : resolve(inputDir, "void-docs");
const port = parseInt(args.find((_, i) => args[i - 1] === "--port") || "4040", 10);
const repoUrl = args.find((_, i) => args[i - 1] === "--repo-url") || "";

if (command === "build") {
  await buildSite(inputDir, outputDir, { repoUrl });
  console.log(`Built to ${outputDir}`);
} else if (command === "serve") {
  await serve(inputDir, outputDir, port, { repoUrl });
} else {
  console.log(`Usage:
  voiden-docs build [dir] [--out <dir>] [--repo-url <url>]
  voiden-docs serve [dir] [--port <port>] [--repo-url <url>]`);
}
