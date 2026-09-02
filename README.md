# OceanAI Web Book

OceanAI 的 Markdown-first 靜態數位出版網站。第一階段提供《智慧之海》的書籍首頁、目錄與逐章閱讀。

公開網站：[https://masawang.github.io/mybook-web/](https://masawang.github.io/mybook-web/)

## Local development

```bash
npm install
npm run dev
```

`npm run dev` 與 `npm run build` 會先從 [`MasaWang/MYBOOK`](https://github.com/MasaWang/MYBOOK) 的定稿分支同步《智慧之海》來源檔案；同步內容不提交至本 repository。

## Build

```bash
npm run build
```

輸出位於 `dist/`。
