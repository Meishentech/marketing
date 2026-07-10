// Seed "10月空調展" campaign detail: categorized budget items (from Kaigo quotation TIW-001-M),
// tasks/milestones, vendor, and document uploads (quotation, booth design v1/v2, exhibitor form).
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-exhibition-oct2026.mjs --apply
// or:
//   SUPABASE_AUTH_EMAIL=... SUPABASE_AUTH_PASSWORD=... node scripts/seed-exhibition-oct2026.mjs --apply
//
// Requires schema_v9_documents.sql to have been run first (marketing_campaign_documents table + bucket).
// Without --apply this runs as a dry-run and only prints the matched campaign.

import fs from 'node:fs';

const apply = process.argv.includes('--apply');
const SB = process.env.SUPABASE_URL || readConfigConst('SB');
const ANON_KEY = readConfigConst('KEY');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SB) fail('Missing SUPABASE_URL and core/config.js SB');

const ALIASES = ['10月空調展', '空調展', '國際冷凍空調綠能科技展'];
const VENDOR_NAME = '開國有限公司';

const BUDGET_ITEMS = [
  budget(1, '木作工程', '已知', 803600, null, null, '木作加高地板、儲藏室、形象看板、跨拱、會議室隔間、開放式會談區、造型服務台/展示台（開國設計報價單項1-8）', '待簽回'),
  budget(2, '展示輸出與 LOGO', '已知', 94400, null, null, 'LOGO珍珠板裁型、PVC輸出裱珍珠板、全區PVC割字、會議室掛畫、LOGO燈殼字（項9-13）', '待簽回'),
  budget(3, '燈光工程', '已知', 117800, null, null, 'LED投射燈、COB白光燈、日光燈、貼片燈3米/5米（項14-18）', '待簽回'),
  budget(4, '電力與展示設備', '已知', 250740, null, null, '插座、LED電視75吋/60吋、攤位搭建拆除與運輸清運（項19,30-32）', '待簽回'),
  budget(5, '租賃家具與雜項', '已知', 40000, null, null, '會議桌椅、會談桌椅、高腳椅、抱枕椅墊、垃圾桶、掛衣架、置物層架、冷熱飲水機（項20-29）', '待簽回'),
  budget(6, '稅金（5%）', '已知', 65327, null, null, '報價單稅金', '待簽回'),
];

const TASKS = [
  task(1, '大會參展申請表送件', '2026-06-26', '2026-06-26', null, '已完成', 100, '參展申請表', '南港展覽館2館一樓 Q909'),
  task(2, '開國設計報價單確認回簽', '2026-07-01', '2026-07-10', null, '待確認', 0, '報價單簽回', '報價有效期至 2026/7/10 止，逾期需重新報價'),
  task(3, '攤位設計圖確認（v2 0709）', '2026-07-01', '2026-07-15', null, '進行中', 50, '定稿設計圖'),
  task(4, '訂金支付（80%）', '2026-08-01', '2026-08-30', null, '未開始', 0, 'NT$1,097,494 支票', '票期 115/08/30'),
  task(5, '尾款支付（20%）', '2026-09-15', '2026-10-09', null, '未開始', 0, 'NT$274,373 支票', '票期 115/10/09，早於展期，需與開國核對付款順序'),
  task(6, '展覽執行', '2026-10-20', '2026-10-22', null, '未開始', 0, '現場執行與名單蒐集', '南港展覽館2館一樓 Q909'),
  task(7, '展後成效彙整與結案', '2026-10-23', '2026-11-05', null, '未開始', 0, 'Leads 清單與結案報告'),
];

const DOCUMENTS = [
  {
    file: '/Users/yikaihuang/Desktop/2026.10.20空調展/開國設計/2026國際冷凍空調綠能科技展Q909美昇報價單.pdf',
    doc_type: '報價單',
    title: '開國設計報價單 TIW-001-M',
    version_note: '2026/6/26',
    contentType: 'application/pdf',
  },
  {
    file: '/Users/yikaihuang/Desktop/2026.10.20空調展/開國設計/2026國際冷凍空調綠能科技展Q909美昇攤位設計_v1_0629.pdf',
    doc_type: '攤位設計圖',
    title: '攤位設計（開國設計）',
    version_note: 'v1 0629',
    contentType: 'application/pdf',
  },
  {
    file: '/Users/yikaihuang/Desktop/2026.10.20空調展/開國設計/2026國際冷凍空調綠能科技展Q909美昇攤位設計_v2_0709.pdf',
    doc_type: '攤位設計圖',
    title: '攤位設計（開國設計）',
    version_note: 'v2 0709',
    contentType: 'application/pdf',
  },
  {
    file: '/Users/yikaihuang/Desktop/2026.10.20空調展/大會資料/綠能科技展參展申請表_2026.6.26',
    doc_type: '大會文件',
    title: '綠能科技展參展申請表',
    version_note: '2026/6/26',
    contentType: 'application/pdf',
  },
];

main().catch((err) => fail(err.message || String(err)));

async function main() {
  const token = SERVICE_KEY || await signIn();
  const campaigns = await sb('GET', 'marketing_campaigns?select=id,name,vendors', null, token);
  const campaign = findCampaign(campaigns);

  console.log(`Matched campaign: ${campaign.name} (${campaign.id})`);
  console.log(`Will insert ${BUDGET_ITEMS.length} budget items, ${TASKS.length} tasks, ${DOCUMENTS.length} documents, vendor "${VENDOR_NAME}"`);

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to write.');
    return;
  }

  await sb('DELETE', `marketing_campaign_tasks?campaign_id=eq.${campaign.id}`, null, token, false);
  await sb('DELETE', `marketing_campaign_budget_items?campaign_id=eq.${campaign.id}`, null, token, false);
  await sb('DELETE', `marketing_campaign_documents?campaign_id=eq.${campaign.id}`, null, token, false);

  await sb('POST', 'marketing_campaign_tasks', TASKS.map((t) => ({ ...t, campaign_id: campaign.id })), token);
  await sb('POST', 'marketing_campaign_budget_items', BUDGET_ITEMS.map((b) => ({ ...b, campaign_id: campaign.id })), token);

  const vendors = new Set(campaign.vendors || []);
  vendors.add(VENDOR_NAME);
  await sb('PATCH', `marketing_campaigns?id=eq.${campaign.id}`, { vendors: [...vendors] }, token, false);

  for (const doc of DOCUMENTS) {
    const filePath = await uploadFile(doc.file, doc.contentType, token);
    await sb('POST', 'marketing_campaign_documents', [{
      campaign_id: campaign.id,
      doc_type: doc.doc_type,
      title: doc.title,
      version_note: doc.version_note,
      file_path: filePath,
      file_name: doc.file.split('/').pop(),
    }], token, false);
    console.log(`Uploaded: ${doc.title} (${doc.version_note}) -> ${filePath}`);
  }

  console.log('\nDone.');
}

async function uploadFile(localPath, contentType, token) {
  const buf = fs.readFileSync(localPath);
  const base = localPath.split('/').pop().replace(/[^a-zA-Z0-9_.-]/g, '_');
  const path = `${Date.now()}_${base}`;
  const res = await fetch(`${SB}/storage/v1/object/campaign-documents/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY || ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buf,
  });
  if (!res.ok) throw new Error(`Storage upload failed for ${localPath}: ${res.status} ${await res.text()}`);
  return path;
}

async function signIn() {
  const email = process.env.SUPABASE_AUTH_EMAIL;
  const password = process.env.SUPABASE_AUTH_PASSWORD;
  if (!email || !password) {
    fail('Missing credentials. Set SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_AUTH_EMAIL and SUPABASE_AUTH_PASSWORD.');
  }
  const res = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) fail(`Supabase sign-in failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function sb(method, path, body, token, parseJson = true) {
  const res = await fetch(`${SB}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY || ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path} failed: ${res.status} ${await res.text()}`);
  if (!parseJson || res.status === 204) return null;
  return res.json();
}

function findCampaign(campaigns) {
  const candidates = campaigns
    .map((campaign) => ({
      campaign,
      score: ALIASES.reduce((score, alias) => score + (campaign.name.includes(alias) ? alias.length : 0), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    fail(`No campaign matched aliases [${ALIASES.join(', ')}]. Existing names:\n${campaigns.map((c) => `- ${c.name}`).join('\n')}`);
  }
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
    fail(`Ambiguous campaign match: ${candidates.map((c) => c.campaign.name).join(', ')}`);
  }
  return candidates[0].campaign;
}

function task(seq, task_name, plannedStart, plannedEnd, owner, status, completion_pct, expected_output, notes = null) {
  return { seq, task_name, planned_start: plannedStart, planned_end: plannedEnd, owner, status, completion_pct, expected_output, notes };
}

function budget(seq, item_name, budget_nature, amount_twd, exchange_rate, amount_rmb, basis_note, quote_status) {
  return { seq, item_name, budget_nature, amount_twd, exchange_rate, amount_rmb, basis_note, quote_status };
}

function readConfigConst(name) {
  try {
    const config = fs.readFileSync(new URL('../core/config.js', import.meta.url), 'utf8');
    return config.match(new RegExp(`const ${name} = '([^']+)'`))?.[1] || '';
  } catch {
    return '';
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
