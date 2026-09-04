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
  for (const heading of html.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/g)) {
    const text = heading[1].replace(/<[^>]+>/g, "");
    if (/(?:\*\*|__|`|\p{Extended_Pictographic})/u.test(text)) {
      failures.push(`${relative(outputRoot, path)}: heading decoration leaked into public text`);
      break;
    }
  }
  if (path.endsWith(join("contents", "index.html"))) {
    const readerLinks = [...html.matchAll(/href="[^"]+\/read\/([^/]+)\/"/g)].map((match) => match[1]);
    if (new Set(readerLinks).size !== readerLinks.length) failures.push(`${relative(outputRoot, path)}: duplicate reader links`);
  }
}

const bilingualPages = htmlFiles.filter((path) => {
  const html = readFileSync(path, "utf8");
  return html.includes('data-language="en"') && html.includes('data-language="zh"');
});

for (const path of bilingualPages) {
  const html = readFileSync(path, "utf8");
  for (const mode of ["en", "zh", "bilingual"]) {
    if (!html.includes(`<option value="${mode}"`)) failures.push(`${relative(outputRoot, path)}: missing ${mode} language option`);
  }
}

for (const path of htmlFiles.filter((path) => path.includes(`${join("read", "")}`))) {
  const html = readFileSync(path, "utf8");
  if (!html.includes('"@type":"Chapter"')) failures.push(`${relative(outputRoot, path)}: missing Chapter JSON-LD`);
  if (!html.includes('"@type":"BreadcrumbList"')) failures.push(`${relative(outputRoot, path)}: missing BreadcrumbList JSON-LD`);
}

if (!htmlFiles.some((path) => readFileSync(path, "utf8").includes('property="og:image"'))) failures.push("Missing social preview metadata");

if (bilingualPages.length === 0) failures.push("No bilingual output was generated");

if (failures.length) {
  console.error(`Publication validation failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log(`Publication validation passed (${htmlFiles.length} pages, ${bilingualPages.length} bilingual pages).`);
