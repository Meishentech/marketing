import { scanAllActiveProjects } from './tender-monitor-core.mjs';

async function main() {
  const results = await scanAllActiveProjects({
    supabaseUrl: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    resendApiKey: process.env.RESEND_API_KEY,
    notificationFrom: process.env.TENDER_NOTIFICATION_FROM,
    notificationTo: process.env.TENDER_NOTIFICATION_TO
  });

  for (const r of results) {
    console.log(`project=${r.projectId} checked=${r.checkedPages} found=${r.foundCount} new=${r.newCount}`);
  }
  console.log(`投標工具掃描完成，共 ${results.length} 個專案`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
