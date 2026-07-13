// 每週文案自動草稿：抓新聞 → Claude 生成草稿 → 寫入 marketing_content_drafts（狀態固定為「草稿」）
// 由 .github/workflows/weekly-content.yml 排程執行，也可手動觸發測試

import { generateWeeklyContent } from './weekly-content-core.mjs';

const SB = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RSS2JSON_KEY = process.env.RSS2JSON_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

generateWeeklyContent({
  supabaseUrl: SB,
  serviceKey: SERVICE_KEY,
  rss2jsonKey: RSS2JSON_KEY,
  anthropicKey: ANTHROPIC_KEY
}).then(result => {
  result.logs.forEach(log => {
    if (log.status === 'created') console.log(`已建立草稿：${log.title}`);
    else console.log(`「${log.keyword}」${log.status}${log.message ? `：${log.message}` : ''}`);
  });
  console.log(`本次共建立 ${result.created} 則草稿（週別 ${result.week}）`);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
