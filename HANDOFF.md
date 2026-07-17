# 美昇舒適科技行銷平台 · 工作交接紀錄

## 最後更新
- 日期：2026-07-17
- 執行裝置：M1（Claude Code / Codex）

## 部署與帳號資訊
- GitHub：https://github.com/Meishentech/marketing
- Cloudflare Pages：https://marketing-a4l.pages.dev（push 到 main 自動部署）
- Supabase project：`apgrclmrkarxlajmhnpa`（獨立帳號，非 WOWCasa 的 AICasa 組織，Claude 端 Supabase MCP 無法直接操作，schema 變更需請使用者手動在 Dashboard SQL Editor 執行）
- 登入測試帳號：test@mcttw.com.tw
- Cloudflare Pages 環境變數：`RSS2JSON_API_KEY`（新聞蒐集用）
- GitHub Secrets（供每週自動文案排程用）：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`RSS2JSON_API_KEY`、`ANTHROPIC_API_KEY`
- 新增使用者預設密碼：`123456`；v13 起新使用者首次登入會被要求變更密碼。

## 功能總覽（截至本次）

### 1. 行銷案管理
- 總表顯示專案名稱／執行狀態／**重要性**／預算，**自動依狀態分組排序**（預計規劃→估價中→進行中→補助申請→結案），同狀態內再依**重要性**（高→中→低）排序，重要性相同時依建立時間新到舊。重要性可在詳情頁「編輯」表單修改（高/中/低，預設中）
- 點擊進入詳情頁：專案說明／專案時間（預計+實際）／專案預算（含美的預計補助、已核發補助）／負責人／負責單位（主要配合單位，可＋新增）／負責公司（外包，可複數）／**補助與請款狀態**（美的預算編號、付款狀態、請款狀態、機票費用）／備註
- **任務與里程碑**（子表 `marketing_campaign_tasks`）：詳情頁內可新增/編輯/刪除，含序號、任務名稱、負責人、預計時程、狀態（未開始/進行中/已完成/待確認）、完成率%，對應原本 Google Sheet 每個專案分頁裡的「執行項目與進度」WBS
- **Google Calendar 連結**：任務列表與任務編輯視窗可一鍵開啟 Google Calendar 預填事件（標題、日期、描述），由使用者在 Google Calendar 內確認新增；目前不是 OAuth 自動同步，不保存 Google token。事件只使用任務「預計完成」日期，固定建立台北時間 10:00-11:00，避免多個任務佔滿整天行事曆。
- **預算明細**（子表 `marketing_campaign_budget_items`）：詳情頁內可新增/編輯/刪除，逐項費用含台幣/RMB雙幣別、匯率、預算性質、報價狀態，自動加總合計，對應原本 Google Sheet 的「預算明細」表格
- **風險與待決事項**（子表 `marketing_campaign_risks`）：詳情頁內可新增/編輯/刪除，含類型、事項描述、影響程度、負責人、到期日、狀態、是否顯示在 Dashboard、解決說明。Dashboard 優先顯示正式風險資料，若 v10 尚未套用或尚無資料，仍保留既有自動推導風險/待決策邏輯。
- **待決事項追蹤紀錄**（子表 `marketing_campaign_risk_updates`）：點開待決事項後可新增追蹤紀錄，含更新內容、更新人、更新日期、下次追蹤日、重要標記。待決事項列表與 Dashboard 會顯示最近更新／下次追蹤／追蹤逾期狀態。
- **Dashboard 快速處理**：首頁「追蹤節奏」清單的待決事項可直接點「處理」，新增追蹤紀錄、設定下次追蹤日、調整狀態、填寫結案說明並刷新 Dashboard，不必先進專案詳情頁。
- **專案週報**：行銷案詳情頁可點「產生週報」，自動整理專案狀態、本週追蹤更新、未解決待決事項、任務進度、預算/補助、下週追蹤重點與高影響風險，並可一鍵複製成文字。
- 時程圖（Gantt）toggle 切換（總表層級，畫的是專案起訖日一條橫槓，非任務層級）
- 總表可「匯出 Excel」（CSV，Excel 可直接開，含新增的補助/請款欄位）
- 狀態顏色沿用冷媒循環溫度隱喻：預計規劃(灰)/估價中(黃銅)/進行中(冷媒藍綠)/補助申請(鋼藍)/結案(深藍綠)

### 2. 行銷成效查詢
- 新增獨立頁面「成效查詢」，不再塞進首頁 Dashboard，避免首頁資訊過載。
- 每個行銷案可維護一筆成效資料：觸及人數、名單數、詢問數、有效商機數、預估商機金額、成交件數、成交金額、備註。
- 頁面自動彙總總觸及、總名單、總有效商機、總成交金額，並依行銷案預算估算每名單成本與每有效商機成本，供總經理/行銷端快速比較活動效率。

### 3. 行銷資源庫
- 新增獨立頁面「行銷資源庫」，集中管理簡報、DM、型錄、技術文章、期刊投稿、展場素材、社群文案、圖片影片、案例與其他素材。
- 每筆資源可記錄產品線、適用對象、版本、資源連結、Canva 連結、是否可對外使用、標籤、備註與主要檔案（PDF、PPT、圖片、DM、型錄等）。
- 已支援資源名稱/產品線/標籤/備註關鍵字搜尋、類型篩選、適用對象篩選、對外/內部篩選，以及最近更新/類型/產品線/名稱排序。
- 已支援檔案上傳/下載，使用 Supabase Storage bucket `marketing-resource-files`；上傳檔案大小上限 200MB。
- 新增「對外素材」快速頁，只顯示 `is_external_usable = true` 的資源，供業務快速查詢與下載可提供客戶的素材。
- 業務只需要查行銷相關資料時，可從此頁快速找到可對外提供的素材，不混入業務自己的商機管理平台。
- 2026-07-17 起，資源庫管理改由 v2 逐步接手。v1 已停用 `marketing_resources` 真刪除，避免觸發 v2 知識庫關聯表 `product_knowledge_resource_links` 的 `on delete cascade`。v1 資源列表、Dashboard 可用素材與對外素材頁會排除 `deleted_at is not null` 的 v2 已封存資源。

### 4. Dashboard
- 首頁已精簡成四塊：進行中專案、待決事項、近期成效、可用素材更新。
- 預算分類、Top 5、詳細風險/時程等資訊改回各功能頁查詢，避免首頁過載。

### 5. 公會管理
- 新增主選單「公會管理」，第一階段以實際後台資料管理為主，不做行銷 landing page。
- 頁面包含：公會總覽、年費與續會、期刊資料準備排程、會員大會 / 協辦活動、權益與備註。
- 公會總覽會彙總加入狀態、本年度年費狀態、年費到期日、最近期刊截稿日、下一場活動、未使用權益數、內部負責人與最後更新時間。
- 狀態標籤包含：年費即將到期、期刊截稿將至、活動準備中、權益尚未使用、資料待補。
- 初始 seed 會建立四筆公會：全國聯合會、台北市冷凍空調技師公會、台灣省冷凍空調技師公會、台中市冷凍空調技師公會。未知欄位先留空或標示待補。
- 第一階段附件欄位先以「附件連結、檔名或存放位置」文字欄位保留，尚未接 Supabase Storage 檔案上傳。

### 6. 新聞蒐集
- 依關鍵字抓 Google News RSS，經 `functions/api/news.js`（Cloudflare Pages Function）→ rss2json.com 中轉（**必須**用 API key，匿名額度太低會 429/500；直接抓 Google 會被封鎖回傳 503「Sorry...」機器人偵測頁）
- 可新增/刪除關鍵字，抓到的新聞可一鍵「＋建立文案草稿」帶入標題/連結

### 7. 每週文案彙整
- 手動：依週分組顯示草稿，新增/編輯/刪除，「複製」單則或整週到剪貼簿
- **自動**（`.github/workflows/weekly-content.yml` + `scripts/generate-weekly-content.mjs`）：
  - 每週一台北時間 08:00 排程，也可在 GitHub Actions 頁面手動 "Run workflow" 測試
  - 抓新聞 → 避免重複（比對 source_note）→ Claude Haiku 生成文案 → 寫入 `marketing_content_drafts`，**狀態強制為「草稿」，絕不自動發布**
  - 文案要求：行銷總監視角、面向專業空調技師（非一般消費者）、專業精準不浮誇、換行分段＋適度專業 icon（⚙️❄️📊 類，非誇張表情符號）＋文末 3-5 個 hashtag、禁止 markdown 語法
  - 提示詞內建真實產品資訊（`PRODUCT_REFERENCE`，取自 www.mcttw.com.tw：MagBoost Apex/MagBoost/變頻直驅/AirBoost MAG 各系列規格），**只能引用真實規格，不可捏造**；曾在測試中出現「Modbus」被幻覺成「Mod875」，人工審核時要特別注意技術名詞
  - 若產品線異動，`PRODUCT_REFERENCE` 需同步更新，否則文案會用到過時資訊

### 8. 成功案例（新）
- 原廠案例照片的處理流程：**不走自動化 API**，直接把照片貼到 Claude Code 對話裡，由 Claude 讀圖翻譯（簡體→繁體＋台灣業界用語）＋整理重點，再用 Canva MCP（已連結美昇品牌套件）產出設計
- 整理完的資訊存入「成功案例」專區：標題／案場／產品型號／案例摘要／成效數字／標籤／封面照片（Supabase Storage）／Canva 設計連結
- 成功案例列表與編輯視窗已支援登入後下載封面圖片，讓業務可自行查詢並下載案例素材。
- `core/api.js` 新增 storage 輔助函式：`uploadStorageFile`、`getSignedUrl`、`deleteStorageFile`、`storageSafeFileName`

### 9. 帳號與密碼
- 登入頁新增「忘記密碼」，使用 Supabase Auth recovery email 流程，使用者可自行設定新密碼。
- `app_user_access` 權限表記錄允許登入名單、是否啟用、是否必須首次登入改密碼。前端登入後會查此表；若 `must_change_password = true`，會先要求設定新密碼，完成後才進平台。
- 2026-07-11 已用 Supabase public signup API 建立 8 位新增使用者 Auth 帳號：`kevin@mcttw.com.tw`、`lungbin5412@mcttw.com.tw`、`c1994915@mcttw.com.tw`、`eric@mcttw.com.tw`、`vincent@mcttw.com.tw`、`hill22518@mcttw.com.tw`、`info@mcttw.com.tw`、`hansLee0408@mcttw.com.tw`，預設密碼均為 `123456`。

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
11. `schema_v11_risk_updates.sql`：新表 `marketing_campaign_risk_updates`，用於記錄待決事項的每次追蹤更新、下次追蹤日與重要標記。2026-07-11 已由使用者在正式 Supabase project 執行完成。
12. `schema_v12_performance_resources.sql`：新表 `marketing_campaign_performance`（行銷案成效）與 `marketing_resources`（行銷資源庫）。2026-07-11 已在正式 Supabase project 驗證可用（REST smoke test 建立/讀取/刪除成功）。
13. `schema_v13_user_access.sql`：新表 `app_user_access`，用於平台允許登入名單與首次登入強制改密碼旗標。2026-07-11 已在正式 Supabase project 驗證可用（測試帳號登入後可讀取自身權限列，`is_active = true`、`must_change_password = false`）。
14. `schema_v14_resource_files.sql`：`marketing_resources` 新增 `file_path`／`file_name`／`file_size`，並建立 private Storage bucket `marketing-resource-files`，用於行銷資源庫檔案上傳/下載。2026-07-11 已在正式 Supabase project 驗證可用（Storage 上傳/簽名下載/刪除 + REST 建立/讀取/刪除成功）。
15. `schema_v15_priority.sql`：`marketing_campaigns` 新增 `priority`（高/中/低，預設「中」），用於行銷案總表排序。**尚未套用到正式 Supabase project**，需使用者手動到 Dashboard SQL Editor 執行。
16. `schema_v16_resource_file_size_limit.sql`：將 `marketing-resource-files` Storage bucket 單檔上限提高到 200MB，避免大型 PPT/PDF 上傳時出現 413 Payload too large。**已新增檔案，尚待在正式 Supabase SQL Editor 執行並驗證。**
17. `schema_v17_associations.sql`：新增公會管理資料表 `associations`、`association_fee_records`、`association_benefits`、`association_publication_schedules`、`association_events`，並 seed 四筆初始公會。**已新增檔案，尚待在正式 Supabase SQL Editor 執行並驗證。**

⚠️ v1~v14 已在正式 Supabase project 執行；v15、v16、v17 待套用。

## 已知決策與限制
- 2026-07-10 Codex 已完成 Google Sheet 細項匯入：`商業週刊` 與 `遠見雜誌` 兩個分頁合併寫入既有行銷案 `B2B預熱行銷規劃`；其餘分頁分別寫入 `7/31台北市冷凍空調公會`、`高雄市冷凍空調技師公會講座`、`11月重慶訪廠`、`12月感恩餐會`。讀回驗證結果：共 41 筆任務、23 筆預算明細；各案預算明細台幣合計分別為 B2B 1,359,500、台北公會 285,000、高雄公會 150,000、11月重慶 600,000、12月感恩餐會 300,000。
- 本次匯入腳本保留於 `scripts/import-campaign-details.mjs`，預設 dry-run；如需重跑，使用 authenticated 帳密或 service role key 執行 `node scripts/import-campaign-details.mjs --apply`，會先清除這些行銷案既有任務/預算明細再重新匯入，避免重複資料。
- 2026-07-10 Codex 已執行 `scripts/seed-exhibition-oct2026.mjs --apply`，補齊既有「10月空調展」行銷案：開國報價 6 類預算彙總、7 筆關鍵任務/里程碑、vendors 加入「開國有限公司」、上傳 4 份文件附件（開國報價單、攤位設計 v1/v2、大會參展申請表）。第一次上傳因 Supabase Storage object key 含中文被拒絕，已修正腳本改用 ASCII 安全檔名後重跑成功。讀回驗證：任務 7 筆、預算明細 6 筆、預算合計 NTD 1,371,867、文件 4 筆。
- **不做 Google Sheet 自動匯出**（尚未串接，需要 Google Sheets API service account 憑證，使用者尚未提供）
- 文案自動生成**已改為使用者同意接受小額 Anthropic API 費用**（Claude Haiku，估計月費台幣幾十元等級），前提是「一律進草稿、絕不自動發布」的規則不可放寬
- 每週文案排程若跑到「文章重複」會跳過該關鍵字，不會硬產出重複內容
- 「10月空調展」等既有行銷案資料是從 Google Sheet《美昇舒適｜2026年行銷計畫預算進度管理表》匯入 14 筆＋更新 1 筆，匯入時上半年活動的「實際花費」照抄 sheet，下半年活動因為 sheet 備註寫「尚未執行」所以刻意留空未匯入實際花費/已核發補助

## 下一步待辦
- [ ] 套用 `schema_v15_priority.sql` 到正式 Supabase project，啟用行銷案「重要性」欄位與排序（欄位未建立前，前端仍可正常運作，但寫入 priority 會被資料庫拒絕，讀取則會拿到 undefined 並在前端當作預設「中」處理）
- [x] 把原始 Google Sheet《美昇舒適｜2026年行銷計畫預算進度管理表》裡各專案分頁（商業週刊/遠見雜誌/0731台北技師公會/08高雄技師公會/11重慶訪廠/12感恩餐會）的「執行項目與進度」「預算明細」實際資料，寫入對應行銷案的「任務與里程碑」「預算明細」區塊（2026-07-10 Codex 完成）
- [ ] 使用者實際使用「成功案例」功能：貼原廠照片進 Claude 對話 → 翻譯整理 → Canva 出圖 → 存入案例庫
- [ ] 觀察每週自動文案品質，特別留意技術名詞是否被 AI 幻覺（例如 Modbus 曾被誤寫成 Mod875）
- [ ] 若要做 Google Sheet 自動匯出，需要使用者提供 Google Cloud service account 憑證
- [ ] 「預計規劃」「補助申請」兩個新狀態目前尚無真實資料落在裡面，待使用者實際分類既有/新增行銷案
- [x] 套用 `schema_v9_documents.sql` 到正式 Supabase project，啟用行銷案文件附件資料表與 storage bucket
- [x] 執行 `scripts/seed-exhibition-oct2026.mjs --apply`，把「10月空調展」預算、任務、廠商、附件寫入既有行銷案
- [x] 套用 `schema_v10_risks.sql` 到正式 Supabase project，啟用風險與待決事項正式資料表
- [x] 套用 `schema_v11_risk_updates.sql` 到正式 Supabase project，啟用待決事項追蹤紀錄資料表
- [x] 套用 `schema_v12_performance_resources.sql` 到正式 Supabase project，啟用行銷成效與行銷資源庫資料表，並用 REST smoke test 建立/讀取/刪除驗證
- [x] 套用 `schema_v13_user_access.sql` 到正式 Supabase project，啟用平台權限名單與首次登入強制改密碼
- [x] 套用 `schema_v14_resource_files.sql` 到正式 Supabase project，啟用行銷資源庫檔案上傳/下載
- [ ] 套用 `schema_v16_resource_file_size_limit.sql` 到正式 Supabase project，把行銷資源庫單檔上傳上限提高到 200MB
- [ ] 套用 `schema_v17_associations.sql` 到正式 Supabase project，啟用公會管理第一階段並建立四筆初始公會
- [x] 完成 8 位新增 Auth 使用者建立，預設密碼均為 `123456`

## 未解決問題
- Supabase MCP 仍對 project `apgrclmrkarxlajmhnpa` 無操作權限；若未來需要資料庫操作，可使用 authenticated 帳密或 service role key 走本機腳本。
