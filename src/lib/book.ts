import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { marked } from "marked";

const sourceRoot = join(process.cwd(), "src/content-source/wisdom-sea");

export type ReadingUnit = {
  slug: string;
  title: string;
  part: string;
  label: string;
  sourcePath: string;
  markdown: string;
  html: string;
  minutes: number;
};

const roman: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : path.endsWith(".md") ? [path] : [];
  });
}

function firstHeading(markdown: string, fallback: string) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.replace(/[*_`]/g, "").trim() ?? fallback;
}

function prepareMarkdown(markdown: string) {
  let prepared = markdown.replace(/^#\s+.+?\n+/, "");
  prepared = prepared.replace(
    /^---\s*\n(?=[\s\S]{0,900}?\b(?:title|author|version|language|description):)[\s\S]*?\n---\s*\n/,
    "",
  );
  return prepared.replace(/\\([#*_`>\[\]-])/g, "$1").trim();
}

function unitOrder(path: string) {
  const rel = relative(sourceRoot, path);
  if (rel === "00_前言與目錄.md") return 0;
  const partMatch = rel.match(/Part_([IVX]+)/);
  const part = partMatch ? roman[partMatch[1]] ?? 99 : 99;
  const chapter = Number(basename(path).match(/^(\d+)/)?.[1] ?? (rel.includes("Part_V_") ? 21 : 26));
  const opener = basename(path).startsWith("00_") ? -0.5 : 0;
  return part * 100 + chapter + opener;
}

function makeSlug(path: string) {
  const rel = relative(sourceRoot, path);
  if (rel === "00_前言與目錄.md") return "preface";
  if (rel.includes("Part_V_")) return "part-5";
  if (rel.includes("Part_VI_")) return "part-6";
  const part = rel.match(/Part_([IVX]+)/)?.[1]?.toLowerCase() ?? "appendix";
  const chapter = basename(path).match(/^(\d+)/)?.[1];
  return chapter === "00" ? `part-${roman[part.toUpperCase()]}` : `chapter-${Number(chapter)}`;
}

function partLabel(path: string) {
  if (basename(path) === "00_前言與目錄.md") return "前言";
  const folder = basename(dirname(path));
  const match = folder.match(/^Part_([IVX]+)_(.+)$/);
  if (match) return `Part ${match[1]} · ${match[2].replace(/_/g, " ")}`;
  const fileMatch = basename(path).match(/^Part_([IVX]+)_(.+)\.md$/);
  return fileMatch ? `Part ${fileMatch[1]} · ${fileMatch[2].replace(/_/g, " ")}` : "附錄";
}

export function getBook(): ReadingUnit[] {
  return filesBelow(sourceRoot)
    .filter((path) => !/[\\/]完整版\.md$/.test(path) && !/[\\/]README\.md$/.test(path))
    .sort((a, b) => unitOrder(a) - unitOrder(b))
    .map((sourcePath) => {
      const markdown = readFileSync(sourcePath, "utf8");
      const displayMarkdown = prepareMarkdown(markdown);
      const fallback = basename(sourcePath, ".md").replace(/^\d+_/, "").replace(/_/g, " ");
      const title = firstHeading(markdown, fallback);
      const words = markdown.replace(/[#>*_`\[\]()|-]/g, "").length;
      return {
        slug: makeSlug(sourcePath),
        title,
        part: partLabel(sourcePath),
        label: basename(sourcePath, ".md"),
        sourcePath: relative(sourceRoot, sourcePath),
        markdown,
        html: marked.parse(displayMarkdown) as string,
        minutes: Math.max(1, Math.ceil(words / 450)),
      };
    });
}
