import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const outputRoot = join(process.cwd(), "dist");

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : path.endsWith(".html") ? [path] : [];
  });
}

const forbidden = [
  { label: "OceanAl typo", pattern: /\bOceanAl\b/ },
  { label: "source filename label", pattern: /來源檔案：/ },
  { label: "technical Markdown filename", pattern: /[《『]?[^<>\n]+\.md[》』]?/ },
];

const failures = [];
const htmlFiles = filesBelow(outputRoot);

for (const path of htmlFiles) {
  const html = readFileSync(path, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(html)) failures.push(`${relative(outputRoot, path)}: ${rule.label}`);
  }
  if (path.endsWith(join("contents", "index.html"))) {
    const readerLinks = [...html.matchAll(/data-unit="([^"]+)"/g)].map((match) => match[1]);
    if (new Set(readerLinks).size !== readerLinks.length) failures.push(`${relative(outputRoot, path)}: duplicate reader links`);
  }
}

const bilingualReaders = htmlFiles.filter((path) => {
  const html = readFileSync(path, "utf8");
  return html.includes('data-language="en"') && html.includes('data-language="zh"');
});

for (const path of bilingualReaders) {
  const html = readFileSync(path, "utf8");
  for (const mode of ["en", "zh", "bilingual"]) {
    if (!html.includes(`data-mode="${mode}"`)) failures.push(`${relative(outputRoot, path)}: missing ${mode} reading control`);
  }
}

function hasJsonLdType(html, type) {
  return html.includes(`"@type":"${type}"`);
}

const requiredPages = ["legal", "privacy", "accessibility"];
for (const page of requiredPages) {
  if (!htmlFiles.some((path) => path.endsWith(join(page, "index.html")))) {
    failures.push(`Missing ${page} page`);
  }
}

const home = htmlFiles.find((path) => path === join(outputRoot, "index.html"));
if (!home) {
  failures.push("Missing homepage");
} else {
  const html = readFileSync(home, "utf8");
  for (const type of ["Person", "Book", "WebPage"]) {
    if (!hasJsonLdType(html, type)) failures.push(`homepage: missing ${type} JSON-LD`);
  }
  if (!html.includes("CLASSIFICATION")) failures.push("homepage: missing dossier classification block");
  if (!html.includes("THIS FILE IS NOT A LEAK")) failures.push("homepage: missing publication manifesto");
}

for (const path of htmlFiles.filter((path) => path.includes(`${join("read", "")}`))) {
  const html = readFileSync(path, "utf8");
  for (const type of ["Person", "Book", "WebPage"]) {
    if (!hasJsonLdType(html, type)) failures.push(`${relative(outputRoot, path)}: missing ${type} JSON-LD`);
  }
  if (!hasJsonLdType(html, "BreadcrumbList")) failures.push(`${relative(outputRoot, path)}: missing BreadcrumbList JSON-LD`);
}

if (!htmlFiles.some((path) => readFileSync(path, "utf8").includes('property="og:image"'))) failures.push("Missing social preview metadata");

if (bilingualReaders.length === 0) failures.push("No bilingual reader output was generated");

if (!existsSync(join(outputRoot, "cover-wisdom-sea.svg"))) failures.push("Missing source-document cover");

if (failures.length) {
  console.error(`Publication validation failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log(`Publication validation passed (${htmlFiles.length} pages, ${bilingualReaders.length} bilingual readers).`);
