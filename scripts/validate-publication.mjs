import { readFileSync, readdirSync } from "node:fs";
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

if (bilingualReaders.length === 0) failures.push("No bilingual reader output was generated");

if (failures.length) {
  console.error(`Publication validation failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log(`Publication validation passed (${htmlFiles.length} pages, ${bilingualReaders.length} bilingual readers).`);
