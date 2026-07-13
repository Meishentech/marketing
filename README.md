# 美昇舒適科技行銷平台

純 HTML/JS + Supabase，架構參考 WOWCasa（不引入框架）。

## 功能
- 行銷案總表（專案名稱／執行狀態／預算）＋ 點擊進入詳情頁（專案說明／專案時間／專案預算／補助與請款狀態／負責人／負責單位／負責公司／任務與里程碑／預算明細）＋ 時程圖
- 行銷成效查詢：集中記錄各行銷案觸及、名單、有效商機、成交金額與成本效率
- 行銷資源庫：集中管理簡報、DM、型錄、技術文章、展場素材、案例與 Canva / Drive 連結，支援檔案上傳下載、關鍵字搜尋、類型/對象/對外權限篩選與排序
- 對外素材：只顯示可提供客戶的行銷資源，供業務快速查詢與下載
- 公會管理：管理加入公會、年費續會、會員權益、期刊截稿排程與會員大會/協辦活動
- 成功案例庫：存放案例摘要、成效數字、標籤與封面圖片，業務可登入查詢並下載案例圖片素材
- 帳號管理：登入頁支援忘記密碼；新開通帳號可標記首次登入必須變更預設密碼
- 總表可匯出 Excel（CSV）
- 新聞蒐集（依關鍵字抓取 Google News RSS，經 rss2json.com 中轉，需要 API key，見下方設定）
- 每週文案彙整：手動建立草稿，可從新聞蒐集一鍵帶入標題/連結，一鍵複製貼到 Facebook / Google Sheet
- 每週一自動草稿（GitHub Actions 排程）：自動抓新聞、用 Claude Haiku 生成文案草稿寫入平台，狀態固定為「草稿」，一律要人工在「每週文案彙整」頁確認後才算數，不會自動發布

## 建置步驟
1. 建立 Supabase project
2. 在 SQL editor 依序執行 `schema.sql`、`schema_v2_news.sql`、`schema_v3_fields.sql`、`schema_v4_vendors.sql`、`schema_v5_subsidy.sql`、`schema_v6_status.sql`、`schema_v7_case_studies.sql`、`schema_v8_tasks_budget.sql`、`schema_v9_documents.sql`、`schema_v10_risks.sql`、`schema_v11_risk_updates.sql`、`schema_v12_performance_resources.sql`、`schema_v13_user_access.sql`、`schema_v14_resource_files.sql`、`schema_v15_priority.sql`、`schema_v16_resource_file_size_limit.sql`、`schema_v17_associations.sql`、`schema_v18_association_notes.sql`
3. Supabase Dashboard → Authentication 建立登入帳號（email/password）
4. 編輯 `core/config.js`，填入 `SB`（Project URL）與 `KEY`（anon public key）
5. 部署到 Cloudflare Pages（`/api/news` 需要 Pages Functions 才能運作，純本機開檔案 `index.html` 無法測新聞蒐集）
6. Cloudflare Pages → Settings → Environment variables 新增 `RSS2JSON_API_KEY`（[rss2json.com](https://rss2json.com/docs) 免費申請）

## 每週自動草稿設定（選用）
在 GitHub repo → Settings → Secrets and variables → Actions，新增以下 secrets：
- `SUPABASE_URL`：`core/config.js` 裡的 `SB`
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase Dashboard → Project Settings → API → `service_role` key（**權限很高，不可外流，只能存在這裡**）
- `RSS2JSON_API_KEY`：同上方 Cloudflare 環境變數用的那組
- `ANTHROPIC_API_KEY`：[console.anthropic.com](https://console.anthropic.com) 申請，會依用量產生費用（Claude Haiku 每月約幾十元台幣等級，實際費用視新聞量而定）

設定完成後，`.github/workflows/weekly-content.yml` 會在每週一台北時間早上 8 點自動執行 `scripts/generate-weekly-content.mjs`；也可以到 GitHub repo 的 Actions 頁籤手動點 "Run workflow" 立即測試。

## 尚未串接
- 自動同步 Google Sheet：目前為「複製到剪貼簿」手動貼上，未串接 Google Sheets API（需要 service account 憑證）
