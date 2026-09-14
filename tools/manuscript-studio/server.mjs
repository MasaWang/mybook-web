import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolRoot = fileURLToPath(new URL(".", import.meta.url));
const vaultRoot = resolve(process.env.MANUSCRIPT_VAULT ?? "/Users/kriswong/Documents/MYBOOK-EDITORIAL");
const bookRoot = resolve(vaultRoot, process.env.MANUSCRIPT_BOOK ?? "智慧之海");
const draftRoot = resolve(vaultRoot, process.env.MANUSCRIPT_DRAFTS ?? "智慧之海修訂");
const port = Number(process.env.MANUSCRIPT_STUDIO_PORT ?? 4370);

const protectedTerms = [
  { en: "Intelligence", zh: "智能", rule: "Technical, architectural, system, and analytical contexts" },
  { en: "Wisdom", zh: "智慧", rule: "Human and philosophical judgment" },
  { en: "Artificial Intelligence", zh: "人工智慧", rule: "Formal AI term" },
  { en: "Ocean of Intelligence", zh: "智慧之海", rule: "Title-only established exception" },
  { en: "OceanAI", zh: "OceanAI", rule: "System-level intelligence architecture" },
];

function json(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}

function safePath(root, requested) {
  const target = resolve(root, normalize(requested ?? ""));
  if (target !== root && !target.startsWith(`${root}/`)) throw new Error("Path is outside the manuscript root");
  return target;
}

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    if (extname(entry.name).toLowerCase() !== ".md") return [];
    if (["完整版.md"].includes(entry.name)) return [];
    return [path];
  });
}

function documentPrefix(path) {
  const name = relative(bookRoot, path).replace(/\.md$/i, "").toUpperCase();
  return `WS-${name.replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "TEXT"}`;
}

function segmentDocument(content, path) {
  const pieces = content.match(/[\s\S]*?(?:\n{2,}|$)/g)?.filter(Boolean) ?? [];
  const prefix = documentPrefix(path);
  let language = "en";
  let ordinal = 0;
  const segments = pieces.map((piece) => {
    const separator = piece.match(/\n{2,}$/)?.[0] ?? "";
    const text = separator ? piece.slice(0, -separator.length) : piece;
    const marker = text.match(/^#{1,3}\s+(.+)$/m)?.[1]?.replace(/[|*_`]/g, "").trim();
    const normalizedMarker = marker?.toLowerCase();
    const bilingualHeading = marker && /[\u3400-\u9fff]/u.test(marker) && /[a-z]/iu.test(marker);
    if (normalizedMarker && /^(en|english version|english source)/.test(normalizedMarker)) language = "en";
    else if (normalizedMarker && (/^(zh|繁中|traditional chinese)/.test(normalizedMarker) || (/^[^a-z]*[\u3400-\u9fff][^a-z]*$/iu.test(marker)))) language = "zh-TW";
    ordinal += 1;
    return {
      id: `${prefix}-P${String(ordinal).padStart(3, "0")}`,
      language: bilingualHeading ? "shared" : language,
      kind: /^#{1,6}\s/.test(text) ? "heading" : /^>\s/m.test(text) ? "quote" : /^(?:[-*+] |\d+\. )/m.test(text) ? "list" : "paragraph",
      text,
      separator,
    };
  });
  const english = segments.filter((segment) => segment.language === "en");
  const chinese = segments.filter((segment) => segment.language === "zh-TW");
  english.forEach((segment, index) => {
    segment.pairId = chinese[index]?.id ?? null;
    segment.pairStatus = chinese[index] ? "paired" : "unpaired";
  });
  chinese.forEach((segment, index) => {
    segment.pairId = english[index]?.id ?? null;
    segment.pairStatus = english[index] ? "paired" : "unpaired";
  });
  return segments;
}

function termCounts(content) {
  return Object.fromEntries(protectedTerms.flatMap((term) => [term.en, term.zh]).filter((term, index, all) => all.indexOf(term) === index).map((term) => [term, content.split(term).length - 1]));
}

function termChanges(before, after) {
  const previous = termCounts(before);
  const next = termCounts(after);
  return Object.keys(previous).filter((term) => previous[term] !== next[term]).map((term) => ({ term, before: previous[term], after: next[term] }));
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 5_000_000) throw new Error("Request is too large");
  }
  return JSON.parse(body || "{}");
}

function proposalPrompt(body) {
  const terms = protectedTerms.map((term) => `${term.en} → ${term.zh}: ${term.rule}`).join("\n");
  const task = body.stage === "english"
    ? `Rewrite the revised Traditional Chinese passage as publication-quality English. The English source is authoritative for voice, argument, and terminology; the revised Chinese records the author's editorial clarification. Do not back-translate literally.`
    : `Propose publication-quality Traditional Chinese revisions. Preserve the meaning, argument, and authorial voice of the authoritative English source. The Chinese is an editorial thinking layer, not permission to change the argument.`;
  return `${task}\n\nReturn JSON only as an object with a proposals array containing exactly three objects. Each proposal must have mode, text, and reason. Use modes conservative, editorial, and deep. Reasons must be Traditional Chinese and concise. Do not add facts. Do not alter protected terminology.\n\nProtected terminology:\n${terms}\n\nPrevious context:\n${body.before || "(none)"}\n\nAuthoritative English source:\n${body.english}\n\nCurrent Traditional Chinese revision:\n${body.chinese}\n\nFollowing context:\n${body.after || "(none)"}`;
}

async function generateProposals(body) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("尚未設定 OPENAI_API_KEY；你仍可直接編輯中文與英文回寫稿。");
    error.status = 503;
    throw error;
  }
  if (!["chinese", "english"].includes(body.stage)) throw Object.assign(new Error("Unknown proposal stage"), { status: 400 });
  if (!String(body.english ?? "").trim() || !String(body.chinese ?? "").trim()) throw Object.assign(new Error("English and Chinese text are required"), { status: 400 });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.MANUSCRIPT_STUDIO_MODEL ?? "gpt-5",
      input: proposalPrompt(body),
      text: { format: { type: "json_schema", name: "revision_proposals", strict: true, schema: {
        type: "object", additionalProperties: false, required: ["proposals"], properties: { proposals: {
          type: "array", minItems: 3, maxItems: 3,
          items: { type: "object", additionalProperties: false, required: ["mode", "text", "reason"], properties: {
            mode: { type: "string", enum: ["conservative", "editorial", "deep"] }, text: { type: "string" }, reason: { type: "string" },
          } },
        } },
      } } },
    }),
  });
  const value = await response.json();
  if (!response.ok) throw Object.assign(new Error(value.error?.message ?? "AI proposal request failed"), { status: response.status });
  const output = value.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
  if (!output) throw new Error("AI did not return proposal text");
  return JSON.parse(output).proposals;
}

function serveFile(response, path) {
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
  response.writeHead(200, { "content-type": `${types[extname(path)] ?? "application/octet-stream"}; charset=utf-8` });
  createReadStream(path).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    if (request.method === "GET" && url.pathname === "/api/status") {
      return json(response, 200, { vaultRoot, bookRoot, draftRoot, writable: existsSync(vaultRoot), aiAvailable: Boolean(process.env.OPENAI_API_KEY) });
    }
    if (request.method === "GET" && url.pathname === "/api/terms") return json(response, 200, protectedTerms);
    if (request.method === "GET" && url.pathname === "/api/files") {
      const files = markdownFiles(bookRoot).map((path) => ({
        path: relative(bookRoot, path),
        label: relative(bookRoot, path).replace(/\.md$/i, "").replaceAll("_", " "),
        size: statSync(path).size,
        draftExists: existsSync(join(draftRoot, relative(bookRoot, path))),
      }));
      return json(response, 200, files.sort((a, b) => a.path.localeCompare(b.path, "zh-Hant")));
    }
    if (request.method === "GET" && url.pathname === "/api/document") {
      const path = safePath(bookRoot, url.searchParams.get("path"));
      if (!existsSync(path) || extname(path) !== ".md") return json(response, 404, { error: "Document not found" });
      const content = readFileSync(path, "utf8");
      return json(response, 200, { path: relative(bookRoot, path), segments: segmentDocument(content, path), protectedTerms: termCounts(content) });
    }
    if (request.method === "POST" && url.pathname === "/api/proposals") {
      const body = await readBody(request);
      return json(response, 200, { proposals: await generateProposals(body) });
    }
    if (request.method === "POST" && url.pathname === "/api/draft") {
      const body = await readBody(request);
      const sourcePath = safePath(bookRoot, body.path);
      if (!existsSync(sourcePath) || extname(sourcePath) !== ".md") return json(response, 404, { error: "Source document not found" });
      const source = readFileSync(sourcePath, "utf8");
      const originalSegments = segmentDocument(source, sourcePath);
      const submittedSegments = Array.isArray(body.segments) ? body.segments : [];
      const expectedIds = new Set(originalSegments.map((segment) => segment.id));
      const submittedIds = submittedSegments.map((segment) => String(segment.id ?? ""));
      const submittedIdSet = new Set(submittedIds);
      const segmentSetMatches = submittedSegments.length === originalSegments.length
        && submittedIdSet.size === expectedIds.size
        && submittedIds.every((id) => expectedIds.has(id));
      if (!segmentSetMatches) return json(response, 400, { error: "Segment set no longer matches the source document" });
      const revisions = new Map(submittedSegments.map((segment) => [segment.id, String(segment.text ?? "")]));
      const content = originalSegments.map((segment) => `${revisions.get(segment.id) ?? segment.text}${segment.separator}`).join("");
      const changes = termChanges(source, content);
      if (changes.length && !body.confirmProtectedChanges) return json(response, 409, { error: "Protected terminology changed", changes });
      const draftPath = safePath(draftRoot, relative(bookRoot, sourcePath));
      mkdirSync(dirname(draftPath), { recursive: true });
      const temporary = `${draftPath}.tmp`;
      writeFileSync(temporary, content, "utf8");
      renameSync(temporary, draftPath);
      return json(response, 200, { saved: relative(vaultRoot, draftPath), changes, bytes: Buffer.byteLength(content) });
    }
    if (request.method === "GET" && ["/", "/index.html"].includes(url.pathname)) return serveFile(response, join(toolRoot, "public/index.html"));
    if (request.method === "GET" && ["/app.js", "/styles.css"].includes(url.pathname)) return serveFile(response, join(toolRoot, `public${url.pathname}`));
    json(response, 404, { error: "Not found" });
  } catch (error) {
    json(response, Number(error?.status) || 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Manuscript Revision Studio: http://127.0.0.1:${port}`);
  console.log(`Source: ${bookRoot}`);
  console.log(`Drafts: ${draftRoot}`);
});
