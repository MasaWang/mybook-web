import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { marked } from "marked";

const projectRoot = process.cwd();
const booksRoot = join(projectRoot, "src/books");
const contentRoot = join(projectRoot, "src/content-source");

export type ReadingMode = "en" | "zh" | "bilingual";

export type BookManifest = {
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  description: string;
  languageLabel: string;
  partCount: number;
  defaultReadingMode: ReadingMode;
  publication: { status: string; statusLabel: string; version: string; updated: string };
  source: { repository: string; ref: string; directory: string };
};

export type ReadingUnit = {
  slug: string;
  title: string;
  part: string;
  label: string;
  minutes: number;
  hasBilingualContent: boolean;
  content: { introHtml: string; enHtml: string; zhHtml: string };
};

const roman: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
const editorialEmoji = /[🧭📘📗🩵🩶💠🤝🏛🌌🜂☁️🌍🎨📚]/gu;

export function getBookManifests(): BookManifest[] {
  return readdirSync(booksRoot)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(booksRoot, name), "utf8")) as BookManifest)
    .sort((a, b) => a.title.localeCompare(b.title, "zh-Hant"));
}

export function getBookManifest(slug: string) {
  return getBookManifests().find((book) => book.slug === slug);
}

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : path.endsWith(".md") ? [path] : [];
  });
}

function normalizePublicText(value: string) {
  return value
    .replace(/OceanAl/g, "OceanAI")
    .replace(/[A-Za-z0-9\u3400-\u9fff.–-]+(?:_[A-Za-z0-9\u3400-\u9fff.–-]+)+\.md/gu, (filename) =>
      filename.replace(/\.md$/i, "").replace(/_/g, " "),
    )
    .replace(/\.md\b/g, "Markdown");
}

function cleanTitle(value: string) {
  return normalizePublicText(value)
    .replace(/[*_`]/g, "")
    .replace(editorialEmoji, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function firstHeading(markdown: string, fallback: string) {
  return cleanTitle(markdown.match(/^#\s+(.+)$/m)?.[1] ?? fallback);
}

function prepareMarkdown(markdown: string) {
  let prepared = markdown.replace(/^#\s+.+?\n+/, "");
  prepared = prepared.replace(
    /^---\s*\n(?=[\s\S]{0,900}?\b(?:title|author|version|language|description):)[\s\S]*?\n---\s*\n/,
    "",
  );
  prepared = normalizePublicText(prepared.replace(/\\([#*_`>\[\]-])/g, "$1")).replace(editorialEmoji, "");
  return prepared
    .split("\n")
    .filter((line) => !/^[📘📗]\s*《?.+\.md[》』]?\s*$/u.test(line.trim()))
    .map((line) => line.replace(/^(#{1,6}\s+(?:\*\*)?)[🧭📘📗🩵🩶💠🤝🏛🌌🜂☁️🌍🎨📚]+\s*/u, "$1"))
    .join("\n")
    .trim();
}

function splitLanguages(markdown: string) {
  const sections: Record<"intro" | "en" | "zh", string[]> = { intro: [], en: [], zh: [] };
  let current: keyof typeof sections = "intro";

  for (const line of markdown.split("\n")) {
    const marker = line.match(/^#{2,3}\s+(?:\*\*)?(EN|ZH)(?:\*\*)?\s*$/i)?.[1]?.toLowerCase();
    if (marker === "en" || marker === "zh") {
      current = marker;
      continue;
    }
    sections[current].push(line);
  }

  return {
    introHtml: marked.parse(sections.intro.join("\n").trim()) as string,
    enHtml: marked.parse(sections.en.join("\n").trim()) as string,
    zhHtml: marked.parse(sections.zh.join("\n").trim()) as string,
    hasBilingualContent: sections.en.some((line) => line.trim()) && sections.zh.some((line) => line.trim()),
  };
}

function unitOrder(sourceRoot: string, path: string) {
  const rel = relative(sourceRoot, path);
  if (rel === "00_前言與目錄.md") return 0;
  const partMatch = rel.match(/Part_([IVX]+)/);
  const part = partMatch ? roman[partMatch[1]] ?? 99 : 99;
  const chapter = Number(basename(path).match(/^(\d+)/)?.[1] ?? (rel.includes("Part_V_") ? 21 : 26));
  return part * 100 + chapter + (basename(path).startsWith("00_") ? -0.5 : 0);
}

function makeSlug(sourceRoot: string, path: string) {
  const rel = relative(sourceRoot, path);
  if (rel === "00_前言與目錄.md") return "preface";
  const flatPart = !rel.includes("/") ? rel.match(/^Part_([IVX]+)_/) : null;
  if (flatPart) return `part-${roman[flatPart[1]]}`;
  const part = rel.match(/Part_([IVX]+)/)?.[1];
  const chapter = basename(path).match(/^(\d+)/)?.[1];
  return chapter === "00" ? `part-${roman[part ?? ""]}` : `chapter-${Number(chapter)}`;
}

function partLabel(sourceRoot: string, path: string) {
  if (basename(path) === "00_前言與目錄.md") return "前言";
  const sourceName = basename(dirname(path)) === basename(sourceRoot) ? basename(path) : basename(dirname(path));
  const match = sourceName.match(/^Part_([IVX]+)_(.+?)(?:\.md)?$/);
  return match ? `Part ${match[1]} · ${cleanTitle(match[2].replace(/_/g, " "))}` : "附錄";
}

export function getBookUnits(bookSlug: string): ReadingUnit[] {
  const sourceRoot = join(contentRoot, bookSlug);
  return filesBelow(sourceRoot)
    .filter((path) => !/[\\/]完整版\.md$/.test(path) && !/[\\/]README\.md$/.test(path))
    .sort((a, b) => unitOrder(sourceRoot, a) - unitOrder(sourceRoot, b))
    .map((sourcePath) => {
      const markdown = readFileSync(sourcePath, "utf8");
      const displayMarkdown = prepareMarkdown(markdown);
      const languages = splitLanguages(displayMarkdown);
      const fallback = basename(sourcePath, ".md").replace(/^\d+_/, "").replace(/_/g, " ");
      const words = displayMarkdown.replace(/[#>*_`\[\]()|-]/g, "").length;
      return {
        slug: makeSlug(sourceRoot, sourcePath),
        title: firstHeading(markdown, fallback),
        part: partLabel(sourceRoot, sourcePath),
        label: cleanTitle(basename(sourcePath, ".md").replace(/^\d+_/, "")),
        minutes: Math.max(1, Math.ceil(words / 450)),
        hasBilingualContent: languages.hasBilingualContent,
        content: { introHtml: languages.introHtml, enHtml: languages.enHtml, zhHtml: languages.zhHtml },
      };
    });
}
