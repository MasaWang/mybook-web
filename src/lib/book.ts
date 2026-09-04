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
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  author: string;
  description: string;
  descriptionEn: string;
  languageLabel: string;
  partCount: number;
  defaultReadingMode: ReadingMode;
  publication: { status: string; statusLabel: string; statusLabelEn: string; version: string; updated: string };
  source: { repository: string; ref: string; revision?: string; directory: string };
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

export type SourceRevision = { book: string; repository: string; ref: string; revision: string };

export function splitBilingualLabel(value: string) {
  const [en, ...zh] = value.split("｜");
  if (zh.length) return { en: en.trim(), zh: zh.join("｜").trim() };
  if (value.trim() === "前言") return { en: "Front Matter", zh: "前言" };
  const part = value.match(/^(Part\s+[IVX]+)\s*·\s*(.+)$/u);
  if (part && /[\u3400-\u9fff]/u.test(part[2])) return { en: part[1], zh: `${part[1]} · ${part[2]}` };
  return /[\u3400-\u9fff]/u.test(value) ? { en: "", zh: value.trim() } : { en: value.trim(), zh: "" };
}

const roman: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
const editorialEmoji = /\p{Extended_Pictographic}\uFE0F?/gu;

export function getBookManifests(): BookManifest[] {
  return readdirSync(booksRoot)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(booksRoot, name), "utf8")) as BookManifest)
    .sort((a, b) => a.title.localeCompare(b.title, "zh-Hant"));
}

export function getBookManifest(slug: string) {
  return getBookManifests().find((book) => book.slug === slug);
}

export function getSourceRevision(bookSlug: string): SourceRevision | undefined {
  const source = JSON.parse(readFileSync(join(contentRoot, "source.json"), "utf8")) as { books: SourceRevision[] };
  return source.books.find((book) => book.book === bookSlug);
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

function cleanMarkdownHeading(line: string) {
  const heading = line.match(/^(#{1,6}\s+)(.+)$/);
  return heading ? `${heading[1]}${cleanTitle(heading[2])}` : line;
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
    .map(cleanMarkdownHeading)
    .join("\n")
    .trim();
}

function splitLanguages(markdown: string) {
  const sections: Record<"intro" | "en" | "zh", string[]> = { intro: [], en: [], zh: [] };
  let current: keyof typeof sections = "intro";

  for (const line of markdown.split("\n")) {
    const marker = line.match(/^#{2,3}\s+(?:\*\*)?(EN|ZH|English Version|Chinese Version)(?:\*\*)?\s*$/i)?.[1]?.toLowerCase();
    if (marker === "en" || marker === "english version") {
      current = "en";
      continue;
    }
    if (marker === "zh" || marker === "chinese version") {
      current = "zh";
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

function chapterNumberFromHeading(line: string) {
  return Number(line.match(/^##\s+(?:\*\*)?(?:[^\p{L}\p{N}#*]+\s*)?Chapter\s+(\d+)\s*[·｜|]/iu)?.[1] ?? 0);
}

function splitCombinedPart(markdown: string) {
  const lines = markdown.split("\n");
  const starts = lines.flatMap((line, index) => {
    const chapter = chapterNumberFromHeading(line);
    return chapter ? [{ chapter, index }] : [];
  });
  const lastStart = new Map<number, number>();
  for (const start of starts) lastStart.set(start.chapter, start.index);
  const selected = [...lastStart].map(([chapter, index]) => ({ chapter, index })).sort((a, b) => a.index - b.index);
  return selected.map((start, index) => ({
    chapter: start.chapter,
    markdown: lines.slice(
      start.index,
      lines.findIndex((line, lineIndex) => lineIndex > start.index && /^##\s/.test(line)) > start.index
        ? lines.findIndex((line, lineIndex) => lineIndex > start.index && /^##\s/.test(line))
        : selected[index + 1]?.index ?? lines.length,
    ).join("\n"),
  }));
}

function makeUnit(markdown: string, fallback: string, slug: string, part: string, label: string): ReadingUnit {
  const displayMarkdown = prepareMarkdown(markdown);
  const languages = splitLanguages(displayMarkdown);
  const words = displayMarkdown.replace(/[#>*_`\[\]()|-]/g, "").length;
  return {
    slug,
    title: firstHeading(markdown.replace(/^##/, "#"), fallback),
    part,
    label: cleanTitle(label),
    minutes: Math.max(1, Math.ceil(words / 450)),
    hasBilingualContent: languages.hasBilingualContent,
    content: { introHtml: languages.introHtml, enHtml: languages.enHtml, zhHtml: languages.zhHtml },
  };
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
  const candidates = filesBelow(sourceRoot)
    .filter((path) => !/[\\/]完整版\.md$/.test(path) && !/[\\/]README\.md$/.test(path))
    .flatMap((sourcePath) => {
      const markdown = readFileSync(sourcePath, "utf8");
      const fallback = basename(sourcePath, ".md").replace(/^\d+_/, "").replace(/_/g, " ");
      if (/^Part_[VIX]+_.+\.md$/.test(basename(sourcePath))) {
        return splitCombinedPart(markdown).map(({ chapter, markdown: chapterMarkdown }) =>
          makeUnit(
            chapterMarkdown.replace(/^##/, "#"),
            `Chapter ${chapter}`,
            `chapter-${chapter}`,
            chapter <= 24 ? "Part V · 未來與延續篇" : "Part VI · 哲學核心模組",
            `Chapter ${chapter}`,
          ),
        );
      }
      return [makeUnit(
        markdown,
        fallback,
        makeSlug(sourceRoot, sourcePath),
        partLabel(sourceRoot, sourcePath),
        basename(sourcePath, ".md").replace(/^\d+_/, ""),
      )];
    });
  const unique = new Map<string, ReadingUnit>();
  for (const unit of candidates) {
    const existing = unique.get(unit.slug);
    if (!existing || unit.minutes > existing.minutes) unique.set(unit.slug, unit);
  }
  return [...unique.values()].sort((a, b) => {
      const partStarts: Record<number, number> = { 1: 0.5, 2: 5.5, 3: 10.5, 4: 15.5, 5: 20.5, 6: 24.5 };
      const number = (unit: ReadingUnit) => unit.slug === "preface" ? 0 : unit.slug.startsWith("part-") ? partStarts[Number(unit.slug.slice(5))] ?? 99 : Number(unit.slug.slice(8));
      return number(a) - number(b);
  });
}
