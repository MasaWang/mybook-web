# Cursor 建置流程

今後用 Cursor 協助建置，採用「書稿與網站分離、每項任務獨立分支、PR 合併」。

不要讓 Cursor 直接在 `main` 上做大型修改。Cloud Agent 完成後必須推送分支並建立 PR，否則本機看不到修改。

## 一、兩個 Repository 的職責

- 網站程式：[MasaWang/mybook-web](https://github.com/MasaWang/mybook-web)
  - Astro 網站、版式、語言切換、深色模式、書稿解析與部署。
- 編輯書稿：[MasaWang/MYBOOK-EDITORIAL](https://github.com/MasaWang/MYBOOK-EDITORIAL)
  - `Contents`、`Opening`、`Preface` 與各章 Markdown。
  - 書稿內容不要直接寫進網站程式庫。

工作目錄：

- 本機：`/Users/kriswong/Documents/mybook-web`
- Cursor Cloud Agent：通常是臨時路徑 `/workspace`

Cloud Agent 改的是遠端 clone，不是本機資料夾。要在本機核對，必須先 `git fetch` 並 checkout 該任務分支。

## 二、Cursor 建置流程

### 1. 每次先建立獨立分支

先同步最新 `main`：

```bash
git switch main
git pull --ff-only origin main
git switch -c cursor/任務名稱
```

例如：

```bash
git switch -c cursor/refine-reader-layout
```

Cloud Agent 分支名稱需符合 `cursor/<descriptive-name>-<run-id>`，例如 `cursor/cursor-build-workflow-9750`。本機任務可用較短的 `cursor/任務名稱`。

### 2. 安裝並啟動

Astro 7 要求 Node ≥ 22.12：

```bash
node --version
npm ci
npm run dev
```

本機網站通常是：

<http://127.0.0.1:4321/mybook-web/>

若 Cursor 使用其他連接埠，以終端顯示的地址為準。

### 3. 告訴 Cursor 明確範圍

每次提示詞都包含：

```text
目標：
允許修改的檔案：
不可修改的內容：
必須保留的版式或功能：
驗證頁面：
完成後不要直接合併 main，請建立獨立提交與 PR。
```

例如：

```text
只調整閱讀頁 metadata 的間距。

允許修改：
- src/pages/books/[book]/read/[slug].astro
- src/styles/global.css

不可修改：
- MYBOOK-EDITORIAL 書稿
- 首頁與目錄版式
- 語言切換邏輯
- 深色模式色彩

完成後檢查英文、繁中、雙語與深色模式，執行 npm run build。
```

### 4. 書稿更新方式

先在 `MYBOOK-EDITORIAL` 修改並提交書稿，再取得該提交的完整 revision，更新網站的 `src/books/wisdom-sea.json`：

```json
"source": {
  "repository": "https://github.com/MasaWang/MYBOOK-EDITORIAL.git",
  "ref": "main",
  "revision": "新的完整 commit SHA",
  "directory": "智慧之海"
}
```

不要直接修改自動生成的 `src/content-source/`；它會在建置時重新同步。

### 5. 完整驗證

```bash
npm run build
```

這一條命令會依序完成：

1. 從 `MYBOOK-EDITORIAL` 同步指定 revision。
2. 執行 `astro check`。
3. 建立靜態網站。
4. 執行出版驗證。

成功時應看到：

```text
0 errors
0 warnings
0 hints
35 page(s) built
Publication validation passed (35 pages, 35 bilingual pages).
```

之後再人工檢查：

- 網站首頁
- 書籍首頁
- 目錄
- Opening、Preface
- 第一章及本次修改章節
- English
- 繁體中文
- English + 繁中
- 淺色與深色模式
- 桌面及手機寬度

### 6. 推送與建立 PR

```bash
git status
git diff
git add 指定檔案
git commit -m "清楚描述本次修改"
git push -u origin cursor/任務名稱
```

在 GitHub 建立 PR，確認建置通過後再合併 `main`。推送至 `main` 後，GitHub Pages 會自動更新。

- 部署狀態：[GitHub Actions](https://github.com/MasaWang/mybook-web/actions)
- 正式網站：<https://masawang.github.io/mybook-web/>

## 三、重要文件

路徑相對於本 repository 根目錄。本機完整路徑為 `/Users/kriswong/Documents/mybook-web/...`；Cloud Agent 為 `/workspace/...`。

| 文件 | 用途 |
| --- | --- |
| [README.md](../README.md) | 安裝、同步書稿及建置入口 |
| [package.json](../package.json) | Node 要求與所有建置命令 |
| [astro.config.mjs](../astro.config.mjs) | Astro、GitHub Pages 路徑與 HTML 壓縮設定 |
| [src/books/wisdom-sea.json](../src/books/wisdom-sea.json) | 書籍資料與書稿 revision |
| [scripts/sync-manuscript.mjs](../scripts/sync-manuscript.mjs) | 書稿同步規則 |
| [scripts/validate-publication.mjs](../scripts/validate-publication.mjs) | 出版頁驗證 |
| [.github/workflows/deploy-pages.yml](../.github/workflows/deploy-pages.yml) | GitHub Pages 自動部署 |
| [design-qa.md](../design-qa.md) | 已接受的閱讀頁視覺基準 |
| [docs/change-log.md](change-log.md) | 網站修改歷史 |
| [docs/cursor-build-workflow.md](cursor-build-workflow.md) | 本文件：Cursor 建置流程 |
