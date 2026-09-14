# Manuscript Revision Studio｜書稿修訂工作台

本機 MVP，用於逐段審查 `MYBOOK-EDITORIAL` 中的《智慧之海》。正式書稿只讀；接受的修改另存至 `智慧之海修訂`。

## 啟動

先在專案根目錄建立不會提交至 GitHub 的 `.env.local`：

```text
OPENAI_API_KEY=你的_API_金鑰
```

金鑰可在 OpenAI Platform 建立。ChatGPT 或 Codex 的登入狀態不會自動提供 API 金鑰。

```bash
npm run studio
```

開啟 `http://127.0.0.1:4370`。

可用環境變數：

- `MANUSCRIPT_VAULT`：Vault 根目錄。
- `MANUSCRIPT_BOOK`：正式書稿資料夾，預設 `智慧之海`。
- `MANUSCRIPT_DRAFTS`：修訂稿資料夾，預設 `智慧之海修訂`。
- `MANUSCRIPT_STUDIO_PORT`：本機連接埠，預設 `4370`。

## 安全邊界

- 只監聽 `127.0.0.1`。
- 不覆蓋正式書稿。
- 不自動提交、推送或部署。
- 寫入使用暫存檔後原子替換。
- 受保護術語數量改變時，必須額外確認。
- `完整版.md` 視為生成檔，不列入修訂清單。

## 英中修訂流程

1. 英文原稿是語義、論證、作者聲音與術語的第一來源。
2. 繁體中文是作者的修訂與思想澄清層。
3. 最終英文依英文來源與中文修訂重新寫作，不做逐字回譯。
4. 中文與英文各可產生保守修訂、編輯優化、深度重寫三條候選。
5. 只有作者按下「接受這組英中修訂」，兩個關聯段落才會進入待保存狀態。

AI 候選需要在啟動工作台前於 `.env.local` 設定 `OPENAI_API_KEY`。可用 `MANUSCRIPT_STUDIO_MODEL` 指定模型，預設為 `gpt-5`。API 金鑰只由本機服務讀取，不會傳到瀏覽器，也不會提交到 GitHub。

## MVP 限制

- 未設定模型 API 時，中文修訂與英文回寫仍可完全人工編輯。
- 穩定段落 ID 目前依文件路徑與段落順序建立；後續版本應以 sidecar manifest 保存跨重排 ID。
