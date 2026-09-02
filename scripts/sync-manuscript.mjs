import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repository = process.env.MYBOOK_REPOSITORY ?? "https://github.com/MasaWang/MYBOOK.git";
const ref = process.env.MYBOOK_REF ?? "codex/zhihui-zhihai-editorial-cleanup";
const destination = new URL("../src/content-source/wisdom-sea", import.meta.url);
const stamp = new URL("../src/content-source/source.json", import.meta.url);

const temporary = mkdtempSync(join(tmpdir(), "oceanai-mybook-"));

try {
  execFileSync("git", ["clone", "--depth", "1", "--branch", ref, repository, temporary], {
    stdio: "inherit",
  });
  const source = join(temporary, "智慧之海");
  if (!existsSync(source)) throw new Error("MYBOOK 中找不到「智慧之海」目錄。 ");

  rmSync(destination, { recursive: true, force: true });
  cpSync(source, destination, { recursive: true });

  const revision = execFileSync("git", ["-C", temporary, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  writeFileSync(stamp, `${JSON.stringify({ repository, ref, revision }, null, 2)}\n`);
  process.stdout.write(`Synced 智慧之海 at ${revision.slice(0, 12)}\n`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
