# 美昇舒適科技行銷平台

純 HTML/JS + Supabase，架構參考 WOWCasa（不引入框架）。

## 功能
- 行銷案清單 + 甘特圖（專案名稱／總預算／實際花費／配合單位／預期目的／進度／委託第三方）
- 新聞蒐集（依關鍵字抓取 Google News RSS，透過 Cloudflare Pages Function `/api/news` 代理，免金鑰）
- 每週文案彙整（手動建立草稿，可從新聞蒐集一鍵帶入標題/連結，一鍵複製貼到 Facebook / Google Sheet）

## 建置步驟
1. 建立 Supabase project
2. 在 SQL editor 依序執行 `schema.sql`、`schema_v2_news.sql`
3. Supabase Dashboard → Authentication 建立登入帳號（email/password）
4. 編輯 `core/config.js`，填入 `SB`（Project URL）與 `KEY`（anon public key）
5. 部署到 Cloudflare Pages（`/api/news` 需要 Pages Functions 才能運作，純本機開檔案 `index.html` 無法測新聞蒐集）

## 尚未串接（v1 為手動版）
- 自動產文案：目前無 AI 生成，需自行參考新聞蒐集頁的結果撰寫或貼上文案內容
- 自動同步 Google Sheet：目前為「複製到剪貼簿」手動貼上，未串接 Google Sheets API
- 新聞蒐集為手動觸發（點擊「重新抓取」），未排程自動執行

若之後要做完整自動化，需要：LLM API 金鑰（AI 生文案）、Google Sheets API service account（自動匯出）、排程觸發點（Cloudflare Cron Trigger）。建議自動生成的內容仍先進「草稿」狀態，人工確認後才轉「已發布」，避免未審核內容直接曝光。
