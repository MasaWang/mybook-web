import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const booksDirectory = new URL("../src/books/", import.meta.url);
const contentDirectory = new URL("../src/content-source/", import.meta.url);
const stamp = new URL("../src/content-source/source.json", import.meta.url);
const manifests = readdirSync(booksDirectory)
  .filter((name) => name.endsWith(".json"))
  .map((name) => JSON.parse(readFileSync(new URL(name, booksDirectory), "utf8")));
const revisions = [];

rmSync(contentDirectory, { recursive: true, force: true });

for (const manifest of manifests) {
  const temporary = mkdtempSync(join(tmpdir(), `oceanai-${manifest.slug}-`));
  const repository = process.env.MYBOOK_REPOSITORY ?? manifest.source.repository;
  const ref = process.env.MYBOOK_REF ?? manifest.source.ref;

  try {
    execFileSync("git", ["clone", "--depth", "1", "--branch", ref, repository, temporary], { stdio: "inherit" });
    const source = join(temporary, manifest.source.directory);
    if (!existsSync(source)) throw new Error(`${manifest.slug} 找不到來源目錄：${manifest.source.directory}`);
    cpSync(source, new URL(`${manifest.slug}/`, contentDirectory), { recursive: true });

    const revision = execFileSync("git", ["-C", temporary, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (manifest.source.revision && revision !== manifest.source.revision) {
      throw new Error(`${manifest.slug} 來源 revision 不符：預期 ${manifest.source.revision}，實際 ${revision}`);
    }
    revisions.push({ book: manifest.slug, repository, ref, revision });
    process.stdout.write(`Synced ${manifest.title} at ${revision.slice(0, 12)}\n`);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

writeFileSync(stamp, `${JSON.stringify({ books: revisions }, null, 2)}\n`);
