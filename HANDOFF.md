# 美昇舒適科技行銷平台 · 工作交接紀錄

## 最後更新
- 日期：2026-07-10
- 執行裝置：M1（Claude Code）

## 本次完成（2026-07-10）
- 專案初始化：純 HTML/JS + Supabase 架構，參考 WOWCasa 的 core/config.js、core/api.js、core/auth.js 模式
- 建立 `schema.sql`：`marketing_campaigns`（行銷案：專案名稱/總預算/實際花費/配合單位/預期目的/進度[估價/進行中/結案]/委託第三方/時程）、`marketing_content_drafts`（每週文案草稿）
- `index.html` + `app.js`：
  - 總覽頁：KPI（案量、預算、執行率）+ 最近行銷案
  - 行銷案管理：清單 + 新增/編輯/刪除 Modal + 甘特圖 toggle（沿用 WOWCasa 專案管理的甘特圖邏輯）
  - 每週文案彙整：依週分組顯示草稿，可新增/編輯/刪除，「複製」按鈕可一鍵複製單則或整週文案到剪貼簿，貼到 Facebook 或 Google Sheet
- v1 範圍決策：新聞蒐集／AI 文案生成／Google Sheet 自動匯出**先不做自動化**，改為使用者手動輸入 + 一鍵複製，待使用者確認自動化的新聞來源、LLM 金鑰、Google Sheets API 憑證後再串接

## 下一步待辦
- [ ] 使用者建立自己的 Supabase project，回填 `core/config.js` 的 `SB` / `KEY`
- [ ] 執行 `schema.sql`，並在 Supabase Authentication 建立登入帳號
- [ ] 本機開啟 index.html 驗證登入、行銷案 CRUD、甘特圖、文案彙整流程
- [ ] 確認是否要推上 GitHub（repo 名稱、public/private）與部署到 Cloudflare Pages
- [ ] 若要做新聞自動蒐集：決定新聞來源（RSS 優先，避免直接爬 Google News 網頁的 ToS 風險）
- [ ] 若要做 AI 文案自動生成：需要 Claude API 金鑰，且流程需保留人工審核草稿的步驟（不建議全自動發布）
- [ ] 若要做 Google Sheet 自動匯出：需要 Google Sheets API service account 憑證，且需要一個排程觸發點（Supabase Edge Function 或 Cloudflare Cron Trigger）

## 未解決問題
- 無（v1 尚未連接真實 Supabase project，尚未實機驗證）

## 專案現況
- index.html：單頁應用（登入 + 側邊欄 + 總覽/行銷案/文案彙整三頁）
- app.js：行銷案與文案彙整的渲染與 CRUD 邏輯
- core/：config.js（Supabase 連線設定，待填）、api.js（GET/POST/PATCH/DEL）、auth.js（登入/登出/session）
- schema.sql：Supabase 資料表定義（尚未執行，等使用者提供 Supabase project）
