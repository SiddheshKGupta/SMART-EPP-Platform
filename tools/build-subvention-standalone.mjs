import { build } from "esbuild";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cssDir = join(root, "apps", "web", ".next", "static", "css");
const cssFile = readdirSync(cssDir).find((name) => name.endsWith(".css"));
if (!cssFile) throw new Error("Run the web production build before generating the standalone artifact.");

const result = await build({
  entryPoints: [join(root, "tools", "standalone", "entry.tsx")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  platform: "browser",
  target: ["chrome110", "edge110"],
  jsx: "automatic",
  alias: {
    "next/link": join(root, "tools", "standalone", "next-link.tsx"),
    "next/navigation": join(root, "tools", "standalone", "next-navigation.ts"),
    "@": join(root, "apps", "web"),
  },
  define: { "process.env.NODE_ENV": '"production"' },
});

const js = result.outputFiles[0]?.text;
if (!js) throw new Error("The standalone JavaScript bundle was not produced.");
const css = readFileSync(join(cssDir, cssFile), "utf8");
const utilityCss = `.standalone-state-tools{display:flex;align-items:center;justify-content:flex-end;gap:.25rem;margin:0 0 .75rem;padding:.35rem .5rem;border:1px solid #e2e8f0;background:#fff;color:#475569;font-size:.75rem}.standalone-state-tools>span{margin-right:auto;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.standalone-state-tools svg{width:14px;height:14px}@media(max-width:700px){.standalone-state-tools>span{display:none}}`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="author" content="V L & CO"><meta name="generator" content="Smart EPP Standalone Builder"><title>Smart EPP · Subvention Control Centre</title><style>${css}${utilityCss}</style></head><body><div id="root"></div><script>${js.replaceAll("</script>", "<\\/script>")}</script></body></html>`;
writeFileSync(join(root, "Smart_EPP_Subvention_Standalone.html"), html, "utf8");
console.log(`Generated Smart_EPP_Subvention_Standalone.html (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
