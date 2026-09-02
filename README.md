# OceanAI Web Book

OceanAI 的 Markdown-first 靜態數位出版網站。以書籍 manifest 驅動首頁、目錄、逐章閱讀與 `EN | 繁中 | EN + 繁中` 三態閱讀，並提供響應式書籍目錄、目錄搜尋、閱讀位置保存、繼續閱讀及出版型 SEO metadata。

公開網站：[https://masawang.github.io/mybook-web/](https://masawang.github.io/mybook-web/)

## Local development

```bash
npm install
npm run dev
```

`npm run dev` 與 `npm run build` 會依 `src/books/*.json` 的設定，從 [`MasaWang/MYBOOK`](https://github.com/MasaWang/MYBOOK) 同步書稿；同步內容不提交至本 repository，MYBOOK 保持為權威內容源。

## Add a book

在 `src/books/` 新增一份 manifest，提供書籍 metadata 與 `source.repository`、`source.ref`、`source.revision`、`source.directory`。若新書沿用現有 Markdown 結構，不需新增頁面程式；同步器與通用路由會自動產生書籍首頁、目錄及閱讀頁。`source.revision` 用來鎖定可重現來源，分支內容改變後必須明確更新 revision 才能發布。

建置完成後，`scripts/validate-publication.mjs` 會檢查公開 HTML，避免已知術語錯字、編輯檔名與雙語控制缺漏進入部署版本。

## Build

```bash
npm run build
```

輸出位於 `dist/`。
