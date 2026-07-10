// Import WBS tasks and budget items from the 2026 marketing plan Google Sheet.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-campaign-details.mjs --apply
// or:
//   SUPABASE_URL=... SUPABASE_AUTH_EMAIL=... SUPABASE_AUTH_PASSWORD=... node scripts/import-campaign-details.mjs --apply
//
// Without --apply this runs as a dry-run and prints the matched campaigns.

import fs from 'node:fs';

const apply = process.argv.includes('--apply');
const SB = process.env.SUPABASE_URL || readConfigConst('SB');
const ANON_KEY = readConfigConst('KEY');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SB) fail('Missing SUPABASE_URL and core/config.js SB');

const SOURCE = [
  {
    tab: '商業週刊',
    aliases: ['商業週刊', '商周', 'B2B預熱行銷規劃'],
    tasks: [
      task(1, '確認合約、媒體窗口與整體 KPI', 46164, 46164, null, '已完成', 20, '核定合約與專案時程'),
      task(2, '採訪大綱、案例與高階受訪者確認', 46183, 46192, null, '進行中', 0, '採訪題綱與素材清單'),
      task(3, '平面廣編採訪與撰稿', 46188, 46203, null, '未開始', 0, '平面初稿', '6/17 10:00\n6/22 15:00\n6/30 10:30'),
      task(4, '平面設計、校稿與送印', 46204, 46213, null, '未開始', 0, '完稿與刊登確認'),
      task(5, '商周平面露出', 46219, 46219, null, '未開始', 0, '紙本曝光與業務背書素材', '實際刊期待媒體確認'),
      task(6, '數位頁面、Banner、社群與追蹤設定', 46279, 46304, null, '未開始', 0, '上線素材、UTM 與名單機制', '美昇自有官網'),
      task(7, '商周線上露出與展會導流', 46307, 46326, null, '未開始', 0, '網站／社群曝光與 Leads'),
      task(8, '影片腳本、場景與拍攝規劃', 46314, 46332, null, '未開始', 0, '腳本與拍攝表'),
      task(9, '影片拍攝、後製與審稿', 46335, 46367, null, '未開始', 0, '主影片與短版素材'),
      task(10, '年底影片露出與成效彙整', 46370, 46387, null, '未開始', 0, '影片曝光與結案報告'),
    ],
    budgets: [
      budget(1, '9月平面廣編露出', '已知總額內管理配置', 350000, 5, 70000, '含採訪、撰稿、設計與刊登；非 PDF 正式拆價', '待拆價'),
      budget(2, '10月數位露出與導流', '已知總額內管理配置', 320000, 5, 64000, '官網／Banner／社群推播與追蹤；非 PDF 正式拆價', '待拆價'),
      budget(3, '年底影片製作與露出', '已知總額內管理配置', 250000, 5, 50000, '腳本、拍攝、後製與露出；非 PDF 正式拆價', '待拆價'),
    ],
  },
  {
    tab: '遠見雜誌',
    aliases: ['遠見雜誌', '遠見', 'B2B預熱行銷規劃'],
    tasks: [
      task(1, '確認版位、刊期與合約', 46188, 46199, null, '進行中', 20, '刊期與合作確認'),
      task(2, '採訪主題、案例與素材彙整', 46202, 46213, null, '未開始', 0, '採訪大綱與素材包'),
      task(3, '採訪、撰稿與內容審核', 46216, 46227, null, '未開始', 0, '廣編文章初稿'),
      task(4, '跨頁設計、校稿與完稿', 46230, 46241, null, '未開始', 0, '2 頁全彩跨頁完稿'),
      task(5, '8月平面出刊與業務素材轉用', 46242, 46265, null, '未開始', 0, '平面曝光與電子版業務素材', '實際刊期待媒體確認'),
    ],
    budgets: [
      budget(1, '遠見雜誌 2 頁全彩跨頁廣編', '已知', 439500, 5, 87900, 'PDF 明列之專案預算', '已知'),
    ],
  },
  {
    tab: '0731台北技師公會',
    aliases: ['0731台北技師公會', '7/31台北市冷凍空調公會', '7/31 台北', '台北市冷凍空調技師公會', '台北技師公會'],
    tasks: [
      task(1, '確認方案 A、付款與權益清單', 46188, 46192, null, '已完成', 20, '確認 30 分鐘演講、主桌、手冊與數位權益'),
      task(2, '確認原廠講者與演講主題', 46188, 46199, null, '進行中', 10, '講者、題目與技術內容框架'),
      task(3, '演講簡報、數據與案例製作', 46202, 46220, null, '未開始', 0, '30 分鐘簡報與講稿', '內容以技術與案例為主'),
      task(4, '大會手冊封面廣告與 Logo 完稿', 46202, 46213, null, '未開始', 0, '印刷完稿'),
      task(5, '晚宴名單、座位與接待流程', 46209, 46227, null, '未開始', 0, '10 位晚宴名單與接待表'),
      task(6, '現場文宣、名單蒐集與業務分工', 46216, 46231, null, '未開始', 0, '物料、QR 表單與跟進責任表'),
      task(7, '會員大會、講座與交流晚宴執行', 46234, 46234, null, '未開始', 0, '演講、曝光、交流與 Leads'),
      task(8, '名單整理、業務跟進與成效報告', 46237, 46248, null, '未開始', 0, 'Leads 清單、跟進紀錄與結案'),
    ],
    budgets: [
      budget(1, '方案 A：30 分鐘專題演講組贊助費', '已知', 285000, 5, 57000, '含雙主桌、晚宴 10 位、手冊封面、Logo、官網一年與 LINE@ 推播', '已知'),
    ],
  },
  {
    tab: '08高雄技師公會',
    aliases: ['08高雄技師公會', '8月高雄', '高雄市冷凍空調技師公會', '高雄技師公會'],
    tasks: [
      task(1, '確認活動日期、人數、場地與贊助方案', 46188, 46220, null, '待確認', 0, '正式活動資訊與報價'),
      task(2, '確定講者、主題與內容架構', 46216, 46227, null, '未開始', 0, '講題與講者確認'),
      task(3, '簡報、案例、邀請與宣傳素材', 46230, 46248, null, '未開始', 0, '簡報與活動素材'),
      task(4, '設備、物料、交通與現場流程確認', 46244, 46253, null, '未開始', 0, '執行清單'),
      task(5, '高雄技師公會講座執行（暫定）', 46255, 46255, null, '待確認', 0, '講座、交流與 Leads', '日期為管理用暫定值'),
      task(6, '名單整理、業務跟進與結案', 46258, 46269, null, '未開始', 0, 'Leads 與結案報告'),
    ],
    budgets: [
      budget(1, '公會贊助／場地與基本權益', '估算', 80000, 5, 16000, '待取得正式活動方案', '待報價'),
      budget(2, '講者交通與接待', '估算', 20000, 5, 4000, '依講者出發地與住宿需求調整', '待報價'),
      budget(3, '簡報、印刷與宣傳物料', '估算', 20000, 5, 4000, '含手冊、背板或現場文宣', '待報價'),
      budget(4, '影音／展示設備與現場支援', '估算', 20000, 5, 4000, '依場地既有設備調整', '待報價'),
      budget(5, '預備金', '估算', 10000, 5, 2000, '約基準預算 7%', '待核定'),
    ],
  },
  {
    tab: '11重慶訪廠',
    aliases: ['11月重慶訪廠', '11重慶訪廠', '重慶訪廠'],
    tasks: [
      task(1, '確認邀請對象、商務目的與預計人數', 46279, 46290, null, '未開始', 0, '優先邀請名單與目標專案'),
      task(2, '與重慶工廠確認檔期、參訪內容與接待', 46286, 46297, null, '未開始', 0, '工廠議程與接待窗口'),
      task(3, '邀請、報名、證件與旅遊文件確認', 46300, 46318, null, '未開始', 0, '正式團員名單與文件'),
      task(4, '機票、住宿、交通與保險採購', 46307, 46325, null, '未開始', 0, '完成訂位與付款'),
      task(5, '重慶訪廠執行（暫定）', 46327, 46330, null, '待確認', 0, '工廠參訪、技術交流與商務會議'),
    ],
    budgets: [
      budget(1, '台灣往返機票', '估算', 240000, 5, 48000, '8 人 × 平均 TWD 30,000', '待報價'),
      budget(2, '住宿', '估算', 120000, 5, 24000, '8 人 × 4 晚 × 平均 TWD 3,750', '待報價'),
      budget(3, '當地交通與接駁', '估算', 60000, 5, 12000, '機場、飯店、工廠與商務行程', '待報價'),
      budget(4, '餐敘與接待', '估算', 60000, 5, 12000, '團員餐費與商務接待', '待報價'),
      budget(5, '保險、證件與行政', '估算', 20000, 5, 4000, '依團員實際需求調整', '待報價'),
      budget(6, '手冊、禮品與會議物料', '估算', 30000, 5, 6000, '參訪手冊與商務禮品', '待報價'),
      budget(7, '票價與行程變動預備金', '估算', 70000, 5, 14000, '因應航班與人數變動', '待核定'),
    ],
  },
  {
    tab: '12感恩餐會',
    aliases: ['12感恩餐會', '感恩餐會'],
    tasks: [
      task(1, '確認活動目標、日期、規模與賓客類型', 46314, 46325, null, '未開始', 0, '活動 brief 與預算級距'),
      task(2, '場地詢價、勘場與簽約', 46321, 46339, null, '未開始', 0, '場地與餐飲合約'),
      task(3, '邀請名單、邀請函與 RSVP', 46335, 46360, null, '未開始', 0, '賓客名單與出席回覆'),
      task(4, '流程、主持、舞台影音與年度內容', 46342, 46367, null, '未開始', 0, '流程表、簡報與影片'),
      task(5, '禮品、桌卡、背板與現場物料', 46349, 46367, null, '未開始', 0, '活動物料完成'),
      task(6, '感恩餐會執行（暫定）', 46374, 46374, null, '待確認', 0, '餐會、交流與關係維繫'),
      task(7, '照片、感謝訊息與年度結案', 46377, 46387, null, '未開始', 0, '活動紀錄與後續聯繫'),
    ],
    budgets: [
      budget(1, '場地與餐飲', '估算', 100000, 5, 20000, '暫以 100 人規模估算', '待報價'),
      budget(2, '舞台、燈光、音響與主持', '估算', 70000, 5, 14000, '依場地設備與節目需求調整', '待報價'),
      budget(3, '設計、邀請函、背板與印刷', '估算', 30000, 5, 6000, '含線上邀請與現場識別', '待報價'),
      budget(4, '伴手禮／抽獎禮品', '估算', 50000, 5, 10000, '依賓客數與禮品級距調整', '待報價'),
      budget(5, '攝影與活動紀錄', '估算', 25000, 5, 5000, '平面攝影或精簡動態紀錄', '待報價'),
      budget(6, '預備金', '估算', 25000, 5, 5000, '因應人數與流程變更', '待核定'),
    ],
  },
];

main().catch((err) => fail(err.message || String(err)));

async function main() {
  const token = SERVICE_KEY || await signIn();
  const campaigns = await sb('GET', 'marketing_campaigns?select=id,name,status,budget&order=name.asc', null, token);
  const matches = SOURCE.map((src) => ({ src, campaign: findCampaign(campaigns, src) }));

  console.log('Campaign matches:');
  for (const { src, campaign } of matches) {
    console.log(`- ${src.tab}: ${campaign.name} (${campaign.id}) / ${src.tasks.length} tasks, ${src.budgets.length} budget items`);
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to replace existing task/budget detail rows.');
    return;
  }

  for (const { campaign } of matches) {
    await sb('DELETE', `marketing_campaign_tasks?campaign_id=eq.${campaign.id}`, null, token, false);
    await sb('DELETE', `marketing_campaign_budget_items?campaign_id=eq.${campaign.id}`, null, token, false);
  }

  const taskRows = matches.flatMap(({ src, campaign }) => src.tasks.map((row) => ({ ...row, campaign_id: campaign.id })));
  const budgetRows = matches.flatMap(({ src, campaign }) => src.budgets.map((row) => ({ ...row, campaign_id: campaign.id })));

  await sb('POST', 'marketing_campaign_tasks', taskRows, token);
  await sb('POST', 'marketing_campaign_budget_items', budgetRows, token);

  const campaignIds = matches.map(({ campaign }) => campaign.id).join(',');
  const importedTasks = await sb('GET', `marketing_campaign_tasks?select=campaign_id&id=not.is.null&campaign_id=in.(${campaignIds})`, null, token);
  const importedBudgets = await sb('GET', `marketing_campaign_budget_items?select=campaign_id&id=not.is.null&campaign_id=in.(${campaignIds})`, null, token);
  console.log(`\nImported ${importedTasks.length} tasks and ${importedBudgets.length} budget items.`);
}

async function signIn() {
  const email = process.env.SUPABASE_AUTH_EMAIL;
  const password = process.env.SUPABASE_AUTH_PASSWORD;
  if (!email || !password) {
    fail('Missing credentials. Set SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_AUTH_EMAIL and SUPABASE_AUTH_PASSWORD.');
  }
  const res = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
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

function findCampaign(campaigns, source) {
  const candidates = campaigns
    .map((campaign) => ({
      campaign,
      score: source.aliases.reduce((score, alias) => score + (campaign.name.includes(alias) ? alias.length : 0), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    fail(`No campaign matched sheet tab "${source.tab}". Existing names:\n${campaigns.map((c) => `- ${c.name}`).join('\n')}`);
  }
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
    fail(`Ambiguous campaign match for "${source.tab}": ${candidates.map((c) => c.campaign.name).join(', ')}`);
  }
  return candidates[0].campaign;
}

function task(seq, task_name, plannedStart, plannedEnd, owner, status, completion_pct, expected_output, notes = null) {
  return {
    seq,
    task_name,
    planned_start: excelDate(plannedStart),
    planned_end: excelDate(plannedEnd),
    owner,
    status,
    completion_pct,
    expected_output,
    notes,
  };
}

function budget(seq, item_name, budget_nature, amount_twd, exchange_rate, amount_rmb, basis_note, quote_status) {
  return { seq, item_name, budget_nature, amount_twd, exchange_rate, amount_rmb, basis_note, quote_status };
}

function excelDate(serial) {
  if (!serial) return null;
  return new Date(Date.UTC(1899, 11, 30) + serial * 86400000).toISOString().slice(0, 10);
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
