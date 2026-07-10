# 2026/10 空調展資料匯入執行說明

更新日期：2026-07-10

## 目前狀態

已完成：

- `schema_v9_documents.sql`：行銷案文件附件表 + `campaign-documents` storage bucket
- `scripts/seed-exhibition-oct2026.mjs`：將資料寫入既有「10月空調展」行銷案
- 前端 `app.js` / `index.html` 已有文件附件、任務、預算明細區塊
- `node --check scripts/seed-exhibition-oct2026.mjs` 已通過
- 已正式執行 `node scripts/seed-exhibition-oct2026.mjs --apply`
- 已讀回驗證：任務 7 筆、預算 6 筆、文件 4 筆、預算合計 NTD 1,371,867

注意事項：

- Supabase MCP 對 project `apgrclmrkarxlajmhnpa` 仍無操作權限
- 日後若要重跑，可使用 service role key 或 authenticated 帳密
- 第一次上傳曾因中文 Storage object key 被拒絕，seed 腳本已改成 ASCII 安全檔名

## 日後重跑路徑 A：Supabase Dashboard

1. 打開 Supabase project `apgrclmrkarxlajmhnpa`
2. 到 SQL Editor
3. 若尚未執行過，貼上並執行 `schema_v9_documents.sql`
4. 回到本機，提供 service role key 後執行 seed：

```bash
cd /Users/yikaihuang/Desktop/meisheng-marketing
SUPABASE_SERVICE_ROLE_KEY='你的 service role key' node scripts/seed-exhibition-oct2026.mjs --apply
```

## 日後重跑路徑 B：使用登入帳密

若不提供 service role key，也可用已建立的 authenticated 帳號：

```bash
cd /Users/yikaihuang/Desktop/meisheng-marketing
SUPABASE_AUTH_EMAIL='test@mcttw.com.tw' SUPABASE_AUTH_PASSWORD='密碼' node scripts/seed-exhibition-oct2026.mjs --apply
```

前提：`schema_v9_documents.sql` 已先執行成功，且帳號有權限操作 `marketing_campaign_documents` 與 `campaign-documents` bucket。

## 匯入內容

seed 腳本會尋找名稱包含以下關鍵字的既有行銷案：

- `10月空調展`
- `空調展`
- `國際冷凍空調綠能科技展`

找到後會寫入：

- 6 筆預算彙總，總額 NTD 1,371,867
- 7 筆任務與里程碑
- `vendors` 加入 `開國有限公司`
- 4 份文件附件：
  - 開國設計報價單 TIW-001-M
  - 攤位設計 v1 0629
  - 攤位設計 v2 0709
  - 綠能科技展參展申請表

腳本會先刪除該 campaign 既有任務、預算明細、文件附件紀錄，再重新寫入，避免重複資料。
