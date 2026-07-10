# 美昇舒適科技行銷平台 · 工作交接紀錄

## 最後更新
- 日期：2026-07-10
- 執行裝置：M1（Claude Code / Codex）

## 部署與帳號資訊
- GitHub：https://github.com/Meishentech/marketing
- Cloudflare Pages：https://marketing-a4l.pages.dev（push 到 main 自動部署）
- Supabase project：`apgrclmrkarxlajmhnpa`（獨立帳號，非 WOWCasa 的 AICasa 組織，Claude 端 Supabase MCP 無法直接操作，schema 變更需請使用者手動在 Dashboard SQL Editor 執行）
- 登入測試帳號：test@mcttw.com.tw
- Cloudflare Pages 環境變數：`RSS2JSON_API_KEY`（新聞蒐集用）
- GitHub Secrets（供每週自動文案排程用）：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`RSS2JSON_API_KEY`、`ANTHROPIC_API_KEY`

## 功能總覽（截至本次）

### 1. 行銷案管理
- 總表只顯示專案名稱／執行狀態／預算，**自動依狀態分組排序**（預計規劃→估價中→進行中→補助申請→結案，同狀態內依建立時間新到舊）
- 點擊進入詳情頁：專案說明／專案時間（預計+實際）／專案預算（含美的預計補助、已核發補助）／負責人／負責單位（主要配合單位，可＋新增）／負責公司（外包，可複數）／**補助與請款狀態**（美的預算編號、付款狀態、請款狀態、機票費用）／備註
- **任務與里程碑**（子表 `marketing_campaign_tasks`）：詳情頁內可新增/編輯/刪除，含序號、任務名稱、負責人、預計時程、狀態（未開始/進行中/已完成/待確認）、完成率%，對應原本 Google Sheet 每個專案分頁裡的「執行項目與進度」WBS
- **預算明細**（子表 `marketing_campaign_budget_items`）：詳情頁內可新增/編輯/刪除，逐項費用含台幣/RMB雙幣別、匯率、預算性質、報價狀態，自動加總合計，對應原本 Google Sheet 的「預算明細」表格
- **風險與待決事項**（子表 `marketing_campaign_risks`）：詳情頁內可新增/編輯/刪除，含類型、事項描述、影響程度、負責人、到期日、狀態、是否顯示在 Dashboard、解決說明。Dashboard 優先顯示正式風險資料，若 v10 尚未套用或尚無資料，仍保留既有自動推導風險/待決策邏輯。
- 時程圖（Gantt）toggle 切換（總表層級，畫的是專案起訖日一條橫槓，非任務層級）
- 總表可「匯出 Excel」（CSV，Excel 可直接開，含新增的補助/請款欄位）
- 狀態顏色沿用冷媒循環溫度隱喻：預計規劃(灰)/估價中(黃銅)/進行中(冷媒藍綠)/補助申請(鋼藍)/結案(深藍綠)

### 2. 新聞蒐集
- 依關鍵字抓 Google News RSS，經 `functions/api/news.js`（Cloudflare Pages Function）→ rss2json.com 中轉（**必須**用 API key，匿名額度太低會 429/500；直接抓 Google 會被封鎖回傳 503「Sorry...」機器人偵測頁）
- 可新增/刪除關鍵字，抓到的新聞可一鍵「＋建立文案草稿」帶入標題/連結

### 3. 每週文案彙整
- 手動：依週分組顯示草稿，新增/編輯/刪除，「複製」單則或整週到剪貼簿
- **自動**（`.github/workflows/weekly-content.yml` + `scripts/generate-weekly-content.mjs`）：
  - 每週一台北時間 08:00 排程，也可在 GitHub Actions 頁面手動 "Run workflow" 測試
  - 抓新聞 → 避免重複（比對 source_note）→ Claude Haiku 生成文案 → 寫入 `marketing_content_drafts`，**狀態強制為「草稿」，絕不自動發布**
  - 文案要求：行銷總監視角、面向專業空調技師（非一般消費者）、專業精準不浮誇、換行分段＋適度專業 icon（⚙️❄️📊 類，非誇張表情符號）＋文末 3-5 個 hashtag、禁止 markdown 語法
  - 提示詞內建真實產品資訊（`PRODUCT_REFERENCE`，取自 www.mcttw.com.tw：MagBoost Apex/MagBoost/變頻直驅/AirBoost MAG 各系列規格），**只能引用真實規格，不可捏造**；曾在測試中出現「Modbus」被幻覺成「Mod875」，人工審核時要特別注意技術名詞
  - 若產品線異動，`PRODUCT_REFERENCE` 需同步更新，否則文案會用到過時資訊

### 4. 成功案例（新）
- 原廠案例照片的處理流程：**不走自動化 API**，直接把照片貼到 Claude Code 對話裡，由 Claude 讀圖翻譯（簡體→繁體＋台灣業界用語）＋整理重點，再用 Canva MCP（已連結美昇品牌套件）產出設計
- 整理完的資訊存入「成功案例」專區：標題／案場／產品型號／案例摘要／成效數字／標籤／封面照片（Supabase Storage）／Canva 設計連結
- `core/api.js` 新增 storage 輔助函式：`uploadStorageFile`、`getSignedUrl`、`deleteStorageFile`、`storageSafeFileName`

## 視覺設計
- 全站重新設計過，脫離制式 AI 儀表板樣板：Big Shoulders Display（工業感標題字體）+ IBM Plex Sans/Mono（內文/數據），冷媒藍綠＋黃銅＋鋼藍的工程儀表色系，取代預設 blue/navy SaaS 樣板
- 官方 logo（`assets/logo.png`）用於登入頁（原色）與側邊欄（filter 反白）
- 有響應式設計（手機版側邊欄變橫向 tab bar、表單單欄化）

## Schema 版本（依序在 Supabase SQL Editor 執行）
1. `schema.sql`：`marketing_campaigns`、`marketing_content_drafts` 基礎表
2. `schema_v2_news.sql`：`marketing_news_keywords`
3. `schema_v3_fields.sql`：`owner`、`owner_unit`
4. `schema_v4_vendors.sql`：`vendors` jsonb（取代單一 vendor 欄位）
5. `schema_v5_subsidy.sql`：`subsidy_planned`、`subsidy_received`
6. `schema_v6_status.sql`：狀態改 5 種（含資料轉換＋新 check constraint，**已修正為可安全重跑**）
7. `schema_v7_case_studies.sql`：`marketing_case_studies` 表 + `case-study-photos` storage bucket（**已修正為可安全重跑**）
8. `schema_v8_tasks_budget.sql`：`marketing_campaigns` 新增 `midea_budget_code`／`payment_status`／`claim_status`／`flight_cost`；新表 `marketing_campaign_tasks`（任務/里程碑）、`marketing_campaign_budget_items`（預算明細）— **已執行成功**
9. `schema_v9_documents.sql`：新表 `marketing_campaign_documents` + `campaign-documents` storage bucket，用於行銷案詳情頁文件附件（報價單、攤位設計圖、大會文件、廠商資料）。2026-07-10 已在正式 Supabase project 驗證可用。
10. `schema_v10_risks.sql`：新表 `marketing_campaign_risks`，用於正式追蹤行銷案風險與待決事項（預算、時程、廠商、原廠、素材、業務配合、補助請款等）。2026-07-10 已在正式 Supabase project 驗證可用（REST smoke test 建立/讀取/刪除成功）。

⚠️ v1~v10 全部已在正式 Supabase project 執行過並驗證成功。

## 已知決策與限制
- 2026-07-10 Codex 已完成 Google Sheet 細項匯入：`商業週刊` 與 `遠見雜誌` 兩個分頁合併寫入既有行銷案 `B2B預熱行銷規劃`；其餘分頁分別寫入 `7/31台北市冷凍空調公會`、`高雄市冷凍空調技師公會講座`、`11月重慶訪廠`、`12月感恩餐會`。讀回驗證結果：共 41 筆任務、23 筆預算明細；各案預算明細台幣合計分別為 B2B 1,359,500、台北公會 285,000、高雄公會 150,000、11月重慶 600,000、12月感恩餐會 300,000。
- 本次匯入腳本保留於 `scripts/import-campaign-details.mjs`，預設 dry-run；如需重跑，使用 authenticated 帳密或 service role key 執行 `node scripts/import-campaign-details.mjs --apply`，會先清除這些行銷案既有任務/預算明細再重新匯入，避免重複資料。
- 2026-07-10 Codex 已執行 `scripts/seed-exhibition-oct2026.mjs --apply`，補齊既有「10月空調展」行銷案：開國報價 6 類預算彙總、7 筆關鍵任務/里程碑、vendors 加入「開國有限公司」、上傳 4 份文件附件（開國報價單、攤位設計 v1/v2、大會參展申請表）。第一次上傳因 Supabase Storage object key 含中文被拒絕，已修正腳本改用 ASCII 安全檔名後重跑成功。讀回驗證：任務 7 筆、預算明細 6 筆、預算合計 NTD 1,371,867、文件 4 筆。
- **不做 Google Sheet 自動匯出**（尚未串接，需要 Google Sheets API service account 憑證，使用者尚未提供）
- 文案自動生成**已改為使用者同意接受小額 Anthropic API 費用**（Claude Haiku，估計月費台幣幾十元等級），前提是「一律進草稿、絕不自動發布」的規則不可放寬
- 每週文案排程若跑到「文章重複」會跳過該關鍵字，不會硬產出重複內容
- 「10月空調展」等既有行銷案資料是從 Google Sheet《美昇舒適｜2026年行銷計畫預算進度管理表》匯入 14 筆＋更新 1 筆，匯入時上半年活動的「實際花費」照抄 sheet，下半年活動因為 sheet 備註寫「尚未執行」所以刻意留空未匯入實際花費/已核發補助

## 下一步待辦
- [x] 把原始 Google Sheet《美昇舒適｜2026年行銷計畫預算進度管理表》裡各專案分頁（商業週刊/遠見雜誌/0731台北技師公會/08高雄技師公會/11重慶訪廠/12感恩餐會）的「執行項目與進度」「預算明細」實際資料，寫入對應行銷案的「任務與里程碑」「預算明細」區塊（2026-07-10 Codex 完成）
- [ ] 使用者實際使用「成功案例」功能：貼原廠照片進 Claude 對話 → 翻譯整理 → Canva 出圖 → 存入案例庫
- [ ] 觀察每週自動文案品質，特別留意技術名詞是否被 AI 幻覺（例如 Modbus 曾被誤寫成 Mod875）
- [ ] 若要做 Google Sheet 自動匯出，需要使用者提供 Google Cloud service account 憑證
- [ ] 「預計規劃」「補助申請」兩個新狀態目前尚無真實資料落在裡面，待使用者實際分類既有/新增行銷案
- [x] 套用 `schema_v9_documents.sql` 到正式 Supabase project，啟用行銷案文件附件資料表與 storage bucket
- [x] 執行 `scripts/seed-exhibition-oct2026.mjs --apply`，把「10月空調展」預算、任務、廠商、附件寫入既有行銷案
- [x] 套用 `schema_v10_risks.sql` 到正式 Supabase project，啟用風險與待決事項正式資料表

## 未解決問題
- Supabase MCP 仍對 project `apgrclmrkarxlajmhnpa` 無操作權限；若未來需要資料庫操作，可使用 authenticated 帳密或 service role key 走本機腳本。
