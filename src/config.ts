import { readFile } from "fs/promises";
import { join, extname } from "path";
import { parse as parseYaml } from "yaml";

export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterConfig {
  links: FooterLink[];
  copyright: string;
}

export interface PublishConfig {
  title: string;
  logo: string;
  favicon: string;
  accentColor: string;
  footer: FooterConfig;
  headTags: string;
  customCSS: string;
}

const DEFAULTS: PublishConfig = {
  title: "Voiden Docs",
  logo: "",
  favicon: "",
  accentColor: "",
  footer: { links: [], copyright: "" },
  headTags: "",
  customCSS: "",
};

export async function loadConfig(inputDir: string): Promise<PublishConfig> {
  let raw: Record<string, unknown> = {};
  try {
    const content = await readFile(join(inputDir, "voiden.publish.yaml"), "utf-8");
    raw = (parseYaml(content) as Record<string, unknown>) || {};
  } catch {
    // No config file — use defaults
    return { ...DEFAULTS };
  }

  const config: PublishConfig = {
    title: typeof raw.title === "string" ? raw.title : DEFAULTS.title,
    logo: "",
    favicon: "",
    accentColor: typeof raw.accentColor === "string" ? raw.accentColor : DEFAULTS.accentColor,
    footer: DEFAULTS.footer,
    headTags: typeof raw.headTags === "string" ? raw.headTags : DEFAULTS.headTags,
    customCSS: "",
  };

  // Resolve logo
  if (typeof raw.logo === "string" && raw.logo) {
    config.logo = await resolveAsset(inputDir, raw.logo, "svg");
  }

  // Resolve favicon
  if (typeof raw.favicon === "string" && raw.favicon) {
    config.favicon = await resolveAsset(inputDir, raw.favicon, "datauri");
  }

  // Resolve custom CSS
  if (typeof raw.customCSS === "string" && raw.customCSS) {
    try {
      config.customCSS = await readFile(join(inputDir, raw.customCSS), "utf-8");
    } catch {
      // Ignore missing CSS file
    }
  }

  // Footer
  if (raw.footer && typeof raw.footer === "object") {
    const f = raw.footer as Record<string, unknown>;
    const links: FooterLink[] = [];
    if (Array.isArray(f.links)) {
      for (const link of f.links) {
        if (link && typeof link === "object" && typeof (link as Record<string, unknown>).label === "string" && typeof (link as Record<string, unknown>).url === "string") {
          links.push({ label: (link as Record<string, string>).label, url: (link as Record<string, string>).url });
        }
      }
    }
    config.footer = {
      links,
      copyright: typeof f.copyright === "string" ? f.copyright : "",
    };
  }

  return config;
}

async function resolveAsset(inputDir: string, value: string, mode: "svg" | "datauri"): Promise<string> {
  // If it looks like inline SVG, return as-is
  if (value.trimStart().startsWith("<")) {
    return value;
  }

  // If it looks like a URL, return as-is
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  // File path — resolve relative to inputDir
  const filePath = join(inputDir, value);
  try {
    const ext = extname(filePath).toLowerCase();
    if (mode === "svg" && ext === ".svg") {
      return await readFile(filePath, "utf-8");
    }
    // Base64 data URI
    const buf = await readFile(filePath);
    const mime = ext === ".svg" ? "image/svg+xml"
      : ext === ".png" ? "image/png"
      : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
      : ext === ".ico" ? "image/x-icon"
      : "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return value; // Return original path if file not found
  }
}
