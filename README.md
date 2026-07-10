# 美昇舒適科技行銷平台

純 HTML/JS + Supabase，架構參考 WOWCasa（不引入框架）。

## 功能
- 行銷案清單 + 甘特圖（專案名稱／總預算／實際花費／配合單位／預期目的／進度／委託第三方）
- 每週文案彙整（手動建立草稿，一鍵複製貼到 Facebook / Google Sheet）

## 建置步驟
1. 建立 Supabase project
2. 在 SQL editor 執行 `schema.sql`
3. Supabase Dashboard → Authentication 建立登入帳號（email/password）
4. 編輯 `core/config.js`，填入 `SB`（Project URL）與 `KEY`（anon public key）
5. 直接開啟 `index.html`（或部署到 Cloudflare Pages）

## 尚未串接（v1 為手動版）
- 自動收集新聞：目前無此功能，文案需自行參考新聞後手動輸入，`source_note` 欄位可貼參考連結
- 自動產文案：目前無 AI 生成，需自行撰寫或貼上文案內容
- 自動同步 Google Sheet：目前為「複製到剪貼簿」手動貼上，未串接 Google Sheets API

若之後要做自動化，需要：新聞來源（RSS/官方 API）、LLM API 金鑰、Google Sheets API service account，且建議自動生成的內容仍先進「草稿」狀態，人工確認後才轉「已發布」，避免未審核內容直接曝光。
