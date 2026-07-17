// ── 共用 helper ──
const esc = s => (s ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => n == null || n === '' ? '-' : Number(n).toLocaleString('zh-TW');
const fd  = s => s ? s.slice(5).replace('-', '/') : '';
const fdFull = s => s ? s.replace(/-/g, '/') : '未填';
const todayISO = () => new Date().toISOString().slice(0, 10);
const safeDownloadName = (name, ext = 'png') => `${(name || 'download').replace(/[\\/:*?"<>|]+/g, '_')}.${ext}`;
function fmtTaipeiDateTime(s){
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '-';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(d).map(p => [p.type, p.value]));
  return `${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

// 狀態沿用冷媒循環的溫度隱喻：預計規劃＝尚未升溫（灰），估價中＝尚未啟動（黃銅），進行中＝正在冷卻（冷媒藍綠），補助申請＝行政作業（鋼藍），結案＝完全冷卻（深藍綠）
const STATUS_ORDER = ['預計規劃', '估價中', '進行中', '補助申請', '結案'];
const STATUS_HEX   = { '預計規劃': '#7C8B94', '估價中': '#B97A3D', '進行中': '#0E7C86', '補助申請': '#5B7FA6', '結案': '#0B4F55' };
const STATUS_CLASS = { '預計規劃': 'plan',    '估價中': 'brass',   '進行中': 'teal',    '補助申請': 'grant',   '結案': 'deep' };
const PRIORITY_ORDER = ['高', '中', '低'];
const PRIORITY_CLASS = { '高': 'pri-high', '中': 'pri-mid', '低': 'pri-low' };
const RESOURCE_TYPES = ['簡報', 'DM', '型錄', '技術文章', '期刊投稿', '展場素材', '社群文案', '圖片影片', '案例', '其他'];
const ASSOC_MATERIALS = ['公司介紹', '產品圖片', '文案', 'Logo', '案例', '廣告圖', 'DM', '簡報', '名片', '禮品', '產品資料', '展示品'];
const ASSOC_TYPE_OPTIONS = ['全國聯合會', '地方公會', '技師公會', '其他'];
const ASSOC_JOIN_STATUS_OPTIONS = ['已加入', '待確認', '待續會', '停止'];
const ASSOC_FEE_STATUS_OPTIONS = ['未繳', '已繳', '待確認', '不適用'];
const ASSOC_BENEFIT_TYPE_OPTIONS = ['期刊曝光', '活動參與', '協辦活動', '會員名錄', '課程講座', '其他'];
const ASSOC_USAGE_STATUS_OPTIONS = ['未使用', '準備中', '已使用', '不適用'];
const ASSOC_TASK_TYPE_OPTIONS = ['會員大會', '協辦活動', '技術講座', '期刊投稿', '期刊廣告', '年度贊助', '拜訪聯繫', '素材準備', '其他'];
const ASSOC_TASK_STATUS_OPTIONS = ['待確認', '未開始', '準備中', '已送審', '已完成', '取消'];
const ASSOC_EXPENSE_TYPE_OPTIONS = ['年費', '年度贊助', '活動贊助', '期刊費用', '設計製作', '印刷', '禮品', '交通餐費', '其他'];
const ASSOC_EXPENSE_STATUS_OPTIONS = ['未付款', '已付款', '待確認', '不適用'];
const ASSOC_PUBLICATION_STATUS_OPTIONS = ['未開始', '準備中', '已送審', '已送件', '已刊登'];
const ASSOC_EVENT_TYPE_OPTIONS = ['會員大會', '協辦活動', '技術講座', '展覽', '餐會', '其他'];
const ASSOC_ROLE_OPTIONS = ['會員參與', '協辦', '贊助', '講師', '展示'];
const ASSOC_EVENT_STATUS_OPTIONS = ['待確認', '準備中', '已完成', '取消'];
const CAMPAIGN_ASSOC_ACTIVITY_OPTIONS = ['會員大會', '協辦活動', '技術講座', '展覽', '餐會', '期刊投稿', '期刊廣告', '年度贊助', '其他'];
const CUSTOM_OPTION_VALUE = '__custom_option__';
const NEW_CAMPAIGN_VALUE = '__new_campaign__';
const CAMPAIGN_SORT_SQL_FILE = 'schema_v22_campaign_manual_sort.sql';
const TENDER_SQL_FILE = 'schema_v23_tender_monitor.sql';
const TENDER_FILTER_SQL_FILE = 'schema_v24_tender_scan_filters.sql';
const TENDER_ACTIVE_SQL_FILE = 'schema_v26_tender_active_search.sql';
const TENDER_STATUS_OPTIONS = ['未讀', '評估中', '已追蹤', '已排除'];
const TENDER_FILTER_MODE_OPTIONS = ['保守', '平衡', '嚴格'];
const TENDER_SCAN_CATEGORIES = [
  { id: 'bid_open', label: '招標 / 投標中' },
  { id: 'procurement', label: '採購 / 報價' },
  { id: 'deadline', label: '截止 / 開標日期' },
  { id: 'chiller', label: '冰水主機' },
  { id: 'central_ac', label: '中央空調 / 空調設備' },
  { id: 'ventilation', label: '通風設備' },
  { id: 'maglev', label: '磁浮 / 磁懸浮' },
  { id: 'exclude_closed', label: '降低決標 / 得標' },
  { id: 'exclude_residential', label: '降低家用冷氣' }
];
const DEFAULT_TENDER_SCAN_CATEGORIES = TENDER_SCAN_CATEGORIES.map(c => c.id);

function sortByStatus(list){
  return [...list].sort((a, b) => {
    const d = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (d !== 0) return d;
    const p = PRIORITY_ORDER.indexOf(a.priority || '中') - PRIORITY_ORDER.indexOf(b.priority || '中');
    return p !== 0 ? p : new Date(b.created_at) - new Date(a.created_at);
  });
}
function campaignSortRank(c, fallback){
  const n = Number(c?.sort_order);
  return Number.isFinite(n) ? n : fallback;
}
function sortCampaignsManual(list){
  return [...list].sort((a, b) => {
    const ar = campaignSortRank(a, Number.MAX_SAFE_INTEGER);
    const br = campaignSortRank(b, Number.MAX_SAFE_INTEGER);
    if (ar !== br) return ar - br;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}
function tenderSortRank(p, fallback){
  const n = Number(p?.sort_order);
  return Number.isFinite(n) ? n : fallback;
}
function sortTenderProjects(list){
  return [...list].sort((a, b) => {
    const ar = tenderSortRank(a, Number.MAX_SAFE_INTEGER);
    const br = tenderSortRank(b, Number.MAX_SAFE_INTEGER);
    if (ar !== br) return ar - br;
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });
}

let CAMPAIGNS = [];
let DRAFTS = [];
let KEYWORDS = [];
let CASES = [];
let TASKS = [];
let BUDGET_ITEMS = [];
let DOCS = [];
let RISKS = [];
let RISK_UPDATES = [];
let PERFORMANCE = [];
let RESOURCES = [];
let ASSOCIATIONS = [];
let ASSOC_FEES = [];
let ASSOC_BENEFITS = [];
let ASSOC_PUBLICATIONS = [];
let ASSOC_EVENTS = [];
let ASSOC_NOTES = [];
let ASSOC_TASKS = [];
let ASSOC_EXPENSES = [];
let TENDER_PROJECTS = [];
let TENDER_KEYWORDS = [];
let TENDER_RESULTS = [];
let TENDER_RUNS = [];
let CAMPAIGN_TASKS_ALL = [];
let CAMPAIGN_BUDGET_ITEMS_ALL = [];
let RESOURCE_FILTERS = { q: '', type: '', audience: '', external: '', sort: 'updated' };
let ASSOC_TAB = 'overview';
let _view = 'dashboard';
let _campaignView = 'list';
let editCampaignId = null;
let editDraftId = null;
let editCaseId = null;
let editTaskId = null;
let editBudgetItemId = null;
let editDocId = null;
let editRiskId = null;
let editPerformanceId = null;
let editResourceId = null;
let editAssociationId = null;
let editAssocFeeId = null;
let editAssocBenefitId = null;
let editAssocPubId = null;
let editAssocEventId = null;
let editAssocNoteId = null;
let editAssocTaskId = null;
let editAssocExpenseId = null;
let editTenderProjectId = null;
let selectedTenderProjectId = null;
let quickRiskId = null;
let editRiskUpdateId = null;
let detailCampaignId = null;
let detailCampaignCache = null;
let campaignSortColumnReady = false;
let vendorRows = [];
let pendingCoverFile = null;
let currentCoverPath = null;
let pendingDocFile = null;
let currentDocPath = null;
let currentDocFileName = null;
let pendingResourceFile = null;
let currentResourceFilePath = null;
let currentResourceFileName = null;
let currentResourceFileSize = null;

// ── NAV ──
async function nav(view){
  _view = view;
  document.querySelectorAll('.ni').forEach(el => el.classList.toggle('on', el.dataset.view === view));
  if (view === 'dashboard') await renderDashboard();
  else if (view === 'campaigns') await renderCampaignsPage();
  else if (view === 'subsidies') await renderSubsidiesPage();
  else if (view === 'tenders') await renderTendersPage();
  else if (view === 'drafts') await renderDraftsPage();
  else if (view === 'news') await renderNewsPage();
  else if (view === 'cases') await renderCasesPage();
  else if (view === 'performance') await renderPerformancePage();
  else if (view === 'resources') await renderResourcesPage();
  else if (view === 'externalResources') await renderExternalResourcesPage();
  else if (view === 'associations') await renderAssociationsPage();
}

function tag(status){
  const cls = STATUS_CLASS[status] || 'muted';
  return `<span class="tag tag-${cls}">${esc(status)}</span>`;
}

function priorityTag(priority){
  const v = priority || '中';
  const cls = PRIORITY_CLASS[v] || 'pri-mid';
  return `<span class="tag tag-${cls}">${esc(v)}</span>`;
}

async function safeGET(path){
  try { return await GET(path) || []; }
  catch (e) {
    console.warn(`GET ${path} failed`, e);
    return [];
  }
}

function dval(s){
  return s ? new Date(`${s}T00:00:00`) : null;
}

function startOfToday(){
  return dval(todayISO());
}

function daysUntil(s){
  const d = dval(s);
  if (!d) return null;
  const today = startOfToday();
  return Math.ceil((d - today) / 86400000);
}

function inNextDays(s, days = 30){
  const n = daysUntil(s);
  return n != null && n >= 0 && n <= days;
}

function isPast(s){
  const n = daysUntil(s);
  return n != null && n < 0;
}

function campaignWindow(c){
  const start = c.actual_start || c.planned_start;
  const end = c.actual_end || c.planned_end || start;
  return { start, end };
}

function campaignCategory(c){
  const text = `${c.name || ''} ${c.purpose || ''} ${c.notes || ''}`;
  if (/展|展會|空調展/.test(text)) return '展會';
  if (/商周|商業週刊|遠見|媒體|廣編|B2B/.test(text)) return '媒體曝光';
  if (/公會|講座|技師/.test(text)) return '公會活動';
  if (/訪廠|重慶/.test(text)) return '訪廠／差旅';
  if (/餐會|感恩|客戶/.test(text)) return '客戶關係';
  if (/官網|網站|數位/.test(text)) return '官網／數位';
  if (/Logo|CI|DM|名片|設計|印製|期刊/.test(text)) return '素材製作';
  return '其他';
}

function riskReasons(c, tasks = [], budgetItems = []){
  const reasons = [];
  const spend = Number(c.actual_spend) || 0;
  const budget = Number(c.budget) || 0;
  const { end } = campaignWindow(c);
  const openTasks = tasks.filter(t => t.campaign_id === c.id && t.status !== '已完成');
  const overdueTasks = openTasks.filter(t => isPast(t.planned_end || t.planned_start));
  const pendingTasks = openTasks.filter(t => t.status === '待確認');
  const pendingQuotes = budgetItems.filter(b => b.campaign_id === c.id && /待|估算/.test(`${b.quote_status || ''}${b.budget_nature || ''}`));

  if (budget && spend > budget) reasons.push(`預算超支 NT$ ${fmt(spend - budget)}`);
  if (overdueTasks.length) reasons.push(`${overdueTasks.length} 項任務逾期`);
  if (pendingTasks.length) reasons.push(`${pendingTasks.length} 項任務待確認`);
  if (pendingQuotes.length) reasons.push(`${pendingQuotes.length} 項預算仍待報價/核定`);
  if (end && isPast(end) && c.status !== '結案') reasons.push('專案時程已過但尚未結案');
  if (c.status === '補助申請' || /待|未/.test(`${c.claim_status || ''}${c.payment_status || ''}`)) reasons.push('補助或請款需追蹤');
  if (!c.owner && c.status !== '結案') reasons.push('尚未指定負責人');
  return reasons;
}

function decisionReasons(c, tasks = [], budgetItems = []){
  const reasons = [];
  const { start } = campaignWindow(c);
  const pendingQuotes = budgetItems.filter(b => b.campaign_id === c.id && /待報價|待核定|待拆價|估算/.test(`${b.quote_status || ''}${b.budget_nature || ''}`));
  const pendingTasks = tasks.filter(t => t.campaign_id === c.id && t.status === '待確認');

  if (c.status === '估價中') reasons.push('預算/報價待核定');
  if (pendingQuotes.length) reasons.push(`${pendingQuotes.length} 項費用待核定`);
  if (pendingTasks.length) reasons.push(`${pendingTasks.length} 項任務待確認`);
  if (start && inNextDays(start, 30) && c.status === '預計規劃') reasons.push('30 天內啟動，需確認是否執行');
  if (c.status === '補助申請' || /待|未/.test(`${c.claim_status || ''}`)) reasons.push('補助請款需決策/追蹤');
  return reasons;
}

function riskStatusTag(status){
  const cls = { '待處理': 'brass', '處理中': 'teal', '已解決': 'deep', '暫緩': 'muted' }[status] || 'muted';
  return `<span class="tag tag-${cls}">${esc(status)}</span>`;
}

function riskImpactTag(level){
  const cls = { '低': 'muted', '中': 'brass', '高': 'grant' }[level] || 'muted';
  return `<span class="tag tag-${cls}">${esc(level)}</span>`;
}

function openDashboardRisks(risks){
  return risks.filter(r => r.show_on_dashboard !== false && r.status !== '已解決');
}

function latestRiskUpdate(riskId, updates = RISK_UPDATES){
  return updates
    .filter(u => u.risk_id === riskId)
    .sort((a, b) => (dval(b.update_date) || new Date(b.created_at || 0)) - (dval(a.update_date) || new Date(a.created_at || 0)))[0] || null;
}

function riskFollowupLabel(risk, latest){
  if (risk.status === '已解決') return '已解決';
  const next = latest?.next_followup_date;
  if (next && dval(next) < startOfToday()) return `追蹤逾期 ${fdFull(next)}`;
  if (next) return `下次追蹤 ${fdFull(next)}`;
  if (latest?.update_date) return `最近更新 ${fdFull(latest.update_date)}`;
  return '尚無更新紀錄';
}

function riskNeedsUpdate(risk, latest){
  if (risk.status === '已解決') return false;
  if (!latest) return true;
  if (latest.next_followup_date && dval(latest.next_followup_date) < startOfToday()) return true;
  const last = dval(latest.update_date);
  return !!last && (startOfToday() - last) > 7 * 24 * 60 * 60 * 1000;
}

function riskFollowupMeta(risk, latest){
  if (risk.status === '已解決') return { key: 'done', label: '已解決', priority: 99 };
  const today = startOfToday();
  const next = dval(latest?.next_followup_date);
  const last = dval(latest?.update_date);
  if (next && next < today) return { key: 'overdue', label: `逾期 ${fdFull(latest.next_followup_date)}`, priority: 1 };
  if (next && next.getTime() === today.getTime()) return { key: 'today', label: '今天追蹤', priority: 2 };
  if (next && next <= new Date(today.getTime() + 7 * 86400000)) return { key: 'week', label: `7天內 ${fdFull(latest.next_followup_date)}`, priority: 4 };
  if (!latest) return { key: 'no-update', label: '尚無更新', priority: 3 };
  if (last && (today - last) > 7 * 86400000) return { key: 'stale', label: `久未更新 ${fdFull(latest.update_date)}`, priority: 3 };
  return { key: 'current', label: `最近更新 ${fdFull(latest.update_date)}`, priority: 8 };
}

function campaignFiscalYear(c){
  const raw = c.actual_start || c.planned_start || c.created_at || '';
  return raw ? Number(raw.slice(0, 4)) : new Date().getFullYear();
}

function isSubsidyApplied(c){
  return !!(c.midea_budget_code || Number(c.subsidy_received) || /已|申請|送出|送件|請款|核|Debit/i.test(`${c.claim_status || ''}${c.payment_status || ''}`));
}

function subsidySummary(campaigns, year = new Date().getFullYear()){
  const rows = campaigns.filter(c => campaignFiscalYear(c) === year && (
    c.midea_budget_code || c.subsidy_planned != null || c.subsidy_received != null || c.claim_status || c.payment_status || c.status === '補助申請'
  ));
  const applied = rows.filter(isSubsidyApplied);
  const unapplied = rows.filter(c => !isSubsidyApplied(c) && Number(c.subsidy_planned));
  const planned = rows.reduce((s, c) => s + (Number(c.subsidy_planned) || 0), 0);
  const received = rows.reduce((s, c) => s + (Number(c.subsidy_received) || 0), 0);
  const appliedPlanned = applied.reduce((s, c) => s + (Number(c.subsidy_planned) || 0), 0);
  const pendingIssue = applied.reduce((s, c) => s + Math.max(0, (Number(c.subsidy_planned) || 0) - (Number(c.subsidy_received) || 0)), 0);
  const unappliedAmount = unapplied.reduce((s, c) => s + (Number(c.subsidy_planned) || 0), 0);
  return { rows, applied, unapplied, planned, received, appliedPlanned, pendingIssue, unappliedAmount };
}

function subsidyStateTag(c){
  if (Number(c.subsidy_received)) return '<span class="tag tag-deep">已核發</span>';
  if (isSubsidyApplied(c)) return '<span class="tag tag-grant">已申請</span>';
  if (Number(c.subsidy_planned)) return '<span class="tag tag-brass">尚未申請</span>';
  return '<span class="tag tag-muted">待補</span>';
}

function campaignOverviewYear(campaigns){
  const current = new Date().getFullYear();
  const years = campaigns
    .map(campaignFiscalYear)
    .filter(y => Number.isFinite(y));
  if (!years.length || years.includes(current)) return current;
  return Math.max(...years);
}

function campaignHalf(c){
  const raw = c.actual_start || c.planned_start || c.created_at || todayISO();
  const month = Number(String(raw).slice(5, 7)) || 1;
  return month <= 6 ? 'h1' : 'h2';
}

function campaignStartDate(c){
  return c.actual_start || c.planned_start || c.created_at || '';
}

function campaignBudgetItems(campaignId){
  return CAMPAIGN_BUDGET_ITEMS_ALL.filter(b => b.campaign_id === campaignId);
}

function campaignTasks(campaignId){
  return CAMPAIGN_TASKS_ALL.filter(t => t.campaign_id === campaignId);
}

function campaignPlannedBudget(c, budgetItems = campaignBudgetItems(c.id)){
  const direct = Number(c.budget) || 0;
  if (direct) return direct;
  return budgetItems.reduce((sum, item) => sum + (Number(item.amount_twd) || 0), 0);
}

function campaignBudgetAmount(c){
  return Number(c.budget) || 0;
}

function campaignEstimatedSpend(c, budgetItems = campaignBudgetItems(c.id)){
  const itemTotal = budgetItems.reduce((sum, item) => sum + (Number(item.amount_twd) || 0), 0);
  return itemTotal || campaignBudgetAmount(c);
}

function campaignProgressPct(c, tasks = campaignTasks(c.id)){
  if (tasks.length) {
    const total = tasks.reduce((sum, t) => sum + Math.max(0, Math.min(100, Number(t.completion_pct) || 0)), 0);
    return Math.round(total / tasks.length);
  }
  if (c.status === '結案') return 100;
  if (c.status === '補助申請') return 85;
  if (c.status === '進行中') return 60;
  if (c.status === '估價中') return 35;
  if (c.status === '預計規劃') return 15;
  return 30;
}

function renderCampaignProgress(pct){
  const safe = Math.max(0, Math.min(100, Number(pct) || 0));
  const cls = safe >= 100 ? ' is-done' : safe < 45 ? ' is-low' : '';
  return `<div class="progress-line"><div class="progress-bar${cls}"><i style="width:${safe}%"></i></div><span class="progress-num">${safe}%</span></div>`;
}

function campaignNextAction(c, tasks = campaignTasks(c.id), budgetItems = campaignBudgetItems(c.id)){
  const openTasks = tasks.filter(t => t.status !== '已完成');
  const overdue = openTasks.filter(t => isPast(t.planned_end || t.planned_start));
  const pending = openTasks.filter(t => t.status === '待確認');
  const pendingQuotes = budgetItems.filter(b => /待|估算/.test(`${b.quote_status || ''}${b.budget_nature || ''}`));
  const next = [...openTasks].sort((a, b) => String(a.planned_end || a.planned_start || '9999').localeCompare(String(b.planned_end || b.planned_start || '9999')))[0];
  if (overdue.length) return `${overdue.length} 項任務逾期`;
  if (pending.length) return `${pending.length} 項任務待確認`;
  if (pendingQuotes.length) return `${pendingQuotes.length} 項預算待報價/核定`;
  if (!campaignPlannedBudget(c, budgetItems)) return '預算待補';
  if (next) return `${next.task_name}｜${fdFull(next.planned_end || next.planned_start)}`;
  if (c.status !== '結案') return c.purpose || c.notes || '待補下一步';
  return '已結案';
}

function campaignPeriodSummary(campaigns, half, year){
  const rows = campaigns.filter(c => campaignFiscalYear(c) === year && campaignHalf(c) === half);
  const budget = rows.reduce((sum, c) => sum + campaignBudgetAmount(c), 0);
  const estimatedSpend = rows.reduce((sum, c) => sum + campaignEstimatedSpend(c), 0);
  const spend = rows.reduce((sum, c) => sum + (Number(c.actual_spend) || 0), 0);
  const subsidyPlanned = rows.reduce((sum, c) => sum + (Number(c.subsidy_planned) || 0), 0);
  const subsidyReceived = rows.reduce((sum, c) => sum + (Number(c.subsidy_received) || 0), 0);
  return { rows, budget, estimatedSpend, spend, subsidyPlanned, subsidyReceived };
}

function campaignSummaryBlocks(campaigns){
  const year = campaignOverviewYear(campaigns);
  const h1 = campaignPeriodSummary(campaigns, 'h1', year);
  const h2 = campaignPeriodSummary(campaigns, 'h2', year);
  const total = {
    rows: [...h1.rows, ...h2.rows],
    budget: h1.budget + h2.budget,
    estimatedSpend: h1.estimatedSpend + h2.estimatedSpend,
    spend: h1.spend + h2.spend,
    subsidyPlanned: h1.subsidyPlanned + h2.subsidyPlanned,
    subsidyReceived: h1.subsidyReceived + h2.subsidyReceived
  };
  const row = (label, summary, strong = false) => `
    <tr class="${strong ? 'campaign-summary-total' : ''}">
      <td class="tb-name">${esc(label)}</td>
      <td class="mono tb-amt">NT$ ${fmt(summary.budget)}</td>
      <td class="mono">${fmt(summary.rows.length)}</td>
      <td class="mono tb-amt">NT$ ${fmt(summary.estimatedSpend)}</td>
      <td class="mono tb-amt">NT$ ${fmt(summary.spend)}</td>
      <td class="mono tb-amt">NT$ ${fmt(summary.subsidyPlanned)}</td>
      <td class="mono tb-amt">NT$ ${fmt(summary.subsidyReceived)}</td>
    </tr>`;

  return `
    <div class="tw campaign-summary-table">
      <table>
        <thead><tr><th>期間</th><th>預算</th><th>專案數量</th><th>預估支出</th><th>總實際支出</th><th>預估補助款</th><th>實撥補助款</th></tr></thead>
        <tbody>
          ${row(`${year} 上半年`, h1)}
          ${row(`${year} 下半年`, h2)}
          ${row(`${year} 總年度`, total, true)}
        </tbody>
      </table>
    </div>`;
}

function sortCampaignsByHalfThenStart(list){
  return [...list].sort((a, b) => {
    const ay = campaignFiscalYear(a);
    const by = campaignFiscalYear(b);
    if (ay !== by) return by - ay;
    const ah = campaignHalf(a) === 'h1' ? 0 : 1;
    const bh = campaignHalf(b) === 'h1' ? 0 : 1;
    if (ah !== bh) return ah - bh;
    const ds = String(campaignStartDate(a)).localeCompare(String(campaignStartDate(b)));
    if (ds !== 0) return ds;
    return campaignSortRank(a, Number.MAX_SAFE_INTEGER) - campaignSortRank(b, Number.MAX_SAFE_INTEGER);
  });
}

// ── DASHBOARD ──
async function renderDashboard(){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  CAMPAIGNS = await GET('marketing_campaigns?order=created_at.desc') || [];
  const dashboardTasks = await GET('marketing_campaign_tasks?select=id,campaign_id,task_name,planned_start,planned_end,status,completion_pct&order=planned_end.asc') || [];
  const dashboardBudgetItems = await GET('marketing_campaign_budget_items?select=id,campaign_id,item_name,budget_nature,amount_twd,quote_status&order=seq.asc') || [];
  const dashboardRisks = await safeGET('marketing_campaign_risks?select=id,campaign_id,risk_type,title,description,impact_level,owner,due_date,status,show_on_dashboard,resolution_note&order=due_date.asc,created_at.desc');
  const dashboardRiskUpdates = await safeGET('marketing_campaign_risk_updates?select=id,risk_id,update_note,updated_by,update_date,next_followup_date,is_important,created_at&order=update_date.desc,created_at.desc');
  const dashboardPerformance = await safeGET('marketing_campaign_performance?order=updated_at.desc');
  const dashboardResources = await safeGET('marketing_resources?is_external_usable=eq.true&deleted_at=is.null&order=updated_at.desc');
  RISKS = dashboardRisks;
  RISK_UPDATES = dashboardRiskUpdates;
  const total = CAMPAIGNS.length;
  const statusCounts = STATUS_ORDER.map(s => ({ status: s, count: CAMPAIGNS.filter(c => c.status === s).length }));
  const totalBudget = CAMPAIGNS.reduce((s, c) => s + (Number(c.budget) || 0), 0);
  const totalSpend = CAMPAIGNS.reduce((s, c) => s + (Number(c.actual_spend) || 0), 0);
  const remainingBudget = Math.max(0, totalBudget - totalSpend);
  const subsidyPlanned = CAMPAIGNS.reduce((s, c) => s + (Number(c.subsidy_planned) || 0), 0);
  const subsidyReceived = CAMPAIGNS.reduce((s, c) => s + (Number(c.subsidy_received) || 0), 0);
  const subsidyRate = subsidyPlanned ? Math.round(subsidyReceived / subsidyPlanned * 100) : 0;
  const currentSubsidy = subsidySummary(CAMPAIGNS);
  const execRate = totalBudget ? Math.round(totalSpend / totalBudget * 100) : 0;

  const campaignById = Object.fromEntries(CAMPAIGNS.map(c => [c.id, c]));
  const upcomingCampaigns = CAMPAIGNS
    .map(c => ({ c, ...campaignWindow(c) }))
    .filter(x => inNextDays(x.start, 30) || inNextDays(x.end, 30))
    .sort((a, b) => (dval(a.start || a.end) || 0) - (dval(b.start || b.end) || 0))
    .slice(0, 6);
  const upcomingTasks = dashboardTasks
    .filter(t => t.status !== '已完成' && (inNextDays(t.planned_end, 30) || inNextDays(t.planned_start, 30)))
    .slice(0, 6);
  const openRisks = openDashboardRisks(dashboardRisks);
  const decisionRiskRows = openRisks
    .filter(r => r.risk_type === '補助請款' || r.impact_level === '高' || /決策|核定|確認|拍板/.test(`${r.title || ''}${r.description || ''}`))
    .map(r => ({ r, c: campaignById[r.campaign_id], latest: latestRiskUpdate(r.id, dashboardRiskUpdates) }))
    .filter(x => x.c);
  const decisions = decisionRiskRows.length ? decisionRiskRows.slice(0, 6) : CAMPAIGNS
    .map(c => ({ c, reasons: decisionReasons(c, dashboardTasks, dashboardBudgetItems) }))
    .filter(x => x.reasons.length)
    .slice(0, 6);
  const formalRiskRows = openRisks
    .map(r => ({ r, c: campaignById[r.campaign_id], latest: latestRiskUpdate(r.id, dashboardRiskUpdates) }))
    .filter(x => x.c)
    .sort((a, b) => {
      const score = x => ({ '高': 3, '中': 2, '低': 1 }[x.r.impact_level] || 0);
      const stale = x => riskNeedsUpdate(x.r, x.latest) ? 1 : 0;
      return stale(b) - stale(a) || score(b) - score(a) || (dval(a.r.due_date) || 0) - (dval(b.r.due_date) || 0);
    });
  const followupItems = formalRiskRows
    .map(x => ({ ...x, meta: riskFollowupMeta(x.r, x.latest) }))
    .filter(x => x.meta.key !== 'done')
    .sort((a, b) => {
      const impact = x => ({ '高': 3, '中': 2, '低': 1 }[x.r.impact_level] || 0);
      const nextA = dval(a.latest?.next_followup_date) || dval(a.r.due_date) || new Date(8640000000000000);
      const nextB = dval(b.latest?.next_followup_date) || dval(b.r.due_date) || new Date(8640000000000000);
      return a.meta.priority - b.meta.priority || nextA - nextB || impact(b) - impact(a);
    });
  const todayFollowups = followupItems.filter(x => x.meta.key === 'today').length;
  const overdueFollowups = followupItems.filter(x => ['overdue', 'no-update', 'stale'].includes(x.meta.key)).length;
  const highOpenRisks = followupItems.filter(x => x.r.impact_level === '高').length;
  const risks = formalRiskRows.length ? formalRiskRows.slice(0, 6) : CAMPAIGNS
    .map(c => ({ c, reasons: riskReasons(c, dashboardTasks, dashboardBudgetItems) }))
    .filter(x => x.reasons.length)
    .sort((a, b) => b.reasons.length - a.reasons.length)
    .slice(0, 6);
  const focusProjects = [...CAMPAIGNS]
    .filter(c => c.status !== '結案')
    .sort((a, b) => {
      const ar = riskReasons(a, dashboardTasks, dashboardBudgetItems).length;
      const br = riskReasons(b, dashboardTasks, dashboardBudgetItems).length;
      if (br !== ar) return br - ar;
      return (Number(b.budget) || 0) - (Number(a.budget) || 0);
    })
    .slice(0, 5);
  const categories = Object.entries(CAMPAIGNS.reduce((acc, c) => {
    const k = campaignCategory(c);
    acc[k] = (acc[k] || 0) + (Number(c.budget) || 0);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 7);

  const focusRows = focusProjects.map(c => `
    <div class="rowcard st-${STATUS_CLASS[c.status] || ''}" onclick="campaignDetail('${c.id}')">
      <div class="row-info"><div class="row-name">${esc(c.name)}</div></div>
      <div class="row-right">
        <div class="row-amt">NT$ ${fmt(c.budget)}</div>
        ${tag(c.status)}
      </div>
    </div>`).join('') || '<div class="empty">尚無行銷案</div>';
  const upcomingRows = [
    ...upcomingCampaigns.map(({ c, start, end }) => `
      <div class="dash-item" onclick="campaignDetail('${c.id}')">
        <div><div class="dash-item-title">${esc(c.name)}</div><div class="dash-item-sub mono">${fdFull(start)}${end && end !== start ? ' → ' + fdFull(end) : ''}</div></div>
        ${tag(c.status)}
      </div>`),
    ...upcomingTasks.map(t => {
      const c = campaignById[t.campaign_id];
      return `<div class="dash-item" onclick="campaignDetail('${t.campaign_id}')">
        <div><div class="dash-item-title">${esc(t.task_name)}</div><div class="dash-item-sub">${esc(c?.name || '')} · <span class="mono">${fdFull(t.planned_end || t.planned_start)}</span></div></div>
        ${taskStatusTag(t.status)}
      </div>`;
    })
  ].slice(0, 8).join('') || '<div class="empty">未來 30 天沒有已排定的重點活動或任務</div>';
  const decisionRows = decisions.map(({ c, reasons, r, latest }) => `
    <div class="dash-alert" onclick="campaignDetail('${c.id}')">
      <div><div class="dash-item-title">${esc(r?.title || c.name)}</div><div class="dash-item-sub">${esc(r ? `${c.name} · ${r.risk_type} · ${riskFollowupLabel(r, latest)}` : reasons.join('、'))}</div></div>
      ${r ? riskImpactTag(r.impact_level) : tag(c.status)}
    </div>`).join('') || '<div class="empty">目前沒有明確待決策項目</div>';
  const riskRows = risks.map(({ c, reasons, r, latest }) => `
    <div class="dash-alert risk" onclick="campaignDetail('${c.id}')">
      <div><div class="dash-item-title">${esc(r?.title || c.name)}</div><div class="dash-item-sub">${esc(r ? `${c.name} · ${r.risk_type} · ${riskFollowupLabel(r, latest)}` : reasons.join('、'))}</div></div>
      ${r ? riskImpactTag(r.impact_level) : `<span class="mono dash-risk-count">${reasons.length}</span>`}
    </div>`).join('') || '<div class="empty">目前沒有高風險專案</div>';
  const followupRows = followupItems.slice(0, 8).map(({ c, r, latest, meta }) => `
    <div class="follow-row ${meta.key}" onclick="campaignDetail('${c.id}')">
      <div>
        <div class="dash-item-title">${esc(r.title)}</div>
        <div class="dash-item-sub">${esc(c.name)} · ${esc(r.risk_type)} · ${esc(r.owner || '未指定')}</div>
        ${latest?.update_note ? `<div class="dash-item-sub">${esc(latest.update_note).slice(0, 56)}${latest.update_note.length > 56 ? '…' : ''}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
        <div class="follow-badge">${esc(meta.label)}</div>
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openQuickRiskModal('${r.id}')">處理</button>
      </div>
    </div>`).join('') || '<div class="empty">目前沒有需追蹤的待決事項</div>';
  const categoryRows = categories.map(([name, amount]) => {
    const pct = totalBudget ? Math.round(amount / totalBudget * 100) : 0;
    return `<div class="dash-mix-row">
      <div class="dash-mix-label">${esc(name)}<span class="mono">NT$ ${fmt(amount)}</span></div>
      <div class="kpi-bar"><i style="width:${pct}%;background:var(--teal)"></i></div>
    </div>`;
  }).join('') || '<div class="empty">尚無預算分類資料</div>';
  const activeProjectRows = CAMPAIGNS
    .filter(c => ['進行中', '估價中', '預計規劃', '補助申請'].includes(c.status))
    .slice(0, 7)
    .map(c => `<div class="dash-item" onclick="campaignDetail('${c.id}')">
      <div><div class="dash-item-title">${esc(c.name)}</div><div class="dash-item-sub">預算 NT$ ${fmt(c.budget)} · ${esc(c.owner || '未指定負責人')}</div></div>
      ${tag(c.status)}
    </div>`).join('') || '<div class="empty">目前沒有進行中專案</div>';
  const subsidyRows = currentSubsidy.rows.slice(0, 7).map(c => `
    <div class="dash-item" onclick="campaignDetail('${c.id}')">
      <div><div class="dash-item-title">${esc(c.name)}</div><div class="dash-item-sub">預估補助 NT$ ${fmt(c.subsidy_planned)} · 實際補助 NT$ ${fmt(c.subsidy_received)}${c.midea_budget_code ? ' · ' + esc(c.midea_budget_code) : ''}</div></div>
      ${subsidyStateTag(c)}
    </div>`).join('') || '<div class="empty">今年尚無補助追蹤資料</div>';
  const pendingRows = followupItems.slice(0, 7).map(({ c, r, latest, meta }) => `
    <div class="dash-item" onclick="campaignDetail('${c.id}')">
      <div><div class="dash-item-title">${esc(r.title)}</div><div class="dash-item-sub">${esc(c.name)} · ${esc(meta.label)}${latest?.update_note ? ' · ' + esc(latest.update_note).slice(0, 28) : ''}</div></div>
      ${riskImpactTag(r.impact_level)}
    </div>`).join('') || decisionRows || '<div class="empty">目前沒有待決事項</div>';
  const performanceRows = dashboardPerformance.slice(0, 7).map(p => {
    const c = campaignById[p.campaign_id];
    return `<div class="dash-item" onclick="nav('performance')">
      <div><div class="dash-item-title">${esc(c?.name || '未連結專案')}</div><div class="dash-item-sub">名單 ${fmt(p.lead_count)} · 有效商機 ${fmt(p.qualified_lead_count)} · 成交 NT$ ${fmt(p.deal_amount)}</div></div>
      <span class="case-tag">成效</span>
    </div>`;
  }).join('') || '<div class="empty">尚無近期成效資料</div>';
  const resourceRows = dashboardResources.slice(0, 7).map(r => `
    <div class="dash-item" onclick="nav('externalResources')">
      <div><div class="dash-item-title">${esc(r.title)}</div><div class="dash-item-sub">${esc(r.resource_type)} · ${esc(r.product_line || r.audience || '可對外使用')}${r.file_path ? ' · 可下載' : ''}</div></div>
      <span class="case-tag">${esc(r.resource_type)}</span>
    </div>`).join('') || '<div class="empty">尚無可對外使用素材</div>';

  document.getElementById('vc').innerHTML = `
    <div class="ph"><div><div class="pt">經營總覽</div><div class="ps">進行中專案、待決事項、近期成效與可用素材</div></div>
      <button class="btn btn-primary" onclick="openCampaignModal()">＋ 新增行銷案</button></div>
    <div class="dash-kpi-grid">
      <div class="card dash-panel">
        <div class="dash-panel-head"><div><div class="kpi-label">進行中專案</div><div class="dash-panel-title">${CAMPAIGNS.filter(c => c.status !== '結案').length} 個未結案</div></div><button class="btn btn-outline btn-sm" onclick="nav('campaigns')">查看</button></div>
        <div class="dash-list">${activeProjectRows}</div>
      </div>
      <div class="card dash-panel">
        <div class="dash-panel-head"><div><div class="kpi-label">待決事項</div><div class="dash-panel-title">${followupItems.length} 個需追蹤</div></div><span class="case-tag">${todayFollowups} 今日</span></div>
        <div class="dash-list">${pendingRows}</div>
      </div>
      <div class="card dash-panel">
        <div class="dash-panel-head"><div><div class="kpi-label">今年補助追蹤</div><div class="dash-panel-title">已核發 NT$ ${fmt(currentSubsidy.received)}</div></div><button class="btn btn-outline btn-sm" onclick="nav('subsidies')">查看</button></div>
        <div class="dash-list">${subsidyRows}</div>
      </div>
      <div class="card dash-panel">
        <div class="dash-panel-head"><div><div class="kpi-label">近期成效</div><div class="dash-panel-title">${dashboardPerformance.length} 筆成效紀錄</div></div><button class="btn btn-outline btn-sm" onclick="nav('performance')">查看</button></div>
        <div class="dash-list">${performanceRows}</div>
      </div>
      <div class="card dash-panel">
        <div class="dash-panel-head"><div><div class="kpi-label">可用素材更新</div><div class="dash-panel-title">${dashboardResources.length} 個可對外素材</div></div><button class="btn btn-outline btn-sm" onclick="nav('externalResources')">查看</button></div>
        <div class="dash-list">${resourceRows}</div>
      </div>
    </div>`;
}

// ── SUBSIDIES：補助管理 ──
async function renderSubsidiesPage(){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  const data = await GET('marketing_campaigns?order=created_at.desc') || [];
  CAMPAIGNS = sortByStatus(data || []);
  const year = new Date().getFullYear();
  const summary = subsidySummary(CAMPAIGNS, year);
  const rows = summary.rows.map(c => {
    const internal = Number(c.budget) || 0;
    const actual = Number(c.actual_spend) || 0;
    const planned = Number(c.subsidy_planned) || 0;
    const received = Number(c.subsidy_received) || 0;
    const variance = received - planned;
    return `<tr onclick="campaignDetail('${c.id}')">
      <td><div class="cell-main clamp2">${esc(c.name)}</div><div class="cell-sub">${esc(c.owner || '未指定')}｜${fdFull((c.planned_start || c.actual_start || c.created_at || '').slice(0, 10))}</div></td>
      <td class="status-col">${subsidyStateTag(c)}<div class="cell-sub clip">${esc(c.midea_budget_code || '尚無申請號碼')}</div></td>
      <td class="money-col"><div class="mono">NT$ ${fmt(planned)}</div><div class="cell-sub">預估補助</div></td>
      <td class="money-col"><div class="mono">NT$ ${fmt(received)}</div><div class="cell-sub">實際補助</div></td>
      <td class="money-col"><div class="mono">NT$ ${fmt(internal)}</div><div class="cell-sub">內部預估</div></td>
      <td class="money-col"><div class="mono">NT$ ${fmt(actual)}</div><div class="cell-sub">實際產生</div></td>
      <td><div class="cell-main mono" style="color:${variance < 0 ? 'var(--rust)' : 'var(--teal-deep)'}">NT$ ${fmt(variance)}</div><div class="cell-sub clamp2">${esc(c.claim_status || c.payment_status || '-')}</div></td>
    </tr>`;
  }).join('');

  document.getElementById('vc').innerHTML = `
    <div class="ph">
      <div><div class="pt">補助管理</div><div class="ps">${year} 年美的補助申請、核發與尚未申請統整</div></div>
      <button class="btn btn-primary" onclick="openCampaignModal()">＋ 新增行銷案</button>
    </div>
    <div class="dash-kpi-grid">
      <div class="stat-box"><div class="kpi-label">實際申請補助專案</div><div class="stat-num mono">${summary.applied.length}</div></div>
      <div class="stat-box"><div class="kpi-label">預估補助金額</div><div class="stat-num mono">NT$ ${fmt(summary.planned)}</div></div>
      <div class="stat-box"><div class="kpi-label">實際核發補助</div><div class="stat-num mono">NT$ ${fmt(summary.received)}</div></div>
      <div class="stat-box"><div class="kpi-label">已申請待核發</div><div class="stat-num mono">NT$ ${fmt(summary.pendingIssue)}</div></div>
      <div class="stat-box"><div class="kpi-label">尚未申請補助款</div><div class="stat-num mono">NT$ ${fmt(summary.unappliedAmount)}</div></div>
    </div>
    <div class="tw"><table class="assoc-table">
      <thead><tr><th>專案</th><th class="status-col">申請狀態 / 號碼</th><th class="money-col">預估補助</th><th class="money-col">實際補助</th><th class="money-col">內部預估</th><th class="money-col">實際產生</th><th>差異 / 請款狀態</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>${rows ? '' : '<div class="empty">今年尚無補助追蹤資料。請先在行銷案填寫補助欄位。</div>'}</div>`;
}

// ── CAMPAIGNS：總表 ──
async function loadCampaignsForManagement(){
  try {
    const rows = await GET('marketing_campaigns?order=sort_order.asc.nullslast,created_at.desc');
    campaignSortColumnReady = true;
    return sortCampaignsManual(rows || []);
  } catch (e) {
    campaignSortColumnReady = false;
    const rows = await GET('marketing_campaigns?order=created_at.desc');
    return sortByStatus(rows || []);
  }
}
async function renderCampaignsPage(){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  const [data, associations, tasks, budgetItems] = await Promise.all([
    loadCampaignsForManagement(),
    safeGET('associations?order=name.asc'),
    safeGET('marketing_campaign_tasks?select=id,campaign_id,seq,task_name,owner,planned_start,planned_end,status,completion_pct,expected_output,notes&order=planned_end.asc,seq.asc'),
    safeGET('marketing_campaign_budget_items?select=id,campaign_id,seq,item_name,budget_nature,amount_twd,amount_rmb,quote_status,basis_note&order=seq.asc,created_at.asc')
  ]);
  CAMPAIGNS = data || [];
  ASSOCIATIONS = associations || [];
  CAMPAIGN_TASKS_ALL = tasks || [];
  CAMPAIGN_BUDGET_ITEMS_ALL = budgetItems || [];
  _campaignView = 'list';
  _renderCampaignsBody();
}

function _renderCampaignsBody(){
  const isGantt = _campaignView === 'gantt';
  const ordered = sortCampaignsByHalfThenStart(CAMPAIGNS);
  const rows = ordered.map(c => `
    <tr onclick="campaignDetail('${c.id}')">
      <td><span class="case-tag">${campaignHalf(c) === 'h1' ? '上半年' : '下半年'}</span><div class="cell-sub mono">${fdFull(campaignStartDate(c).slice(0, 10))}</div></td>
      <td class="tb-name">${esc(c.name)}${c.association_id ? `<div class="cell-sub">${esc(assocName(c.association_id))}${c.association_activity_type ? `｜${esc(c.association_activity_type)}` : ''}</div>` : ''}</td>
      <td>${tag(c.status)}</td>
      <td>${priorityTag(c.priority)}</td>
      <td class="progress-cell">${renderCampaignProgress(campaignProgressPct(c))}</td>
      <td class="mono tb-amt">NT$ ${fmt(campaignPlannedBudget(c))}</td>
      <td><div class="cell-sub clamp2">${esc(campaignNextAction(c))}</div></td>
    </tr>`).join('');
  document.getElementById('vc').innerHTML = `
    <div class="ph">
      <div><div class="pt">行銷案管理</div><div class="ps">共 ${CAMPAIGNS.length} 筆</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="exportCampaignsCSV()">匯出 Excel</button>
        <button class="btn btn-outline btn-sm" id="btn-gantt-toggle" onclick="toggleCampaignGantt()" style="${isGantt ? 'background:var(--ink);color:#fff;border-color:var(--ink)' : ''}">時程圖</button>
        <button class="btn btn-primary" onclick="openCampaignModal()">＋ 新增行銷案</button>
      </div>
    </div>
    ${campaignSummaryBlocks(CAMPAIGNS)}
    <div id="campaign-list" style="${isGantt ? 'display:none' : ''}" class="tw">
      <table class="campaign-table">
        <thead><tr><th>期間 / 開始日</th><th>專案名稱 / 關聯公會</th><th>執行狀態</th><th>重要性</th><th>進度</th><th>預算</th><th>待處理</th></tr></thead>
        <tbody>${rows || ''}</tbody>
      </table>
      ${rows ? '' : '<div class="empty">尚無行銷案</div>'}
    </div>
    <div id="campaign-gantt" style="${isGantt ? '' : 'display:none'}"></div>`;
  if (isGantt) renderCampaignGantt();
}

async function moveCampaignSort(id, direction){
  if (!campaignSortColumnReady) {
    alert(`請先執行 ${CAMPAIGN_SORT_SQL_FILE} 啟用手動排序。`);
    return;
  }
  const ordered = sortCampaignsManual(CAMPAIGNS);
  const index = ordered.findIndex(c => c.id === id);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;
  const current = ordered[index];
  const target = ordered[targetIndex];
  const currentRank = campaignSortRank(current, (index + 1) * 1000);
  const targetRank = campaignSortRank(target, (targetIndex + 1) * 1000);
  try {
    await Promise.all([
      PATCH(`marketing_campaigns?id=eq.${current.id}`, { sort_order: targetRank, updated_at: new Date().toISOString() }),
      PATCH(`marketing_campaigns?id=eq.${target.id}`, { sort_order: currentRank, updated_at: new Date().toISOString() })
    ]);
    CAMPAIGNS = await loadCampaignsForManagement();
    _renderCampaignsBody();
  } catch (e) {
    alert(`排序儲存失敗，請先執行 ${CAMPAIGN_SORT_SQL_FILE}。`);
  }
}

function toggleCampaignGantt(){
  _campaignView = _campaignView === 'gantt' ? 'list' : 'gantt';
  _renderCampaignsBody();
}

function renderCampaignGantt(){
  const gantt = document.getElementById('campaign-gantt');
  if (!gantt) return;
  const items = CAMPAIGNS.filter(c => c.planned_start || c.actual_start);
  if (!items.length) {
    gantt.innerHTML = '<div class="empty">尚無填寫時程資料的行銷案</div>';
    return;
  }
  const allDates = items.flatMap(c => [c.planned_start, c.planned_end, c.actual_start, c.actual_end].filter(Boolean));
  const minD = new Date(allDates.reduce((a, b) => a < b ? a : b));
  const maxD = new Date(allDates.reduce((a, b) => a > b ? a : b));
  minD.setDate(1); maxD.setMonth(maxD.getMonth() + 1); maxD.setDate(0);
  const totalDays = Math.max(1, Math.round((maxD - minD) / 86400000));
  const months = []; let d = new Date(minD);
  while (d <= maxD) { months.push({ label: d.getMonth() === 0 || months.length === 0 ? `${d.getFullYear()}/${d.getMonth() + 1}` : `${d.getMonth() + 1}`, left: Math.round((d - minD) / 86400000 / totalDays * 100) }); d.setMonth(d.getMonth() + 1); }
  const pct = ds => Math.max(0, Math.min(100, Math.round((new Date(ds) - minD) / 86400000 / totalDays * 100)));
  const rows = items.map(c => {
    const s = c.actual_start || c.planned_start;
    const e = c.actual_end || c.planned_end || s;
    const left = pct(s); const w = Math.max(1, pct(e) - left);
    const color = STATUS_HEX[c.status] || '#5C6B67';
    return `<div class="gantt-row">
      <div class="gantt-name" onclick="campaignDetail('${c.id}')" title="${esc(c.name)}">${esc(c.name)}</div>
      <div class="gantt-track">
        <div class="gantt-bar mono" style="left:${left}%;width:${w}%;background:${color}">${fd(s)}${e !== s ? ` – ${fd(e)}` : ''}</div>
      </div></div>`;
  }).join('');
  const headerCols = months.map((m, i) => { const next = months[i + 1]; const w = next ? next.left - m.left : 100 - m.left; return `<div style="position:absolute;left:${m.left}%;width:${w}%;font-size:11px;color:var(--muted);overflow:hidden;white-space:nowrap" class="mono">${m.label}</div>`; }).join('');
  const legend = Object.entries(STATUS_HEX).map(([s, c]) => `<span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-block;width:9px;height:9px;background:${c}"></span>${s}</span>`).join('');
  gantt.innerHTML = `
    <div class="gantt-panel">
      <div class="gantt-hd">
        <div class="pt2">行銷案時程</div>
        <div class="gantt-legend">${legend}</div>
      </div>
      <div style="display:grid;grid-template-columns:170px 1fr;gap:10px;margin-bottom:6px"><div></div><div style="position:relative;height:16px">${headerCols}</div></div>
      ${rows}
    </div>`;
}

function taskStatusTag(status){
  const cls = { '未開始': 'muted', '進行中': 'teal', '已完成': 'deep', '待確認': 'brass' }[status] || 'muted';
  return `<span class="tag tag-${cls}">${esc(status)}</span>`;
}

function ymdCompact(s){
  return (s || '').replaceAll('-', '');
}

function googleCalendarTaskUrl(task){
  const c = detailCampaignCache;
  if (!task.planned_end) return '';
  const day = ymdCompact(task.planned_end);
  const details = [
    `專案：${c?.name || ''}`,
    `任務：${task.task_name}`,
    `負責人：${task.owner || '-'}`,
    `狀態：${task.status || '-'}`,
    `完成率：${Math.round(Number(task.completion_pct) || 0)}%`,
    `預計完成：${fdFull(task.planned_end)}`,
    task.expected_output ? `預期成果：${task.expected_output}` : '',
    task.notes ? `備註：${task.notes}` : ''
  ].filter(Boolean).join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `[美昇行銷] ${c?.name || ''}｜${task.task_name}`,
    dates: `${day}T020000Z/${day}T030000Z`,
    ctz: 'Asia/Taipei',
    details
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function renderTasksBlock(tasks){
  const rows = tasks.map(t => {
    const calendarUrl = googleCalendarTaskUrl(t);
    return `
      <tr onclick="openTaskModal('${t.id}')">
        <td class="mono" style="width:36px">${t.seq ?? ''}</td>
        <td class="tb-name">${esc(t.task_name)}</td>
        <td>${esc(t.owner || '-')}</td>
        <td class="mono" style="white-space:nowrap">${t.planned_start ? fd(t.planned_start) : '-'}${t.planned_end ? ' – ' + fd(t.planned_end) : ''}</td>
        <td>${taskStatusTag(t.status)}</td>
        <td style="min-width:100px">
          <div class="kpi-bar" style="background:var(--line)"><i style="width:${Math.min(100, Number(t.completion_pct) || 0)}%;background:var(--teal)"></i></div>
          <div class="muted-text mono" style="margin-top:3px">${Math.round(Number(t.completion_pct) || 0)}%</div>
        </td>
        <td onclick="event.stopPropagation()">${calendarUrl ? `<a href="${calendarUrl}" target="_blank" rel="noopener">加入日曆</a>` : '-'}</td>
      </tr>`;
  }).join('');
  return `
    <div class="tw">
      <table>
        <thead><tr><th>#</th><th>任務／里程碑</th><th>負責人</th><th>預計時程</th><th>狀態</th><th>完成率</th><th>日曆</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${rows ? '' : '<div class="empty">尚無任務，點擊「＋ 新增任務」開始規劃</div>'}
    </div>`;
}

function renderBudgetItemsBlock(items){
  const rows = items.map(b => `
    <tr onclick="openBudgetModal('${b.id}')">
      <td class="mono" style="width:36px">${b.seq ?? ''}</td>
      <td class="tb-name">${esc(b.item_name)}</td>
      <td>${esc(b.budget_nature || '-')}</td>
      <td class="mono tb-amt">NT$ ${fmt(b.amount_twd)}</td>
      <td class="mono tb-amt">RMB ${fmt(b.amount_rmb)}</td>
      <td>${esc(b.quote_status || '-')}</td>
    </tr>`).join('');
  const totalTwd = items.reduce((s, b) => s + (Number(b.amount_twd) || 0), 0);
  const totalRmb = items.reduce((s, b) => s + (Number(b.amount_rmb) || 0), 0);
  return `
    <div class="tw">
      <table>
        <thead><tr><th>#</th><th>費用項目</th><th>性質</th><th>台幣金額</th><th>RMB金額</th><th>報價狀態</th></tr></thead>
        <tbody>${rows}</tbody>
        ${items.length ? `<tfoot><tr><td></td><td class="tb-name">合計</td><td></td><td class="mono tb-amt">NT$ ${fmt(totalTwd)}</td><td class="mono tb-amt">RMB ${fmt(totalRmb)}</td><td></td></tr></tfoot>` : ''}
      </table>
      ${rows ? '' : '<div class="empty">尚無預算明細，點擊「＋ 新增項目」開始建立</div>'}
    </div>`;
}

function renderDocumentsBlock(docsWithUrl){
  const rows = docsWithUrl.map(({ doc: d, url }) => `
    <tr onclick="openDocModal('${d.id}')">
      <td><span class="case-tag">${esc(d.doc_type)}</span></td>
      <td class="tb-name">${esc(d.title)}${d.version_note ? `<span class="muted-text" style="margin-left:8px">${esc(d.version_note)}</span>` : ''}</td>
      <td class="mono" style="white-space:nowrap">${fd(d.uploaded_at)}</td>
      <td onclick="event.stopPropagation()">${url ? `<a href="${url}" target="_blank" rel="noopener">下載</a>` : '-'}</td>
    </tr>`).join('');
  return `
    <div class="tw">
      <table>
        <thead><tr><th>類型</th><th>文件名稱</th><th>上傳日期</th><th>檔案</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${rows ? '' : '<div class="empty">尚無文件，點擊「＋ 新增文件」上傳報價單、設計圖等附件</div>'}
    </div>`;
}

function renderRisksBlock(risks){
  const rows = risks.map(r => `
    <tr onclick="openRiskModal('${r.id}')">
      <td><span class="case-tag">${esc(r.risk_type)}</span></td>
      <td class="tb-name">${esc(r.title)}${r.description ? `<div class="muted-text" style="margin-top:4px">${esc(r.description).slice(0, 90)}${r.description.length > 90 ? '…' : ''}</div>` : ''}</td>
      <td>${riskImpactTag(r.impact_level)}</td>
      <td>${riskStatusTag(r.status)}</td>
      <td>${esc(r.owner || '-')}</td>
      <td class="mono" style="white-space:nowrap">${fdFull(r.due_date)}</td>
      <td>${esc(riskFollowupLabel(r, latestRiskUpdate(r.id)))}</td>
    </tr>`).join('');
  return `
    <div class="tw">
      <table class="risk-table">
        <thead><tr><th>類型</th><th>事項</th><th>影響</th><th>狀態</th><th>負責人</th><th>到期日</th><th>追蹤</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${rows ? '' : '<div class="empty">尚無風險或待決事項，點擊「＋ 新增事項」開始追蹤</div>'}
    </div>`;
}

function buildWeeklyReport(c){
  const budgetTotal = Number(c.budget) || 0;
  const spend = Number(c.actual_spend) || 0;
  const execRate = budgetTotal ? Math.round(spend / budgetTotal * 100) : 0;
  const totalBudgetItems = BUDGET_ITEMS.reduce((s, b) => s + (Number(b.amount_twd) || 0), 0);
  const doneTasks = TASKS.filter(t => t.status === '已完成').length;
  const openTasks = TASKS.filter(t => t.status !== '已完成');
  const overdueTasks = openTasks.filter(t => isPast(t.planned_end || t.planned_start));
  const openRisks = RISKS.filter(r => r.status !== '已解決');
  const highRisks = openRisks.filter(r => r.impact_level === '高');
  const now = startOfToday();
  const weekAgo = new Date(now.getTime() - 6 * 86400000);
  const nextWeek = new Date(now.getTime() + 7 * 86400000);
  const thisWeekUpdates = RISK_UPDATES
    .filter(u => {
      const d = dval(u.update_date);
      return d && d >= weekAgo && d <= now;
    })
    .sort((a, b) => (dval(b.update_date) || 0) - (dval(a.update_date) || 0));
  const nextFollowups = openRisks
    .map(r => ({ r, latest: latestRiskUpdate(r.id) }))
    .filter(x => {
      const d = dval(x.latest?.next_followup_date) || dval(x.r.due_date);
      return d && d <= nextWeek;
    })
    .sort((a, b) => (dval(a.latest?.next_followup_date || a.r.due_date) || 0) - (dval(b.latest?.next_followup_date || b.r.due_date) || 0));
  const riskById = Object.fromEntries(RISKS.map(r => [r.id, r]));
  const lines = [];
  lines.push(`# ${c.name}｜專案週報`);
  lines.push(`週報日期：${todayISO()}`);
  lines.push('');
  lines.push('## 1. 專案狀態');
  lines.push(`- 執行狀態：${c.status || '-'}`);
  lines.push(`- 負責人：${c.owner || '-'}`);
  lines.push(`- 預計時程：${fdFull(c.planned_start)} → ${fdFull(c.planned_end)}`);
  if (c.purpose) lines.push(`- 專案說明：${c.purpose}`);
  lines.push('');
  lines.push('## 2. 本週追蹤更新');
  if (thisWeekUpdates.length) {
    thisWeekUpdates.slice(0, 8).forEach(u => {
      const r = riskById[u.risk_id];
      lines.push(`- ${fdFull(u.update_date)}｜${r?.title || '待決事項'}：${u.update_note}${u.next_followup_date ? `（下次追蹤：${fdFull(u.next_followup_date)}）` : ''}`);
    });
  } else {
    lines.push('- 本週尚無追蹤更新');
  }
  lines.push('');
  lines.push('## 3. 未解決待決事項');
  if (openRisks.length) {
    openRisks.slice(0, 10).forEach(r => {
      const latest = latestRiskUpdate(r.id);
      lines.push(`- [${r.impact_level}/${r.status}] ${r.title}｜${r.risk_type}｜${riskFollowupLabel(r, latest)}`);
    });
  } else {
    lines.push('- 目前無未解決待決事項');
  }
  lines.push('');
  lines.push('## 4. 任務進度');
  lines.push(`- 任務完成：${doneTasks}/${TASKS.length}`);
  if (overdueTasks.length) lines.push(`- 逾期任務：${overdueTasks.length} 項`);
  openTasks.slice(0, 8).forEach(t => lines.push(`- ${t.task_name}｜${t.status}｜${t.owner || '-'}｜${fdFull(t.planned_end || t.planned_start)}`));
  if (!openTasks.length) lines.push('- 所有任務皆已完成或尚未建立任務');
  lines.push('');
  lines.push('## 5. 預算與補助');
  lines.push(`- 內部預估金額：NT$ ${fmt(budgetTotal)}`);
  lines.push(`- 實際產生金額：NT$ ${fmt(spend)}（${execRate}%）`);
  if (totalBudgetItems) lines.push(`- 預算明細合計：NT$ ${fmt(totalBudgetItems)}`);
  if (c.subsidy_planned != null || c.subsidy_received != null) lines.push(`- 美的補助：實際補助 NT$ ${fmt(c.subsidy_received)} / 預估補助 NT$ ${fmt(c.subsidy_planned)}`);
  if (c.claim_status || c.payment_status) lines.push(`- 請款/付款：${c.claim_status || '-'} / ${c.payment_status || '-'}`);
  lines.push('');
  lines.push('## 6. 下週追蹤重點');
  if (nextFollowups.length) {
    nextFollowups.slice(0, 8).forEach(({ r, latest }) => {
      lines.push(`- ${fdFull(latest?.next_followup_date || r.due_date)}｜${r.title}｜${r.owner || '未指定'}`);
    });
  } else {
    lines.push('- 暫無 7 天內到期追蹤項目');
  }
  if (highRisks.length) {
    lines.push('');
    lines.push('## 7. 高影響風險');
    highRisks.slice(0, 6).forEach(r => lines.push(`- ${r.title}｜${r.status}｜${r.owner || '未指定'}`));
  }
  return lines.join('\n');
}

function openWeeklyReport(){
  if (!detailCampaignCache) return;
  document.getElementById('wr-text').value = buildWeeklyReport(detailCampaignCache);
  openM('mweekly');
}

async function copyWeeklyReport(){
  const text = document.getElementById('wr-text').value;
  try {
    await navigator.clipboard.writeText(text);
    alert('週報已複製');
  } catch (e) {
    document.getElementById('wr-text').select();
    alert('已選取週報文字，請手動複製');
  }
}

// ── CAMPAIGNS：詳情頁 ──
async function campaignDetail(id){
  detailCampaignId = id;
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  let c = CAMPAIGNS.find(x => x.id === id);
  if (!c) { const r = await GET(`marketing_campaigns?id=eq.${id}`); c = r?.[0]; }
  if (!c) { document.getElementById('vc').innerHTML = '<div class="empty">找不到此行銷案</div>'; return; }
  if (!ASSOCIATIONS.length) ASSOCIATIONS = await safeGET('associations?order=name.asc');
  detailCampaignCache = c;
  TASKS = await GET(`marketing_campaign_tasks?campaign_id=eq.${id}&order=seq.asc,created_at.asc`) || [];
  BUDGET_ITEMS = await GET(`marketing_campaign_budget_items?campaign_id=eq.${id}&order=seq.asc,created_at.asc`) || [];
  DOCS = await GET(`marketing_campaign_documents?campaign_id=eq.${id}&order=uploaded_at.desc`) || [];
  RISKS = await safeGET(`marketing_campaign_risks?campaign_id=eq.${id}&order=due_date.asc,created_at.desc`);
  RISK_UPDATES = RISKS.length
    ? await safeGET(`marketing_campaign_risk_updates?or=(${RISKS.map(r => `risk_id.eq.${r.id}`).join(',')})&order=update_date.desc,created_at.desc`)
    : [];
  const docsWithUrl = await Promise.all(DOCS.map(async d => ({ doc: d, url: await getSignedUrl('campaign-documents', d.file_path) })));

  const execRate = c.budget ? Math.round((Number(c.actual_spend) || 0) / c.budget * 100) : 0;
  const hasTime = c.planned_start || c.planned_end || c.actual_start || c.actual_end;
  const hasSubsidyMeta = c.midea_budget_code || c.payment_status || c.claim_status || c.flight_cost != null;

  document.getElementById('vc').innerHTML = `
    <div class="ph">
      <div>
        <button class="btn btn-outline btn-sm" onclick="nav('campaigns')" style="margin-bottom:12px">← 返回總表</button>
        <div class="pt">${esc(c.name)}</div>
        <div class="ps" style="display:flex;align-items:center;gap:10px;margin-top:8px">${tag(c.status)}${priorityTag(c.priority)}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-outline" onclick="openWeeklyReport()">產生週報</button>
        <button class="btn btn-primary" onclick="openCampaignModal('${c.id}')">編輯</button>
      </div>
    </div>

    <div class="detail-grid">
      <div class="card detail-block ff">
        <div class="kpi-label">專案說明</div>
        <div class="detail-text">${c.purpose ? esc(c.purpose) : '<span class="muted-text">尚未填寫</span>'}</div>
      </div>

      <div class="card detail-block">
        <div class="kpi-label">專案時間</div>
        ${hasTime ? `
          <div class="detail-timeline">
            <div><span class="mono">${fdFull(c.planned_start)}</span> → <span class="mono">${fdFull(c.planned_end)}</span><div class="muted-text" style="margin-top:2px">預計</div></div>
            <div><span class="mono">${fdFull(c.actual_start)}</span> → <span class="mono">${fdFull(c.actual_end)}</span><div class="muted-text" style="margin-top:2px">實際</div></div>
          </div>` : '<div class="muted-text">尚未填寫</div>'}
      </div>

      <div class="card detail-block">
        <div class="kpi-label">內部預估金額</div>
        <div class="stat-num">NT$ ${fmt(c.budget)}</div>
        <div class="muted-text" style="margin-top:6px">實際產生金額 NT$ ${fmt(c.actual_spend)}（${execRate}%）</div>
        <div class="kpi-bar" style="background:var(--line)"><i style="width:${Math.min(100, execRate)}%;background:var(--teal)"></i></div>
        ${(c.subsidy_planned != null || c.subsidy_received != null) ? `
          <div class="muted-text" style="margin-top:10px">預估補助金額 NT$ ${fmt(c.subsidy_planned)}</div>
          <div class="muted-text" style="margin-top:2px">實際補助金額 NT$ ${fmt(c.subsidy_received)}</div>` : ''}
      </div>

      <div class="card detail-block">
        <div class="kpi-label">負責人</div>
        <div class="detail-text">${c.owner ? esc(c.owner) : '<span class="muted-text">尚未填寫</span>'}</div>
      </div>

      <div class="card detail-block">
        <div class="kpi-label">負責單位<span class="muted-text" style="text-transform:none;letter-spacing:0"> · 主要配合單位</span></div>
        <div class="detail-text">${c.owner_unit ? esc(c.owner_unit) : '<span class="muted-text">尚未填寫</span>'}</div>
      </div>

      <div class="card detail-block">
        <div class="kpi-label">關聯公會</div>
        <div class="detail-text">${c.association_id ? esc(assocName(c.association_id)) : '<span class="muted-text">未關聯公會</span>'}</div>
        ${c.association_activity_type ? `<div class="muted-text" style="margin-top:6px">${esc(c.association_activity_type)}</div>` : ''}
      </div>

      <div class="card detail-block ff">
        <div class="kpi-label">負責公司<span class="muted-text" style="text-transform:none;letter-spacing:0"> · 外包合作對象</span></div>
        <div class="detail-text">${(c.vendors && c.vendors.length) ? c.vendors.map(v => esc(v)).join('、') : '<span class="muted-text">尚未填寫</span>'}</div>
      </div>

      ${hasSubsidyMeta ? `
      <div class="card detail-block">
        <div class="kpi-label">補助與請款狀態</div>
        ${c.midea_budget_code ? `<div class="detail-text" style="font-size:14px">美的補助申請號碼　<span class="mono">${esc(c.midea_budget_code)}</span></div>` : ''}
        ${c.payment_status ? `<div class="detail-text" style="font-size:14px;margin-top:4px">付款狀態　${esc(c.payment_status)}</div>` : ''}
        ${c.claim_status ? `<div class="detail-text" style="font-size:14px;margin-top:4px">請款狀態　${esc(c.claim_status)}</div>` : ''}
        ${c.flight_cost != null ? `<div class="detail-text" style="font-size:14px;margin-top:4px">機票費用　NT$ ${fmt(c.flight_cost)}</div>` : ''}
      </div>` : ''}

      ${c.notes ? `<div class="card detail-block ff"><div class="kpi-label">備註</div><div class="detail-text">${esc(c.notes)}</div></div>` : ''}

      <div class="card detail-block ff">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="kpi-label">風險與待決事項</div>
          <button class="btn btn-outline btn-sm" onclick="openRiskModal()">＋ 新增事項</button>
        </div>
        ${renderRisksBlock(RISKS)}
      </div>

      <div class="card detail-block ff">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="kpi-label">任務與里程碑</div>
          <button class="btn btn-outline btn-sm" onclick="openTaskModal()">＋ 新增任務</button>
        </div>
        ${renderTasksBlock(TASKS)}
      </div>

      <div class="card detail-block ff">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="kpi-label">預算明細</div>
          <button class="btn btn-outline btn-sm" onclick="openBudgetModal()">＋ 新增項目</button>
        </div>
        ${renderBudgetItemsBlock(BUDGET_ITEMS)}
      </div>

      <div class="card detail-block ff">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="kpi-label">文件附件</div>
          <button class="btn btn-outline btn-sm" onclick="openDocModal()">＋ 新增文件</button>
        </div>
        ${renderDocumentsBlock(docsWithUrl)}
      </div>
    </div>`;
}

function openTaskModal(id){
  editTaskId = id || null;
  const t = id ? TASKS.find(x => x.id === id) : null;
  document.getElementById('tm-title').textContent = id ? '編輯任務' : '新增任務';
  document.getElementById('tm-seq').value = t?.seq ?? (TASKS.length ? Math.max(...TASKS.map(x => x.seq || 0)) + 1 : 1);
  document.getElementById('tm-name').value = t?.task_name || '';
  document.getElementById('tm-owner').value = t?.owner || '';
  document.getElementById('tm-pstart').value = t?.planned_start || '';
  document.getElementById('tm-pend').value = t?.planned_end || '';
  document.getElementById('tm-status').value = t?.status || '未開始';
  document.getElementById('tm-pct').value = t?.completion_pct ?? 0;
  document.getElementById('tm-output').value = t?.expected_output || '';
  document.getElementById('tm-notes').value = t?.notes || '';
  document.getElementById('tm-delete').style.display = id ? '' : 'none';
  const cal = document.getElementById('tm-calendar-link');
  const url = t ? googleCalendarTaskUrl(t) : '';
  cal.style.display = url ? '' : 'none';
  cal.href = url || '#';
  openM('mtask');
}

async function saveTask(){
  const task_name = document.getElementById('tm-name').value.trim();
  if (!task_name) { alert('請輸入任務名稱'); return; }
  const payload = {
    campaign_id: detailCampaignId,
    seq: Number(document.getElementById('tm-seq').value) || 0,
    task_name,
    owner: document.getElementById('tm-owner').value.trim() || null,
    planned_start: document.getElementById('tm-pstart').value || null,
    planned_end: document.getElementById('tm-pend').value || null,
    status: document.getElementById('tm-status').value,
    completion_pct: Math.max(0, Math.min(100, Number(document.getElementById('tm-pct').value) || 0)),
    expected_output: document.getElementById('tm-output').value.trim() || null,
    notes: document.getElementById('tm-notes').value.trim() || null
  };
  if (editTaskId) await PATCH(`marketing_campaign_tasks?id=eq.${editTaskId}`, payload);
  else await POST('marketing_campaign_tasks', payload);
  closeM('mtask');
  await campaignDetail(detailCampaignId);
}

async function delTask(){
  if (!editTaskId) return;
  if (!confirm('確定刪除此任務？')) return;
  await DEL(`marketing_campaign_tasks?id=eq.${editTaskId}`);
  closeM('mtask');
  await campaignDetail(detailCampaignId);
}

function openBudgetModal(id){
  editBudgetItemId = id || null;
  const b = id ? BUDGET_ITEMS.find(x => x.id === id) : null;
  document.getElementById('bm-title').textContent = id ? '編輯預算項目' : '新增預算項目';
  document.getElementById('bm-seq').value = b?.seq ?? (BUDGET_ITEMS.length ? Math.max(...BUDGET_ITEMS.map(x => x.seq || 0)) + 1 : 1);
  document.getElementById('bm-name').value = b?.item_name || '';
  document.getElementById('bm-nature').value = b?.budget_nature || '';
  document.getElementById('bm-twd').value = b?.amount_twd ?? '';
  document.getElementById('bm-rate').value = b?.exchange_rate ?? '';
  document.getElementById('bm-rmb').value = b?.amount_rmb ?? '';
  document.getElementById('bm-quote').value = b?.quote_status || '';
  document.getElementById('bm-basis').value = b?.basis_note || '';
  document.getElementById('bm-delete').style.display = id ? '' : 'none';
  openM('mbudget');
}

async function saveBudgetItem(){
  const item_name = document.getElementById('bm-name').value.trim();
  if (!item_name) { alert('請輸入費用項目'); return; }
  const payload = {
    campaign_id: detailCampaignId,
    seq: Number(document.getElementById('bm-seq').value) || 0,
    item_name,
    budget_nature: document.getElementById('bm-nature').value.trim() || null,
    amount_twd: document.getElementById('bm-twd').value || null,
    exchange_rate: document.getElementById('bm-rate').value || null,
    amount_rmb: document.getElementById('bm-rmb').value || null,
    quote_status: document.getElementById('bm-quote').value.trim() || null,
    basis_note: document.getElementById('bm-basis').value.trim() || null
  };
  if (editBudgetItemId) await PATCH(`marketing_campaign_budget_items?id=eq.${editBudgetItemId}`, payload);
  else await POST('marketing_campaign_budget_items', payload);
  closeM('mbudget');
  await campaignDetail(detailCampaignId);
}

async function delBudgetItem(){
  if (!editBudgetItemId) return;
  if (!confirm('確定刪除此預算項目？')) return;
  await DEL(`marketing_campaign_budget_items?id=eq.${editBudgetItemId}`);
  closeM('mbudget');
  await campaignDetail(detailCampaignId);
}

function openRiskModal(id){
  editRiskId = id || null;
  const r = id ? RISKS.find(x => x.id === id) : null;
  const latest = r ? latestRiskUpdate(r.id) : null;
  document.getElementById('rm-title').textContent = id ? '編輯風險／待決事項' : '新增風險／待決事項';
  document.getElementById('rm-type').value = r?.risk_type || '其他';
  document.getElementById('rm-name').value = r?.title || '';
  document.getElementById('rm-desc').value = r?.description || '';
  document.getElementById('rm-impact').value = r?.impact_level || '中';
  document.getElementById('rm-owner').value = r?.owner || '';
  document.getElementById('rm-due').value = r?.due_date || '';
  document.getElementById('rm-status').value = r?.status || '待處理';
  document.getElementById('rm-dashboard').checked = r?.show_on_dashboard ?? true;
  document.getElementById('rm-resolution').value = r?.resolution_note || '';
  document.getElementById('rm-delete').style.display = id ? '' : 'none';
  document.getElementById('rm-update-section').style.display = id ? '' : 'none';
  editRiskUpdateId = null;
  document.getElementById('rm-update-note').value = '';
  document.getElementById('rm-update-by').value = r?.owner || '';
  document.getElementById('rm-update-date').value = todayISO();
  document.getElementById('rm-next-date').value = latest?.next_followup_date || '';
  document.getElementById('rm-update-important').checked = false;
  document.getElementById('rm-update-save').textContent = '＋ 新增追蹤';
  document.getElementById('rm-update-cancel').style.display = 'none';
  renderRiskUpdates(id);
  openM('mrisk');
}

function renderRiskUpdates(riskId){
  const box = document.getElementById('rm-updates-list');
  if (!box) return;
  const rows = RISK_UPDATES
    .filter(u => u.risk_id === riskId)
    .sort((a, b) => (dval(b.update_date) || new Date(b.created_at || 0)) - (dval(a.update_date) || new Date(a.created_at || 0)));
  box.innerHTML = rows.map(u => `
    <div style="padding:10px 0;border-top:1px solid var(--line)">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
        <div class="mono" style="font-size:12px;color:var(--muted)">${fdFull(u.update_date)}${u.updated_by ? ' · ' + esc(u.updated_by) : ''}</div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${u.is_important ? '<span class="tag tag-grant">重要</span>' : ''}
          <button class="btn btn-outline btn-sm" onclick="editRiskUpdate('${u.id}')">編輯</button>
          <button class="btn btn-red btn-sm" onclick="delRiskUpdate('${u.id}')">刪除</button>
        </div>
      </div>
      <div style="font-size:14px;line-height:1.6;margin-top:4px">${esc(u.update_note)}</div>
      ${u.next_followup_date ? `<div class="muted-text" style="margin-top:4px">下次追蹤：<span class="mono">${fdFull(u.next_followup_date)}</span></div>` : ''}
    </div>`).join('') || '<div class="empty" style="padding:12px 0">尚無追蹤紀錄</div>';
}

function resetRiskUpdateForm(){
  editRiskUpdateId = null;
  document.getElementById('rm-update-note').value = '';
  document.getElementById('rm-update-date').value = todayISO();
  document.getElementById('rm-next-date').value = '';
  document.getElementById('rm-update-important').checked = false;
  document.getElementById('rm-update-save').textContent = '＋ 新增追蹤';
  document.getElementById('rm-update-cancel').style.display = 'none';
}
function editRiskUpdate(id){
  const u = RISK_UPDATES.find(x => x.id === id);
  if (!u) return;
  editRiskUpdateId = id;
  document.getElementById('rm-update-note').value = u.update_note || '';
  document.getElementById('rm-update-by').value = u.updated_by || '';
  document.getElementById('rm-update-date').value = u.update_date || todayISO();
  document.getElementById('rm-next-date').value = u.next_followup_date || '';
  document.getElementById('rm-update-important').checked = u.is_important === true;
  document.getElementById('rm-update-save').textContent = '儲存追蹤';
  document.getElementById('rm-update-cancel').style.display = '';
}
async function saveRiskUpdate(){
  if (!editRiskId) return;
  const note = document.getElementById('rm-update-note').value.trim();
  if (!note) { alert('請輸入更新內容'); return; }
  const payload = {
    update_note: note,
    updated_by: document.getElementById('rm-update-by').value.trim() || null,
    update_date: document.getElementById('rm-update-date').value || todayISO(),
    next_followup_date: document.getElementById('rm-next-date').value || null,
    is_important: document.getElementById('rm-update-important').checked
  };
  try {
    if (editRiskUpdateId) await PATCH(`marketing_campaign_risk_updates?id=eq.${editRiskUpdateId}`, payload);
    else await createRiskUpdate(editRiskId);
    await PATCH(`marketing_campaign_risks?id=eq.${editRiskId}`, { updated_at: new Date().toISOString() });
  } catch (e) {
    alert('追蹤紀錄資料表尚未啟用，請先在 Supabase SQL Editor 執行 schema_v11_risk_updates.sql。');
    return;
  }
  const fresh = await safeGET(`marketing_campaign_risk_updates?risk_id=eq.${editRiskId}&order=update_date.desc,created_at.desc`);
  RISK_UPDATES = RISK_UPDATES.filter(u => u.risk_id !== editRiskId).concat(fresh);
  renderRiskUpdates(editRiskId);
  await campaignDetail(detailCampaignId);
  openRiskModal(editRiskId);
}
async function delRiskUpdate(id){
  if (!confirm('確定刪除此追蹤紀錄？')) return;
  await DEL(`marketing_campaign_risk_updates?id=eq.${id}`);
  const fresh = await safeGET(`marketing_campaign_risk_updates?risk_id=eq.${editRiskId}&order=update_date.desc,created_at.desc`);
  RISK_UPDATES = RISK_UPDATES.filter(u => u.risk_id !== editRiskId).concat(fresh);
  resetRiskUpdateForm();
  renderRiskUpdates(editRiskId);
  await campaignDetail(detailCampaignId);
}

function openQuickRiskModal(id){
  quickRiskId = id;
  const r = RISKS.find(x => x.id === id);
  if (!r) return;
  const c = CAMPAIGNS.find(x => x.id === r.campaign_id);
  const latest = latestRiskUpdate(id);
  document.getElementById('qr-title').textContent = r.title || '快速處理';
  document.getElementById('qr-context').textContent = `${c?.name || ''} · ${r.risk_type} · ${riskFollowupLabel(r, latest)}`;
  document.getElementById('qr-note').value = '';
  document.getElementById('qr-by').value = r.owner || '';
  document.getElementById('qr-date').value = todayISO();
  document.getElementById('qr-next').value = latest?.next_followup_date || '';
  document.getElementById('qr-status').value = r.status || '處理中';
  document.getElementById('qr-resolution').value = r.resolution_note || '';
  document.getElementById('qr-important').checked = false;
  openM('mquickrisk');
}

async function saveQuickRisk(){
  if (!quickRiskId) return;
  const note = document.getElementById('qr-note').value.trim();
  const status = document.getElementById('qr-status').value;
  const resolution = document.getElementById('qr-resolution').value.trim();
  if (!note && status !== '已解決') { alert('請輸入本次更新內容'); return; }
  if (status === '已解決' && !resolution) { alert('請輸入結案說明'); return; }
  const riskPayload = {
    status,
    resolution_note: resolution || null,
    updated_at: new Date().toISOString()
  };
  const updatePayload = note ? {
    risk_id: quickRiskId,
    update_note: note,
    updated_by: document.getElementById('qr-by').value.trim() || null,
    update_date: document.getElementById('qr-date').value || todayISO(),
    next_followup_date: document.getElementById('qr-next').value || null,
    is_important: document.getElementById('qr-important').checked
  } : null;
  try {
    if (updatePayload) await POST('marketing_campaign_risk_updates', updatePayload);
    await PATCH(`marketing_campaign_risks?id=eq.${quickRiskId}`, riskPayload);
  } catch (e) {
    alert('快速處理儲存失敗，請確認追蹤紀錄資料表已啟用。');
    return;
  }
  closeM('mquickrisk');
  quickRiskId = null;
  await renderDashboard();
}

async function createRiskUpdate(riskId){
  const note = document.getElementById('rm-update-note').value.trim();
  if (!note) return null;
  return POST('marketing_campaign_risk_updates', {
    risk_id: riskId,
    update_note: note,
    updated_by: document.getElementById('rm-update-by').value.trim() || null,
    update_date: document.getElementById('rm-update-date').value || todayISO(),
    next_followup_date: document.getElementById('rm-next-date').value || null,
    is_important: document.getElementById('rm-update-important').checked
  });
}

async function saveRisk(){
  const title = document.getElementById('rm-name').value.trim();
  if (!title) { alert('請輸入事項標題'); return; }
  const pendingUpdateNote = editRiskId ? document.getElementById('rm-update-note')?.value.trim() : '';
  const payload = {
    campaign_id: detailCampaignId,
    risk_type: document.getElementById('rm-type').value,
    title,
    description: document.getElementById('rm-desc').value.trim() || null,
    impact_level: document.getElementById('rm-impact').value,
    owner: document.getElementById('rm-owner').value.trim() || null,
    due_date: document.getElementById('rm-due').value || null,
    status: document.getElementById('rm-status').value,
    show_on_dashboard: document.getElementById('rm-dashboard').checked,
    resolution_note: document.getElementById('rm-resolution').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  try {
    if (editRiskId) await PATCH(`marketing_campaign_risks?id=eq.${editRiskId}`, payload);
    else await POST('marketing_campaign_risks', payload);
    if (editRiskId && pendingUpdateNote) await createRiskUpdate(editRiskId);
  } catch (e) {
    alert('資料儲存失敗，請確認 schema_v10_risks.sql 與 schema_v11_risk_updates.sql 已在 Supabase SQL Editor 執行。');
    return;
  }
  closeM('mrisk');
  await campaignDetail(detailCampaignId);
}

async function delRisk(){
  if (!editRiskId) return;
  if (!confirm('確定刪除此風險／待決事項？')) return;
  try { await DEL(`marketing_campaign_risks?id=eq.${editRiskId}`); }
  catch (e) {
    alert('風險與待決事項資料表尚未啟用，請先在 Supabase SQL Editor 執行 schema_v10_risks.sql。');
    return;
  }
  closeM('mrisk');
  await campaignDetail(detailCampaignId);
}

function openDocModal(id){
  editDocId = id || null;
  const d = id ? DOCS.find(x => x.id === id) : null;
  document.getElementById('dc-title-label').textContent = id ? '編輯文件' : '新增文件';
  document.getElementById('dc-type').value = d?.doc_type || '報價單';
  document.getElementById('dc-name').value = d?.title || '';
  document.getElementById('dc-version').value = d?.version_note || '';
  document.getElementById('dc-notes').value = d?.notes || '';
  document.getElementById('dc-file').value = '';
  pendingDocFile = null;
  currentDocPath = d?.file_path || null;
  currentDocFileName = d?.file_name || null;
  document.getElementById('dc-file-current').innerHTML = currentDocFileName ? `<span class="muted-text">目前檔案：${esc(currentDocFileName)}</span>` : '';
  document.getElementById('dc-delete').style.display = id ? '' : 'none';
  openM('mdoc');
}

function onDocFilePick(input){
  pendingDocFile = input.files[0] || null;
  const el = document.getElementById('dc-file-current');
  if (pendingDocFile) el.innerHTML = `<span class="muted-text">待上傳：${esc(pendingDocFile.name)}</span>`;
}

async function saveDocument(){
  const title = document.getElementById('dc-name').value.trim();
  if (!title) { alert('請輸入文件名稱'); return; }
  if (!pendingDocFile && !currentDocPath) { alert('請選擇檔案'); return; }

  let filePath = currentDocPath;
  let fileName = currentDocFileName;
  if (pendingDocFile) {
    try { filePath = await uploadStorageFile('campaign-documents', pendingDocFile); }
    catch (e) { alert('檔案上傳失敗：' + e.message); return; }
    fileName = pendingDocFile.name;
  }

  const payload = {
    campaign_id: detailCampaignId,
    doc_type: document.getElementById('dc-type').value,
    title,
    version_note: document.getElementById('dc-version').value.trim() || null,
    file_path: filePath,
    file_name: fileName,
    notes: document.getElementById('dc-notes').value.trim() || null
  };
  if (editDocId) await PATCH(`marketing_campaign_documents?id=eq.${editDocId}`, payload);
  else await POST('marketing_campaign_documents', payload);
  closeM('mdoc');
  await campaignDetail(detailCampaignId);
}

async function delDocument(){
  if (!editDocId) return;
  if (!confirm('確定刪除此文件？')) return;
  if (currentDocPath) await deleteStorageFile('campaign-documents', currentDocPath);
  await DEL(`marketing_campaign_documents?id=eq.${editDocId}`);
  closeM('mdoc');
  await campaignDetail(detailCampaignId);
}

// ── PERFORMANCE ──
function costPer(amount, count){
  return count ? Math.round((Number(amount) || 0) / count) : 0;
}

async function renderPerformancePage(){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  CAMPAIGNS = await GET('marketing_campaigns?order=created_at.desc') || [];
  PERFORMANCE = await safeGET('marketing_campaign_performance?order=updated_at.desc');
  const campaignById = Object.fromEntries(CAMPAIGNS.map(c => [c.id, c]));
  const totalLeads = PERFORMANCE.reduce((s, p) => s + (Number(p.lead_count) || 0), 0);
  const totalQualified = PERFORMANCE.reduce((s, p) => s + (Number(p.qualified_lead_count) || 0), 0);
  const totalDealAmount = PERFORMANCE.reduce((s, p) => s + (Number(p.deal_amount) || 0), 0);
  const rows = PERFORMANCE.map(p => {
    const c = campaignById[p.campaign_id];
    const spend = Number(c?.actual_spend || c?.budget) || 0;
    return `<tr onclick="openPerformanceModal('${p.id}')">
      <td class="tb-name">${esc(c?.name || '未連結專案')}</td>
      <td class="mono">${fmt(p.reach_count)}</td>
      <td class="mono">${fmt(p.lead_count)}</td>
      <td class="mono">${fmt(p.qualified_lead_count)}</td>
      <td class="mono">NT$ ${fmt(costPer(spend, p.lead_count))}</td>
      <td class="mono">NT$ ${fmt(costPer(spend, p.qualified_lead_count))}</td>
      <td class="mono">NT$ ${fmt(p.deal_amount)}</td>
    </tr>`;
  }).join('');
  document.getElementById('vc').innerHTML = `
    <div class="ph"><div><div class="pt">成效查詢</div><div class="ps">用成效數字判斷活動是否值得持續投入</div></div>
      <button class="btn btn-primary" onclick="openPerformanceModal()">＋ 新增成效</button></div>
    <div class="dash-kpi-grid">
      <div class="stat-box"><div class="kpi-label">總名單數</div><div class="stat-num mono">${fmt(totalLeads)}</div></div>
      <div class="stat-box"><div class="kpi-label">有效商機</div><div class="stat-num mono">${fmt(totalQualified)}</div></div>
      <div class="stat-box"><div class="kpi-label">成交貢獻</div><div class="stat-num mono">NT$ ${fmt(totalDealAmount)}</div></div>
      <div class="stat-box"><div class="kpi-label">已建成效專案</div><div class="stat-num mono">${PERFORMANCE.length}</div></div>
    </div>
    <div class="tw">
      <table>
        <thead><tr><th>專案</th><th>觸及</th><th>名單</th><th>有效商機</th><th>名單成本</th><th>有效商機成本</th><th>成交金額</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${rows ? '' : '<div class="empty">尚無成效資料，點擊「＋ 新增成效」開始記錄</div>'}
    </div>`;
}

function performanceCampaignOptions(selected){
  return CAMPAIGNS.map(c => `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
}

function openPerformanceModal(id){
  editPerformanceId = id || null;
  const p = id ? PERFORMANCE.find(x => x.id === id) : null;
  document.getElementById('pm-title').textContent = id ? '編輯成效' : '新增成效';
  document.getElementById('pm-campaign').innerHTML = performanceCampaignOptions(p?.campaign_id || CAMPAIGNS[0]?.id);
  document.getElementById('pm-reach').value = p?.reach_count ?? 0;
  document.getElementById('pm-leads').value = p?.lead_count ?? 0;
  document.getElementById('pm-inquiries').value = p?.inquiry_count ?? 0;
  document.getElementById('pm-qualified').value = p?.qualified_lead_count ?? 0;
  document.getElementById('pm-opportunity').value = p?.estimated_opportunity_amount ?? 0;
  document.getElementById('pm-deals').value = p?.deal_count ?? 0;
  document.getElementById('pm-deal-amount').value = p?.deal_amount ?? 0;
  document.getElementById('pm-notes').value = p?.notes || '';
  document.getElementById('pm-delete').style.display = id ? '' : 'none';
  openM('mperformance');
}

async function savePerformance(){
  const payload = {
    campaign_id: document.getElementById('pm-campaign').value,
    reach_count: Number(document.getElementById('pm-reach').value) || 0,
    lead_count: Number(document.getElementById('pm-leads').value) || 0,
    inquiry_count: Number(document.getElementById('pm-inquiries').value) || 0,
    qualified_lead_count: Number(document.getElementById('pm-qualified').value) || 0,
    estimated_opportunity_amount: Number(document.getElementById('pm-opportunity').value) || 0,
    deal_count: Number(document.getElementById('pm-deals').value) || 0,
    deal_amount: Number(document.getElementById('pm-deal-amount').value) || 0,
    notes: document.getElementById('pm-notes').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  try {
    if (editPerformanceId) await PATCH(`marketing_campaign_performance?id=eq.${editPerformanceId}`, payload);
    else await POST('marketing_campaign_performance', payload);
  } catch (e) {
    alert('成效資料表尚未啟用，請先在 Supabase SQL Editor 執行 schema_v12_performance_resources.sql。');
    return;
  }
  closeM('mperformance');
  await renderPerformancePage();
}

async function delPerformance(){
  if (!editPerformanceId) return;
  if (!confirm('確定刪除此成效資料？')) return;
  await DEL(`marketing_campaign_performance?id=eq.${editPerformanceId}`);
  closeM('mperformance');
  await renderPerformancePage();
}

// ── RESOURCES ──
const RESOURCE_FILE_MAX_BYTES = 200 * 1024 * 1024;

function fmtFileSize(bytes){
  const n = Number(bytes) || 0;
  if (!n) return '';
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function resourceFileAction(r){
  const fileBtn = r.file_path
    ? `<button class="btn btn-outline btn-sm" data-path="${esc(r.file_path)}" data-name="${esc(r.file_name || r.title)}" onclick="event.stopPropagation();downloadResourceFileFromButton(this)">下載檔案</button>`
    : '';
  const link = r.resource_url ? `<a href="${esc(r.resource_url)}" target="_blank" rel="noopener">外部連結</a>` : '';
  return [fileBtn, link].filter(Boolean).join(' ');
}

async function renderResourcesPage(load = true){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  if (load) RESOURCES = await safeGET('marketing_resources?deleted_at=is.null&order=updated_at.desc');
  const types = Object.entries(RESOURCES.reduce((acc, r) => {
    acc[r.resource_type] = (acc[r.resource_type] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const audiences = [...new Set(RESOURCES.map(r => r.audience).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  const filteredResources = filterAndSortResources(RESOURCES);
  const hasFilters = Object.entries(RESOURCE_FILTERS).some(([key, value]) => key !== 'sort' && value);
  const rows = filteredResources.map(r => `
    <tr onclick="openResourceModal('${r.id}')">
      <td><span class="case-tag">${esc(r.resource_type)}</span></td>
      <td class="tb-name">${esc(r.title)}${r.product_line ? `<div class="muted-text">${esc(r.product_line)}</div>` : ''}</td>
      <td>${esc(r.audience || '-')}</td>
      <td>${esc(r.version || '-')}</td>
      <td>${r.is_external_usable ? '<span class="tag tag-teal">可對外</span>' : '<span class="tag tag-muted">內部</span>'}</td>
      <td onclick="event.stopPropagation()">${resourceFileAction(r) || '-'}</td>
    </tr>`).join('');
  document.getElementById('vc').innerHTML = `
    <div class="ph"><div><div class="pt">行銷資源庫</div><div class="ps">集中查詢簡報、DM、型錄、技術文章與可對外素材</div></div>
      <button class="btn btn-primary" onclick="openResourceModal()">＋ 新增資源</button></div>
    <div class="dash-kpi-grid">
      <div class="stat-box"><div class="kpi-label">資源總數</div><div class="stat-num mono">${RESOURCES.length}</div></div>
      <div class="stat-box"><div class="kpi-label">可對外使用</div><div class="stat-num mono">${RESOURCES.filter(r => r.is_external_usable).length}</div></div>
      <div class="stat-box"><div class="kpi-label">最多類型</div><div class="stat-num" style="font-size:24px">${esc(types[0]?.[0] || '-')}</div></div>
      <div class="stat-box"><div class="kpi-label">分類數</div><div class="stat-num mono">${types.length}</div></div>
    </div>
    <div class="filter-bar">
      <input id="res-filter-q" value="${esc(RESOURCE_FILTERS.q)}" placeholder="搜尋名稱、產品線、標籤、備註" oninput="setResourceFilter('q', this.value)">
      <select id="res-filter-type" onchange="setResourceFilter('type', this.value)">
        <option value="">全部類型</option>
        ${RESOURCE_TYPES.map(t => `<option value="${esc(t)}" ${RESOURCE_FILTERS.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
      </select>
      <select id="res-filter-audience" onchange="setResourceFilter('audience', this.value)">
        <option value="">全部對象</option>
        ${audiences.map(a => `<option value="${esc(a)}" ${RESOURCE_FILTERS.audience === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}
      </select>
      <select id="res-filter-external" onchange="setResourceFilter('external', this.value)">
        <option value="">全部權限</option>
        <option value="external" ${RESOURCE_FILTERS.external === 'external' ? 'selected' : ''}>可對外</option>
        <option value="internal" ${RESOURCE_FILTERS.external === 'internal' ? 'selected' : ''}>內部</option>
      </select>
      <select id="res-filter-sort" onchange="setResourceFilter('sort', this.value)">
        <option value="updated" ${RESOURCE_FILTERS.sort === 'updated' ? 'selected' : ''}>最近更新</option>
        <option value="type" ${RESOURCE_FILTERS.sort === 'type' ? 'selected' : ''}>依類型</option>
        <option value="product" ${RESOURCE_FILTERS.sort === 'product' ? 'selected' : ''}>依產品線</option>
        <option value="title" ${RESOURCE_FILTERS.sort === 'title' ? 'selected' : ''}>依名稱</option>
      </select>
      <div class="filter-hit">符合 ${filteredResources.length} / ${RESOURCES.length}${hasFilters ? ` · <button class="btn btn-outline btn-sm" onclick="resetResourceFilters()">清除</button>` : ''}</div>
    </div>
    <div class="tw">
      <table>
        <thead><tr><th>類型</th><th>資源名稱</th><th>對象</th><th>版本</th><th>權限</th><th>檔案／連結</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${rows ? '' : `<div class="empty">${RESOURCES.length ? '沒有符合條件的資源，請調整篩選條件' : '尚無行銷資源，點擊「＋ 新增資源」開始建立'}</div>`}
    </div>`;
}

function filterAndSortResources(list){
  const q = RESOURCE_FILTERS.q.trim().toLowerCase();
  return [...list].filter(r => {
    if (RESOURCE_FILTERS.type && r.resource_type !== RESOURCE_FILTERS.type) return false;
    if (RESOURCE_FILTERS.audience && r.audience !== RESOURCE_FILTERS.audience) return false;
    if (RESOURCE_FILTERS.external === 'external' && !r.is_external_usable) return false;
    if (RESOURCE_FILTERS.external === 'internal' && r.is_external_usable) return false;
    if (!q) return true;
    const haystack = [
      r.title,
      r.resource_type,
      r.product_line,
      r.audience,
      r.version,
      r.resource_url,
      r.canva_url,
      r.file_name,
      ...(r.tags || []),
      r.notes
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  }).sort((a, b) => {
    if (RESOURCE_FILTERS.sort === 'type') return `${a.resource_type || ''}${a.title || ''}`.localeCompare(`${b.resource_type || ''}${b.title || ''}`, 'zh-Hant');
    if (RESOURCE_FILTERS.sort === 'product') return `${a.product_line || ''}${a.title || ''}`.localeCompare(`${b.product_line || ''}${b.title || ''}`, 'zh-Hant');
    if (RESOURCE_FILTERS.sort === 'title') return (a.title || '').localeCompare(b.title || '', 'zh-Hant');
    return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
  });
}

function setResourceFilter(key, value){
  const activeId = document.activeElement?.id;
  RESOURCE_FILTERS = { ...RESOURCE_FILTERS, [key]: value };
  renderResourcesPage(false).then(() => {
    const el = activeId ? document.getElementById(activeId) : null;
    if (!el) return;
    el.focus();
    if (el.setSelectionRange && el.value != null) {
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }
  });
}

function resetResourceFilters(){
  RESOURCE_FILTERS = { q: '', type: '', audience: '', external: '', sort: 'updated' };
  renderResourcesPage(false);
}

async function renderExternalResourcesPage(){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  RESOURCES = await safeGET('marketing_resources?is_external_usable=eq.true&deleted_at=is.null&order=updated_at.desc');
  const rows = RESOURCES.map(r => `
    <tr onclick="openResourceModal('${r.id}')">
      <td><span class="case-tag">${esc(r.resource_type)}</span></td>
      <td class="tb-name">${esc(r.title)}${r.product_line ? `<div class="muted-text">${esc(r.product_line)}</div>` : ''}</td>
      <td>${esc(r.audience || '-')}</td>
      <td>${esc(r.version || '-')}</td>
      <td onclick="event.stopPropagation()">${resourceFileAction(r) || '-'}</td>
    </tr>`).join('');
  document.getElementById('vc').innerHTML = `
    <div class="ph"><div><div class="pt">對外素材</div><div class="ps">只顯示業務可提供客戶的行銷資源</div></div>
      <button class="btn btn-outline" onclick="nav('resources')">管理全部資源</button></div>
    <div class="dash-kpi-grid">
      <div class="stat-box"><div class="kpi-label">可用素材</div><div class="stat-num mono">${RESOURCES.length}</div></div>
      <div class="stat-box"><div class="kpi-label">有檔案可下載</div><div class="stat-num mono">${RESOURCES.filter(r => r.file_path).length}</div></div>
      <div class="stat-box"><div class="kpi-label">簡報/DM/型錄</div><div class="stat-num mono">${RESOURCES.filter(r => ['簡報','DM','型錄'].includes(r.resource_type)).length}</div></div>
      <div class="stat-box"><div class="kpi-label">最近更新</div><div class="stat-num" style="font-size:22px">${fdFull(RESOURCES[0]?.updated_at?.slice(0, 10) || '')}</div></div>
    </div>
    <div class="tw">
      <table>
        <thead><tr><th>類型</th><th>資源名稱</th><th>對象</th><th>版本</th><th>檔案／連結</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${rows ? '' : '<div class="empty">目前沒有標記為可對外使用的素材</div>'}
    </div>`;
}

function openResourceModal(id){
  editResourceId = id || null;
  const r = id ? RESOURCES.find(x => x.id === id) : null;
  document.getElementById('res-title-label').textContent = id ? '編輯資源' : '新增資源';
  document.getElementById('res-name').value = r?.title || '';
  document.getElementById('res-type').value = r?.resource_type || '其他';
  document.getElementById('res-product').value = r?.product_line || '';
  document.getElementById('res-audience').value = r?.audience || '';
  document.getElementById('res-version').value = r?.version || '';
  document.getElementById('res-url').value = r?.resource_url || '';
  document.getElementById('res-canva').value = r?.canva_url || '';
  document.getElementById('res-external').checked = r?.is_external_usable || false;
  document.getElementById('res-tags').value = (r?.tags || []).join('、');
  document.getElementById('res-notes').value = r?.notes || '';
  document.getElementById('res-file').value = '';
  pendingResourceFile = null;
  currentResourceFilePath = r?.file_path || null;
  currentResourceFileName = r?.file_name || null;
  currentResourceFileSize = r?.file_size || null;
  renderResourceFileCurrent();
  document.getElementById('res-delete').style.display = id ? '' : 'none';
  openM('mresource');
}

function renderResourceFileCurrent(){
  const el = document.getElementById('res-file-current');
  if (pendingResourceFile) {
    el.innerHTML = `<span class="muted-text">待上傳：${esc(pendingResourceFile.name)} ${fmtFileSize(pendingResourceFile.size)}</span>`;
    return;
  }
  if (currentResourceFilePath) {
    el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span class="muted-text">${esc(currentResourceFileName || currentResourceFilePath)} ${fmtFileSize(currentResourceFileSize)}</span>
      <button class="btn btn-outline btn-sm" data-path="${esc(currentResourceFilePath)}" data-name="${esc(currentResourceFileName || '')}" onclick="downloadResourceFileFromButton(this)">下載</button>
    </div>`;
    return;
  }
  el.innerHTML = '<span class="muted-text">尚未上傳檔案</span>';
}

function onResourceFilePick(input){
  pendingResourceFile = input.files[0] || null;
  if (pendingResourceFile && pendingResourceFile.size > RESOURCE_FILE_MAX_BYTES) {
    alert(`檔案超過上傳上限 ${fmtFileSize(RESOURCE_FILE_MAX_BYTES)}，請壓縮後再上傳。`);
    input.value = '';
    pendingResourceFile = null;
  }
  renderResourceFileCurrent();
}

async function downloadResourceFileFromButton(btn){
  await downloadStorageFile('marketing-resource-files', btn.dataset.path, btn.dataset.name);
}

async function saveResource(){
  const title = document.getElementById('res-name').value.trim();
  if (!title) { alert('請輸入資源名稱'); return; }
  let filePath = currentResourceFilePath;
  let fileName = currentResourceFileName;
  let fileSize = currentResourceFileSize;
  if (pendingResourceFile) {
    try {
      const oldPath = currentResourceFilePath;
      filePath = await uploadStorageFile('marketing-resource-files', pendingResourceFile);
      fileName = pendingResourceFile.name;
      fileSize = pendingResourceFile.size;
      if (oldPath && oldPath !== filePath) await deleteStorageFile('marketing-resource-files', oldPath);
    } catch (e) {
      const message = e?.message || '';
      const isTooLarge = message.includes('Payload too large') || message.includes('"413"') || message.includes('413');
      alert(isTooLarge
        ? `檔案上傳失敗：檔案超過目前 Storage 上限。請先執行 schema_v16_resource_file_size_limit.sql，或確認檔案小於 ${fmtFileSize(RESOURCE_FILE_MAX_BYTES)}。`
        : '檔案上傳失敗，請確認 schema_v14_resource_files.sql 與 schema_v16_resource_file_size_limit.sql 已執行。');
      return;
    }
  }
  const payload = {
    title,
    resource_type: document.getElementById('res-type').value,
    product_line: document.getElementById('res-product').value.trim() || null,
    audience: document.getElementById('res-audience').value.trim() || null,
    version: document.getElementById('res-version').value.trim() || null,
    resource_url: document.getElementById('res-url').value.trim() || null,
    canva_url: document.getElementById('res-canva').value.trim() || null,
    is_external_usable: document.getElementById('res-external').checked,
    tags: document.getElementById('res-tags').value.split(/[、,]/).map(x => x.trim()).filter(Boolean),
    notes: document.getElementById('res-notes').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  if (filePath || fileName || fileSize) {
    payload.file_path = filePath;
    payload.file_name = fileName;
    payload.file_size = fileSize;
  }
  try {
    if (editResourceId) await PATCH(`marketing_resources?id=eq.${editResourceId}`, payload);
    else await POST('marketing_resources', payload);
  } catch (e) {
    alert('行銷資源資料表尚未啟用，請先在 Supabase SQL Editor 執行 schema_v12_performance_resources.sql。');
    return;
  }
  closeM('mresource');
  await renderResourcesPage();
}

async function delResource(){
  alert('行銷資源已改由 v2 管理。請到 v2 的「產品知識庫 / 文宣資源管理」使用封存，不再從 v1 真刪除。');
}

// ── ASSOCIATIONS ──
function assocById(id){ return ASSOCIATIONS.find(a => a.id === id); }
function assocName(id){ return assocById(id)?.name || '-'; }
function splitList(v){ return (v || '').split(/[、,]/).map(x => x.trim()).filter(Boolean); }
function joinList(v){ return Array.isArray(v) ? v.join('、') : (v || ''); }
function assocSelectOptions(selected){
  return ASSOCIATIONS.map(a => `<option value="${a.id}" ${selected === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
}
function campaignAssociationOptions(selected){
  return '<option value="">不關聯公會</option>' +
    ASSOCIATIONS.map(a => `<option value="${a.id}" ${selected === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
}
function taskById(id){ return ASSOC_TASKS.find(t => t.id === id); }
function taskName(id){ return taskById(id)?.task_name || '-'; }
function assocTasks(associationId){ return ASSOC_TASKS.filter(t => t.association_id === associationId); }
function assocExpenses(associationId){ return ASSOC_EXPENSES.filter(e => e.association_id === associationId); }
function taskSelectOptions(associationId, selected, emptyLabel = '不關聯任務'){
  const tasks = associationId ? assocTasks(associationId) : ASSOC_TASKS;
  return `<option value="">${emptyLabel}</option>` + tasks.map(t => `<option value="${t.id}" ${selected === t.id ? 'selected' : ''}>${esc(t.task_name)}</option>`).join('');
}
function uniqueOptionValues(values){
  return [...new Set(values.map(v => (v ?? '').toString().trim()).filter(Boolean))];
}
function existingValues(list, field){
  return list.map(item => item?.[field]);
}
function customSelectOptions(defaults, selected, existing = [], emptyLabel = ''){
  const values = uniqueOptionValues([...defaults, ...existing, selected]);
  const empty = emptyLabel ? `<option value="">${esc(emptyLabel)}</option>` : '';
  return empty + values.map(v => `<option value="${esc(v)}" ${selected === v ? 'selected' : ''}>${esc(v)}</option>`).join('') +
    `<option value="${CUSTOM_OPTION_VALUE}">＋新增選項</option>`;
}
function setCustomSelect(id, defaults, selected, existing = [], emptyLabel = ''){
  const el = document.getElementById(id);
  if (!el) return;
  const fallback = selected || (emptyLabel ? '' : defaults[0] || '');
  el.innerHTML = customSelectOptions(defaults, fallback, existing, emptyLabel);
  el.value = fallback;
  el.dataset.prevValue = fallback;
  el.onchange = () => handleCustomSelect(id);
}
function handleCustomSelect(id){
  const el = document.getElementById(id);
  if (!el || el.value !== CUSTOM_OPTION_VALUE) {
    if (el) el.dataset.prevValue = el.value;
    return;
  }
  const value = (prompt('新增選項') || '').trim();
  if (!value) { el.value = el.dataset.prevValue || ''; return; }
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = value;
  el.insertBefore(opt, el.querySelector(`option[value="${CUSTOM_OPTION_VALUE}"]`));
  el.value = value;
  el.dataset.prevValue = value;
}
function campaignById(id){ return CAMPAIGNS.find(c => c.id === id); }
function campaignName(id){ return campaignById(id)?.name || (id ? '已刪除行銷專案' : '-'); }
function associationCampaigns(associationId){
  return CAMPAIGNS.filter(c => c.association_id === associationId);
}
function associationItemCampaignId(item){
  return item?.marketing_campaign_id || item?.campaign_id || taskById(item?.task_id)?.marketing_campaign_id || null;
}
function associationItemsForCampaign(items, campaignId){
  return items.filter(item => associationItemCampaignId(item) === campaignId);
}
function associationNativeItems(items, associationId){
  return items.filter(item => item.association_id === associationId && !associationItemCampaignId(item));
}
function associationCampaignContext(associationId, contextItems = []){
  const ids = new Set(associationCampaigns(associationId).map(c => c.id));
  assocTasks(associationId).forEach(t => { if (t.marketing_campaign_id) ids.add(t.marketing_campaign_id); });
  contextItems
    .filter(item => item.association_id === associationId)
    .forEach(item => {
      const id = associationItemCampaignId(item);
      if (id) ids.add(id);
    });
  return [...ids]
    .map(campaignById)
    .filter(Boolean)
    .sort((a, b) => String(a.actual_start || a.planned_start || a.created_at || '9999').localeCompare(String(b.actual_start || b.planned_start || b.created_at || '9999')));
}
function campaignTasksForAssociation(associationId){
  const campaignIds = new Set(associationCampaigns(associationId).map(c => c.id));
  return CAMPAIGN_TASKS_ALL
    .filter(t => campaignIds.has(t.campaign_id))
    .map(t => ({
      ...t,
      source: 'campaign',
      association_id: associationId,
      task_name: t.task_name,
      task_type: campaignById(t.campaign_id)?.association_activity_type || '行銷任務',
      task_status: t.status,
      priority: campaignById(t.campaign_id)?.priority || '中',
      start_date: t.planned_start,
      due_date: t.planned_end || t.planned_start,
      progress_pct: t.completion_pct,
      owner: t.owner,
      next_step: t.expected_output || t.notes || '',
      marketing_campaign_id: t.campaign_id
    }));
}
function allAssociationTasks(associationId){
  return [
    ...campaignTasksForAssociation(associationId),
    ...assocTasks(associationId).map(t => ({ ...t, source: 'association' }))
  ];
}
function campaignBudgetItemsForAssociation(associationId){
  const campaignIds = new Set(associationCampaigns(associationId).map(c => c.id));
  return CAMPAIGN_BUDGET_ITEMS_ALL
    .filter(b => campaignIds.has(b.campaign_id))
    .map(b => ({
      ...b,
      source: 'campaign',
      association_id: associationId,
      task_id: null,
      expense_type: b.budget_nature || '行銷案費用',
      budget_amount: b.amount_twd,
      actual_amount: null,
      payment_status: b.quote_status || campaignById(b.campaign_id)?.payment_status || '待確認',
      payment_date: null,
      receipt_status: campaignById(b.campaign_id)?.claim_status || '',
      receipt_attachment: '',
      notes: b.basis_note || '',
      marketing_campaign_id: b.campaign_id
    }));
}
function allAssociationExpenses(associationId){
  return [
    ...campaignBudgetItemsForAssociation(associationId),
    ...assocExpenses(associationId).map(e => ({ ...e, source: 'association' }))
  ];
}
function campaignEventsForAssociation(associationId){
  return associationCampaigns(associationId)
    .filter(c => c.association_activity_type)
    .map(c => ({
      ...c,
      source: 'campaign',
      association_id: associationId,
      task_id: null,
      event_name: c.name,
      event_type: c.association_activity_type,
      event_date: c.actual_start || c.planned_start,
      location: c.owner_unit || '',
      meisun_role: c.association_activity_type === '年度贊助' ? '贊助' : '',
      budget: c.budget,
      actual_spend: c.actual_spend,
      event_status: c.status === '結案' ? '已完成' : (c.status === '預計規劃' ? '待確認' : '準備中'),
      owner: c.owner
    }));
}
function allAssociationEvents(associationId){
  return [
    ...campaignEventsForAssociation(associationId),
    ...ASSOC_EVENTS.filter(e => e.association_id === associationId).map(e => ({ ...e, source: 'association' }))
  ];
}
function campaignTaskSummary(campaignId){
  const campaignTasks = CAMPAIGN_TASKS_ALL.filter(t => t.campaign_id === campaignId);
  const assocLinkedTasks = ASSOC_TASKS
    .filter(t => associationItemCampaignId(t) === campaignId)
    .map(t => ({
      ...t,
      status: t.task_status,
      planned_start: t.start_date,
      planned_end: t.due_date,
      completion_pct: t.progress_pct,
      expected_output: t.next_step || t.notes || ''
    }));
  const tasks = [...campaignTasks, ...assocLinkedTasks];
  const open = tasks.filter(t => !['已完成','取消'].includes(t.status));
  const next = [...open].sort((a, b) => String(a.planned_end || a.planned_start || '9999').localeCompare(String(b.planned_end || b.planned_start || '9999')))[0];
  const avg = tasks.length ? Math.round(tasks.reduce((sum, t) => sum + (Number(t.completion_pct) || 0), 0) / tasks.length) : 0;
  return { tasks, open, next, avg };
}
function campaignExpenseSummary(campaignId){
  const items = CAMPAIGN_BUDGET_ITEMS_ALL.filter(b => b.campaign_id === campaignId);
  const expenses = ASSOC_EXPENSES.filter(e => associationItemCampaignId(e) === campaignId);
  const total = items.reduce((sum, b) => sum + (Number(b.amount_twd) || 0), 0) +
    expenses.reduce((sum, e) => sum + (Number(e.budget_amount) || 0), 0);
  const actual = expenses.reduce((sum, e) => sum + (Number(e.actual_amount) || 0), 0);
  const pending = [
    ...items.filter(b => /待|估算|未/.test(`${b.quote_status || ''}${b.budget_nature || ''}`)),
    ...expenses.filter(e => /待|未/.test(`${e.payment_status || ''}`))
  ];
  return { items, expenses, total, actual, pending };
}
function campaignPublicationSummary(campaignId){
  const publications = associationItemsForCampaign(ASSOC_PUBLICATIONS, campaignId);
  const open = publications.filter(p => p.material_status !== '已刊登');
  const next = [...open].sort((a, b) => String(a.deadline_date || '9999').localeCompare(String(b.deadline_date || '9999')))[0] || publications[0];
  return { publications, open, next };
}
function campaignEventSummary(campaignId){
  const c = campaignById(campaignId);
  const events = associationItemsForCampaign(ASSOC_EVENTS, campaignId);
  const open = events.filter(e => !['已完成','取消'].includes(e.event_status));
  const nextLinked = [...open].sort((a, b) => String(a.event_date || '9999').localeCompare(String(b.event_date || '9999')))[0];
  const next = nextLinked || (c ? {
    event_name: c.name,
    event_type: c.association_activity_type || '公會活動',
    event_status: c.status === '結案' ? '已完成' : (c.status === '預計規劃' ? '待確認' : '準備中'),
    event_date: c.actual_start || c.planned_start,
    location: c.owner_unit || '',
    meisun_role: c.association_activity_type === '年度贊助' ? '贊助' : '會員參與',
    owner: c.owner || '',
    budget: c.budget,
    actual_spend: c.actual_spend
  } : null);
  return { events, open, next };
}
async function openCampaignTaskFromAssoc(campaignId, taskId){
  await campaignDetail(campaignId);
  openTaskModal(taskId);
}
async function openCampaignBudgetFromAssoc(campaignId, itemId){
  await campaignDetail(campaignId);
  openBudgetModal(itemId);
}
function activeCampaignOptions(selected){
  const active = CAMPAIGNS.filter(c => c.status !== '結案' || c.id === selected);
  return '<option value="">不關聯行銷專案</option>' +
    active.map(c => `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>${esc(c.name)}｜${esc(c.status || '未填')}</option>`).join('') +
    `<option value="${NEW_CAMPAIGN_VALUE}">＋新增行銷專案</option>`;
}
function setCampaignSelect(id, selected){
  const el = document.getElementById(id);
  el.innerHTML = activeCampaignOptions(selected);
  el.value = selected || '';
  el.dataset.prevValue = el.value;
}
async function handleAssocCampaignSelect(){
  const el = document.getElementById('at-campaign');
  if (el.value !== NEW_CAMPAIGN_VALUE) { el.dataset.prevValue = el.value; return; }
  const name = (prompt('新增行銷專案名稱') || '').trim();
  if (!name) { el.value = el.dataset.prevValue || ''; return; }
  const payload = {
    name,
    status: '進行中',
    priority: '中',
    purpose: `公會任務關聯：${document.getElementById('at-name')?.value.trim() || '待補'}`,
    updated_at: new Date().toISOString()
  };
  try {
    const saved = await POST('marketing_campaigns', payload);
    CAMPAIGNS = sortByStatus(await GET('marketing_campaigns?order=created_at.desc') || []);
    const id = saved?.[0]?.id || CAMPAIGNS.find(c => c.name === name)?.id || '';
    setCampaignSelect('at-campaign', id);
  } catch (e) {
    alert('新增行銷專案失敗，請先確認行銷案資料表已啟用。');
    el.value = el.dataset.prevValue || '';
  }
}
function assocStatusTag(status){
  const cls = { '已加入':'teal', '待確認':'brass', '待續會':'grant', '停止':'muted' }[status] || 'muted';
  return `<span class="tag tag-${cls}">${esc(status)}</span>`;
}
function simpleStatusTag(status){
  const cls = /已繳|已使用|已刊登|已完成/.test(status || '') ? 'deep'
    : /準備中|已送審|已送件/.test(status || '') ? 'teal'
    : /待|未/.test(status || '') ? 'brass'
    : 'muted';
  return `<span class="tag tag-${cls}">${esc(status || '-')}</span>`;
}
async function loadAssociationsData(){
  [ASSOCIATIONS, ASSOC_FEES, ASSOC_BENEFITS, ASSOC_PUBLICATIONS, ASSOC_EVENTS, ASSOC_NOTES, ASSOC_TASKS, ASSOC_EXPENSES, CAMPAIGNS, CAMPAIGN_TASKS_ALL, CAMPAIGN_BUDGET_ITEMS_ALL] = await Promise.all([
    safeGET('associations?order=updated_at.desc'),
    safeGET('association_fee_records?order=year.desc,due_date.asc'),
    safeGET('association_benefits?order=valid_until.asc'),
    safeGET('association_publication_schedules?order=deadline_date.asc'),
    safeGET('association_events?order=event_date.asc'),
    safeGET('association_notes?order=updated_at.desc'),
    safeGET('association_tasks?order=due_date.asc,updated_at.desc'),
    safeGET('association_task_expenses?order=updated_at.desc'),
    safeGET('marketing_campaigns?order=created_at.desc'),
    safeGET('marketing_campaign_tasks?select=id,campaign_id,seq,task_name,owner,planned_start,planned_end,status,completion_pct,expected_output,notes&order=planned_end.asc,seq.asc'),
    safeGET('marketing_campaign_budget_items?select=id,campaign_id,seq,item_name,budget_nature,amount_twd,amount_rmb,quote_status,basis_note&order=seq.asc,created_at.asc')
  ]);
  CAMPAIGNS = sortByStatus(CAMPAIGNS || []);
}
function latestFee(associationId){
  return ASSOC_FEES.filter(f => f.association_id === associationId)
    .sort((a, b) => (b.year || 0) - (a.year || 0) || String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')))[0];
}
function currentYearFee(associationId){
  const y = new Date().getFullYear();
  return ASSOC_FEES.find(f => f.association_id === associationId && Number(f.year) === y) || latestFee(associationId);
}
function latestAssocUpdated(a){
  const related = [
    a?.updated_at,
    ...ASSOC_FEES.filter(x => x.association_id === a.id).map(x => x.updated_at),
    ...ASSOC_BENEFITS.filter(x => x.association_id === a.id).map(x => x.updated_at),
    ...ASSOC_PUBLICATIONS.filter(x => x.association_id === a.id).map(x => x.updated_at),
    ...ASSOC_EVENTS.filter(x => x.association_id === a.id).map(x => x.updated_at),
    ...ASSOC_NOTES.filter(x => x.association_id === a.id).map(x => x.updated_at),
    ...ASSOC_TASKS.filter(x => x.association_id === a.id).map(x => x.updated_at),
    ...ASSOC_EXPENSES.filter(x => x.association_id === a.id).map(x => x.updated_at),
    ...associationCampaigns(a.id).map(x => x.updated_at),
  ].filter(Boolean).sort();
  return related.at(-1) || a?.updated_at || '';
}
function nextAssocTask(associationId){
  return allAssociationTasks(associationId).filter(t => !['已完成','取消'].includes(t.task_status))
    .sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')))[0];
}
function openTaskCount(associationId){
  return allAssociationTasks(associationId).filter(t => !['已完成','取消'].includes(t.task_status)).length;
}
function expenseTotals(associationId){
  return allAssociationExpenses(associationId).reduce((sum, e) => {
    sum.budget += Number(e.budget_amount) || 0;
    sum.actual += Number(e.actual_amount) || 0;
    return sum;
  }, { budget: 0, actual: 0 });
}
function unpaidExpenseCount(associationId){
  return allAssociationExpenses(associationId).filter(e => ['未付款','待確認'].includes(e.payment_status)).length;
}
function nextPublication(associationId){
  return ASSOC_PUBLICATIONS.filter(p => p.association_id === associationId && p.material_status !== '已刊登')
    .sort((a, b) => String(a.deadline_date || '9999').localeCompare(String(b.deadline_date || '9999')))[0];
}
function nextAssocEvent(associationId){
  return allAssociationEvents(associationId).filter(e => !['已完成','取消'].includes(e.event_status))
    .sort((a, b) => String(a.event_date || '9999').localeCompare(String(b.event_date || '9999')))[0];
}
function unusedBenefitCount(associationId){
  return ASSOC_BENEFITS.filter(b => b.association_id === associationId && ['未使用','準備中'].includes(b.usage_status)).length;
}
function assocBadges(a){
  const fee = currentYearFee(a.id);
  const pub = nextPublication(a.id);
  const ev = nextAssocEvent(a.id);
  const badges = [];
  const task = nextAssocTask(a.id);
  const unpaid = unpaidExpenseCount(a.id);
  if (task && isPast(task.due_date)) badges.push('<span class="case-tag">任務逾期</span>');
  if (task && task.task_status === '準備中') badges.push('<span class="case-tag">任務準備中</span>');
  if (fee && fee.payment_status !== '已繳' && (inNextDays(fee.due_date, 45) || isPast(fee.due_date))) badges.push('<span class="case-tag">年費即將到期</span>');
  if (pub && inNextDays(pub.deadline_date, 21)) badges.push('<span class="case-tag">期刊截稿將至</span>');
  if (pub && pub.material_status !== '已刊登' && isPast(pub.deadline_date)) badges.push('<span class="case-tag">稿件未完成</span>');
  if (ev && ev.event_status === '準備中') badges.push('<span class="case-tag">活動準備中</span>');
  if (unusedBenefitCount(a.id) > 0) badges.push('<span class="case-tag">權益尚未使用</span>');
  if (unpaid > 0) badges.push('<span class="case-tag">費用未付款</span>');
  if (!a.primary_contact || !a.internal_owner || a.internal_owner === '待補') badges.push('<span class="case-tag">資料待補</span>');
  return badges.join(' ');
}
function assocTabs(){
  const tabs = [
    ['overview','公會總覽'],
    ['details','公會資料詳情'],
    ['tasks','任務管理'],
    ['expenses','任務費用'],
    ['fees','年費與續會'],
    ['publications','期刊資料準備排程'],
    ['events','會員大會 / 協辦活動'],
    ['benefits','權益與備註']
  ];
  return `<div class="assoc-tabs">
    ${tabs.map(([key, label]) => `<button class="btn ${ASSOC_TAB === key ? 'btn-primary' : 'btn-outline'}" onclick="setAssocTab('${key}')">${label}</button>`).join('')}
  </div>`;
}
async function setAssocTab(tab){
  ASSOC_TAB = tab;
  await renderAssociationsPage(false);
}
async function renderAssociationsPage(load = true){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  if (load) await loadAssociationsData();
  const actions = {
    overview: '<button class="btn btn-primary" onclick="openAssociationModal()">＋ 新增公會</button>',
    details: '<button class="btn btn-primary" onclick="openAssociationModal()">＋ 新增公會</button>',
    tasks: '<button class="btn btn-outline" onclick="openAssocTaskModal()">＋ 公會專屬任務</button> <button class="btn btn-primary" onclick="openCampaignModal()">＋ 新增行銷案</button>',
    expenses: '<button class="btn btn-outline" onclick="openAssocExpenseModal()">＋ 公會專屬費用</button> <button class="btn btn-primary" onclick="openCampaignModal()">＋ 新增行銷案</button>',
    fees: '<button class="btn btn-primary" onclick="openAssocFeeModal()">＋ 新增年費</button>',
    publications: '<button class="btn btn-primary" onclick="openAssocPubModal()">＋ 新增期刊排程</button>',
    events: '<button class="btn btn-outline" onclick="openAssocEventModal()">＋ 公會專屬活動</button> <button class="btn btn-primary" onclick="openCampaignModal()">＋ 新增行銷案</button>',
    benefits: '<button class="btn btn-outline" onclick="openAssocNoteModal()">＋ 新增備註</button> <button class="btn btn-primary" onclick="openAssocBenefitModal()">＋ 新增權益</button>'
  }[ASSOC_TAB];
  document.getElementById('vc').innerHTML = `
    <div class="ph"><div><div class="pt">公會管理</div><div class="ps">管理加入公會、年費續會、會員權益、期刊排程與會員大會/協辦活動</div></div>${actions}</div>
    ${assocTabs()}
    ${renderAssociationTab()}`;
}
function renderAssociationTab(){
  if (ASSOC_TAB === 'details') return renderAssocDetails();
  if (ASSOC_TAB === 'tasks') return renderAssocTasks();
  if (ASSOC_TAB === 'expenses') return renderAssocExpenses();
  if (ASSOC_TAB === 'fees') return renderAssocFees();
  if (ASSOC_TAB === 'publications') return renderAssocPublications();
  if (ASSOC_TAB === 'events') return renderAssocEvents();
  if (ASSOC_TAB === 'benefits') return renderAssocBenefits();
  return renderAssocOverview();
}
function renderAssocOverview(){
  const rows = ASSOCIATIONS.map(a => {
    const fee = currentYearFee(a.id);
    const pub = nextPublication(a.id);
    const ev = nextAssocEvent(a.id);
    const task = nextAssocTask(a.id);
    const totals = expenseTotals(a.id);
    return `<div class="assoc-card" onclick="openAssociationModal('${a.id}')">
      <div class="assoc-card-head">
        <div class="assoc-card-title clamp2">${esc(a.name)}</div>
        ${assocStatusTag(a.join_status)}
      </div>
      <div class="cell-sub">${esc(a.association_type || '待補')}｜負責人：${esc(a.internal_owner || '待補')}</div>
      <div class="assoc-card-meta">
        <div class="assoc-card-field"><div class="kpi-label">年費</div><div>${fee ? simpleStatusTag(fee.payment_status) : '<span class="muted-text">待補</span>'}<div class="cell-sub">到期 ${fdFull(fee?.due_date || '')}</div></div></div>
        <div class="assoc-card-field"><div class="kpi-label">進行中任務</div><div class="mono">${openTaskCount(a.id)}</div><div class="cell-sub clamp2">${task ? `${fdFull(task.due_date || '')} ${esc(task.task_name)}` : '待補'}</div></div>
        <div class="assoc-card-field"><div class="kpi-label">期刊截稿</div><div class="cell-main">${fdFull(pub?.deadline_date || '')}</div><div class="cell-sub clamp2">${pub ? esc(pub.publication_name) : '待補'}</div></div>
        <div class="assoc-card-field"><div class="kpi-label">下一場活動</div><div class="cell-main">${ev ? fdFull(ev.event_date || '') : '待補'}</div><div class="cell-sub clamp2">${ev ? esc(ev.event_name) : '待補'}</div></div>
      </div>
      <div class="case-tags">${assocBadges(a) || '<span class="case-tag">目前無提醒</span>'}</div>
      <div class="assoc-card-footer">
        <div><div class="kpi-label">預算 / 已支出</div><div class="mono">NT$ ${fmt(totals.budget)} / ${fmt(totals.actual)}</div></div>
        <div style="text-align:right"><div class="kpi-label">最後更新</div><div class="mono">${fdFull(latestAssocUpdated(a).slice(0, 10) || '')}</div></div>
      </div>
    </div>`;
  }).join('');
  return `<div class="dash-kpi-grid">
    <div class="stat-box"><div class="kpi-label">公會數</div><div class="stat-num mono">${ASSOCIATIONS.length}</div></div>
    <div class="stat-box"><div class="kpi-label">進行中任務</div><div class="stat-num mono">${ASSOCIATIONS.reduce((sum, a) => sum + openTaskCount(a.id), 0)}</div></div>
    <div class="stat-box"><div class="kpi-label">費用未付款</div><div class="stat-num mono">${ASSOCIATIONS.reduce((sum, a) => sum + unpaidExpenseCount(a.id), 0)}</div></div>
    <div class="stat-box"><div class="kpi-label">期刊待準備</div><div class="stat-num mono">${ASSOC_PUBLICATIONS.filter(p => p.material_status !== '已刊登').length}</div></div>
  </div>
  ${rows ? `<div class="assoc-overview-grid">${rows}</div>` : '<div class="empty">尚無公會資料，請先新增公會或執行 schema_v17_associations.sql</div>'}`;
}
function renderAssocDetails(){
  const rows = ASSOCIATIONS.map(a => {
    const campaigns = associationCampaignContext(a.id, [...ASSOC_TASKS, ...ASSOC_EXPENSES, ...ASSOC_PUBLICATIONS, ...ASSOC_EVENTS]);
    const campaignRows = campaigns.map(c => `
      <tr onclick="campaignDetail('${c.id}')">
        <td><div class="cell-main clamp2">${esc(c.name)}</div><div class="cell-sub">${esc(c.association_activity_type || '未分類')}</div></td>
        <td class="status-col">${tag(c.status)}</td>
        <td class="date-col"><div class="cell-main">${fdFull(c.planned_start || '')}</div><div class="cell-sub">${fdFull(c.planned_end || '')}</div></td>
        <td class="money-col mono">NT$ ${fmt(c.budget)}</td>
        <td class="owner-col"><div class="clip">${esc(c.owner || '-')}</div></td>
      </tr>`).join('');
    return `
    <div class="card" style="margin-bottom:12px">
      <div class="dash-panel-head">
        <div><div class="dash-panel-title">${esc(a.name)}</div><div class="muted-text">${esc(a.association_type || '待補')}｜${assocStatusTag(a.join_status)}</div></div>
        <button class="btn btn-sm btn-outline" onclick="openAssociationModal('${a.id}')">編輯</button>
      </div>
      <div class="detail-grid">
        <div class="detail-block"><div class="kpi-label">會員編號</div><div>${esc(a.member_no || '待補')}</div></div>
        <div class="detail-block"><div class="kpi-label">主要聯絡人</div><div>${esc(a.primary_contact || '待補')}</div></div>
        <div class="detail-block"><div class="kpi-label">聯絡電話</div><div>${esc(a.phone || '待補')}</div></div>
        <div class="detail-block"><div class="kpi-label">Email</div><div>${esc(a.email || '待補')}</div></div>
        <div class="detail-block"><div class="kpi-label">地址</div><div>${esc(a.address || '待補')}</div></div>
        <div class="detail-block"><div class="kpi-label">官方網站</div><div>${a.website ? `<a href="${esc(a.website)}" target="_blank" rel="noopener">${esc(a.website)}</a>` : '待補'}</div></div>
        <div class="detail-block"><div class="kpi-label">LINE / 群組連結</div><div>${esc(a.line_url || '待補')}</div></div>
        <div class="detail-block"><div class="kpi-label">內部負責人</div><div>${esc(a.internal_owner || '待補')}</div></div>
        <div class="detail-block ff"><div class="kpi-label">備註</div><div class="detail-text">${esc(a.notes || '待補')}</div></div>
      </div>
      <div style="margin-top:16px">
        <div class="kpi-label" style="margin-bottom:8px">關聯行銷案</div>
        <div class="tw"><table class="assoc-table"><thead><tr><th>專案 / 類型</th><th class="status-col">狀態</th><th class="date-col">時程</th><th class="money-col">預算</th><th class="owner-col">負責人</th></tr></thead><tbody>${campaignRows}</tbody></table>${campaignRows ? '' : '<div class="empty">尚無關聯行銷案</div>'}</div>
      </div>
    </div>`;
  }).join('');
  return rows || '<div class="empty">尚無公會資料</div>';
}
function renderAssocTasks(){
  const sections = ASSOCIATIONS.map(a => {
    const campaignRows = associationCampaignContext(a.id, ASSOC_TASKS).map(c => {
      const summary = campaignTaskSummary(c.id);
      const nextDate = summary.next?.planned_end || summary.next?.planned_start || c.planned_end || c.planned_start;
      return `<tr onclick="campaignDetail('${c.id}')">
        <td><div class="cell-main clamp2">${esc(c.name)}</div><div class="cell-sub">${esc(c.association_activity_type || '公會行銷案')}｜點選查看專案說明</div></td>
        <td class="status-col">${tag(c.status)}<div style="margin-top:5px">${priorityTag(c.priority || '中')}</div></td>
        <td><div class="cell-main">待辦 ${summary.open.length} / 全部 ${summary.tasks.length}</div><div class="cell-sub clamp2">下一步：${esc(summary.next?.task_name || c.purpose || '待補')}</div></td>
        <td class="date-col"><div class="cell-main">${fdFull(nextDate || '')}</div><div class="cell-sub">進度 ${summary.avg}%</div></td>
        <td><div class="cell-main clip">${esc(c.owner || '未指定')}</div><div class="cell-sub clamp2">${esc(c.owner_unit || '-')}</div></td>
      </tr>`;
    }).join('');
    const nativeRows = associationNativeItems(ASSOC_TASKS, a.id).map(t => `<tr onclick="openAssocTaskModal('${t.id}')">
      <td><div class="cell-main clamp2">${esc(t.task_name)}</div><div class="cell-sub">公會專屬任務｜未關聯行銷案</div></td>
      <td class="status-col">${simpleStatusTag(t.task_status)}<div style="margin-top:5px">${priorityTag(t.priority || '中')}</div></td>
      <td><div class="cell-main">${esc(t.task_type || '任務')}</div><div class="cell-sub clamp2">下一步：${esc(t.next_step || '待補')}</div></td>
      <td class="date-col"><div class="cell-main">${fdFull(t.due_date || '')}</div><div class="cell-sub">進度 ${Number(t.progress_pct) || 0}%</div></td>
      <td><div class="cell-main clip">${esc(t.owner || '-')}</div><div class="cell-sub">開始 ${fdFull(t.start_date || '')}</div></td>
    </tr>`).join('');
    const rows = campaignRows + nativeRows;
    return `<div class="card" style="margin-bottom:16px">
      <div class="dash-panel-head">
        <div><div class="dash-panel-title">${esc(a.name)}</div><div class="muted-text">以行銷案為主顯示；點選行銷案進入專案說明與任務明細</div></div>
      </div>
      <div class="tw"><table class="assoc-table"><thead><tr><th>行銷案 / 類型</th><th class="status-col">狀態</th><th>任務摘要</th><th class="date-col">期限 / 進度</th><th>負責 / 單位</th></tr></thead><tbody>${rows}</tbody></table>${rows ? '' : '<div class="empty">尚無關聯行銷案或公會專屬任務</div>'}</div>
    </div>`;
  }).join('');
  return sections || '<div class="empty">尚無任務紀錄；若儲存時出現錯誤，請先執行 schema_v19_association_tasks_expenses.sql 與 schema_v20_association_task_campaign_options.sql</div>';
}
function renderAssocExpenses(){
  const sections = ASSOCIATIONS.map(a => {
    const campaignRows = associationCampaignContext(a.id, ASSOC_EXPENSES).map(c => {
      const expenses = campaignExpenseSummary(c.id);
      const actualTotal = (Number(c.actual_spend) || 0) + expenses.actual;
      return `<tr onclick="campaignDetail('${c.id}')">
        <td><div class="cell-main clamp2">${esc(c.name)}</div><div class="cell-sub">${esc(c.association_activity_type || '公會行銷案')}｜點選查看預算明細</div></td>
        <td class="money-col"><div class="mono">內估 ${fmt(c.budget)}</div><div class="cell-sub">實支 ${fmt(actualTotal)}</div></td>
        <td><div class="cell-main">預算項目 ${expenses.items.length} 筆 / 公會費用 ${expenses.expenses.length} 筆</div><div class="cell-sub">明細合計 ${fmt(expenses.total)}｜待確認 ${expenses.pending.length} 筆</div></td>
        <td class="money-col"><div class="mono">預估補助 ${fmt(c.subsidy_planned)}</div><div class="cell-sub">實際補助 ${fmt(c.subsidy_received)}</div></td>
        <td class="status-col">${subsidyStateTag(c)}<div class="cell-sub clip">${esc(c.midea_budget_code || c.claim_status || '待補')}</div></td>
      </tr>`;
    }).join('');
    const nativeRows = associationNativeItems(ASSOC_EXPENSES, a.id).map(e => `<tr onclick="openAssocExpenseModal('${e.id}')">
      <td><div class="cell-main clamp2">${esc(taskName(e.task_id))}</div><div class="cell-sub">公會專屬費用｜未關聯行銷案</div></td>
      <td class="money-col"><div class="mono">預算 ${fmt(e.budget_amount)}</div><div class="cell-sub">實支 ${fmt(e.actual_amount)}</div></td>
      <td><div class="cell-main">${esc(e.expense_type || '費用')}</div><div class="cell-sub">${simpleStatusTag(e.payment_status)}</div></td>
      <td><div class="cell-main">${fdFull(e.payment_date || '')}</div><div class="cell-sub clamp2">${esc(e.receipt_status || '-')}</div></td>
      <td><div class="clamp2">${esc(e.notes || e.receipt_attachment || '-')}</div></td>
    </tr>`).join('');
    const rows = campaignRows + nativeRows;
    return `<div class="card" style="margin-bottom:16px">
      <div class="dash-panel-head">
        <div><div class="dash-panel-title">${esc(a.name)}</div><div class="muted-text">以行銷案彙總費用、預算項目與美的補助</div></div>
      </div>
      <div class="tw"><table class="assoc-table"><thead><tr><th>行銷案 / 類型</th><th class="money-col">內估 / 實支</th><th>預算項目</th><th class="money-col">補助</th><th class="status-col">申請狀態</th></tr></thead><tbody>${rows}</tbody></table>${rows ? '' : '<div class="empty">尚無關聯行銷案或公會專屬費用</div>'}</div>
    </div>`;
  }).join('');
  return sections || '<div class="empty">尚無任務費用紀錄；若儲存時出現錯誤，請先執行 schema_v19_association_tasks_expenses.sql</div>';
}
function renderAssocFees(){
  const rows = ASSOC_FEES.map(f => `<tr onclick="openAssocFeeModal('${f.id}')">
    <td><div class="cell-main clamp2">${esc(assocName(f.association_id))}</div><div class="cell-sub mono">${esc(f.year)}</div></td>
    <td class="money-col mono">NT$ ${fmt(f.fee_amount)}</td>
    <td class="status-col">${simpleStatusTag(f.payment_status)}</td>
    <td><div class="cell-main">到期 ${fdFull(f.due_date || '')}</div><div class="cell-sub">提醒 ${fdFull(f.renewal_reminder_date || '')}</div></td>
    <td><div class="cell-main">${fdFull(f.payment_date || '')}</div><div class="cell-sub clamp2">${esc(f.receipt_status || '-')}</div></td>
    <td><div class="clamp2">${esc(f.notes || '-')}</div></td>
  </tr>`).join('');
  return `<div class="tw"><table class="assoc-table"><thead><tr><th>公會 / 年度</th><th class="money-col">年費</th><th class="status-col">狀態</th><th>到期 / 提醒</th><th>繳費 / 收據</th><th>備註</th></tr></thead><tbody>${rows}</tbody></table>${rows ? '' : '<div class="empty">尚無年費紀錄</div>'}</div>`;
}
function renderAssocBenefits(){
  const rows = ASSOC_BENEFITS.map(b => `<tr onclick="openAssocBenefitModal('${b.id}')">
    <td><div class="cell-main clamp2">${esc(b.benefit_name)}</div><div class="cell-sub clamp2">${esc(assocName(b.association_id))}</div></td>
    <td class="status-col"><span class="case-tag">${esc(b.benefit_type)}</span><div style="margin-top:6px">${simpleStatusTag(b.usage_status)}</div></td>
    <td class="date-col">${fdFull(b.valid_until || '')}</td>
    <td class="owner-col"><div class="clip">${esc(b.owner || '-')}</div></td>
    <td><div class="clamp2">${esc(b.notes || b.description || '-')}</div></td>
  </tr>`).join('');
  const noteRows = ASSOC_NOTES.map(n => `<tr onclick="openAssocNoteModal('${n.id}')">
    <td><div class="cell-main clamp2">${esc(n.note_title)}</div><div class="cell-sub clamp2">${esc(assocName(n.association_id))}</div></td>
    <td class="owner-col"><div class="clip">${esc(n.owner || '-')}</div></td>
    <td><div class="clamp2">${esc(n.attachment || '-')}</div></td>
    <td><div class="clamp2">${esc(n.note || '-')}</div></td>
    <td class="date-col">${fdFull(n.updated_at?.slice(0, 10) || '')}</td>
  </tr>`).join('');
  return `<div class="card" style="margin-bottom:16px"><div class="dash-panel-head"><div><div class="dash-panel-title">會員權益</div><div class="muted-text">期刊曝光、活動參與、協辦活動、會員名錄與課程講座</div></div></div><div class="tw"><table class="assoc-table"><thead><tr><th>權益 / 公會</th><th class="status-col">類型 / 狀態</th><th class="date-col">有效期限</th><th class="owner-col">負責人</th><th>說明 / 備註</th></tr></thead><tbody>${rows}</tbody></table>${rows ? '' : '<div class="empty">尚無會員權益紀錄</div>'}</div></div>
  <div class="card"><div class="dash-panel-head"><div><div class="dash-panel-title">備註與附件</div><div class="muted-text">記錄跨年度待補事項、雲端連結、檔名或附件存放位置</div></div><button class="btn btn-sm btn-primary" onclick="openAssocNoteModal()">＋ 新增備註</button></div><div class="tw"><table class="assoc-table"><thead><tr><th>備註 / 公會</th><th class="owner-col">負責人</th><th>附件欄位</th><th>備註內容</th><th class="date-col">最後更新</th></tr></thead><tbody>${noteRows}</tbody></table>${noteRows ? '' : '<div class="empty">尚無備註附件紀錄；若儲存時出現錯誤，請先執行 schema_v18_association_notes.sql</div>'}</div></div>`;
}
function renderAssocPublications(){
  const sections = ASSOCIATIONS.map(a => {
    const campaignRows = associationCampaignContext(a.id, ASSOC_PUBLICATIONS).map(c => {
      const summary = campaignPublicationSummary(c.id);
      const next = summary.next;
      return `<tr onclick="campaignDetail('${c.id}')">
        <td><div class="cell-main clamp2">${esc(c.name)}</div><div class="cell-sub">${esc(c.association_activity_type || '公會行銷案')}｜期刊 ${summary.publications.length} 筆</div></td>
        <td><div class="cell-main">截稿 ${fdFull(next?.deadline_date || '')}</div><div class="cell-sub">發刊 ${fdFull(next?.publish_date || '')}</div></td>
        <td><div class="clamp2">${esc(next?.publication_name || '待補')}</div><div class="cell-sub clamp2">${esc(next?.topic || c.purpose || '-')}</div></td>
        <td class="status-col">${simpleStatusTag(next?.material_status || (summary.open.length ? '準備中' : '不適用'))}<div class="cell-sub">待準備 ${summary.open.length} 筆</div></td>
        <td class="owner-col"><div class="clip">${esc(next?.owner || c.owner || '-')}</div><div class="cell-sub">${fdFull(next?.submission_date || '')}</div></td>
      </tr>`;
    }).join('');
    const nativeRows = associationNativeItems(ASSOC_PUBLICATIONS, a.id).map(p => `<tr onclick="openAssocPubModal('${p.id}')">
      <td><div class="cell-main clamp2">${esc(p.publication_name)}</div><div class="cell-sub">公會專屬期刊｜${esc(taskName(p.task_id))}</div></td>
      <td><div class="cell-main">截稿 ${fdFull(p.deadline_date || '')}</div><div class="cell-sub">發刊 ${fdFull(p.publish_date || '')}</div></td>
      <td><div class="clamp2">${esc(p.topic || '-')}</div><div class="cell-sub clamp2">${esc(joinList(p.required_materials) || '-')}</div></td>
      <td class="status-col">${simpleStatusTag(p.material_status)}</td>
      <td class="owner-col"><div class="clip">${esc(p.owner || '-')}</div><div class="cell-sub">${fdFull(p.submission_date || '')}</div></td>
    </tr>`).join('');
    const rows = campaignRows + nativeRows;
    return `<div class="card" style="margin-bottom:16px">
      <div class="dash-panel-head">
        <div><div class="dash-panel-title">${esc(a.name)}</div><div class="muted-text">期刊排程以行銷案或公會單位歸類；點選行銷案查看專案說明</div></div>
      </div>
      <div class="tw"><table class="assoc-table"><thead><tr><th>行銷案 / 期刊</th><th>日期</th><th>主題 / 素材</th><th class="status-col">素材狀態</th><th class="owner-col">負責 / 送件</th></tr></thead><tbody>${rows}</tbody></table>${rows ? '' : '<div class="empty">尚無關聯行銷案或期刊排程</div>'}</div>
    </div>`;
  }).join('');
  return sections || '<div class="empty">尚無期刊排程</div>';
}
function renderAssocEvents(){
  const sections = ASSOCIATIONS.map(a => {
    const campaignRows = associationCampaignContext(a.id, ASSOC_EVENTS).map(c => {
      const summary = campaignEventSummary(c.id);
      const event = summary.next;
      return `<tr onclick="campaignDetail('${c.id}')">
        <td><div class="cell-main clamp2">${esc(c.name)}</div><div class="cell-sub">行銷案同步｜活動 ${summary.events.length || 1} 筆</div></td>
        <td class="status-col"><span class="case-tag">${esc(event?.event_type || c.association_activity_type || '公會活動')}</span><div style="margin-top:6px">${simpleStatusTag(event?.event_status || '待確認')}</div></td>
        <td><div class="cell-main">${fdFull(event?.event_date || '')}</div><div class="cell-sub clamp2">${esc(event?.location || c.owner_unit || '-')}</div></td>
        <td><div class="cell-main">${esc(event?.meisun_role || (c.association_activity_type === '年度贊助' ? '贊助' : '會員參與'))}</div><div class="cell-sub clip">${esc(event?.owner || c.owner || '-')}</div></td>
        <td class="money-col"><div class="mono">預算 ${fmt(event?.budget ?? c.budget)}</div><div class="cell-sub">實支 ${fmt(event?.actual_spend ?? c.actual_spend)}</div></td>
      </tr>`;
    }).join('');
    const nativeRows = associationNativeItems(ASSOC_EVENTS, a.id).map(e => `<tr onclick="openAssocEventModal('${e.id}')">
      <td><div class="cell-main clamp2">${esc(e.event_name)}</div><div class="cell-sub">公會專屬活動｜${esc(taskName(e.task_id))}</div></td>
      <td class="status-col"><span class="case-tag">${esc(e.event_type)}</span><div style="margin-top:6px">${simpleStatusTag(e.event_status)}</div></td>
      <td><div class="cell-main">${fdFull(e.event_date || '')}</div><div class="cell-sub clamp2">${esc(e.location || '-')}</div></td>
      <td><div class="cell-main">${esc(e.meisun_role || '-')}</div><div class="cell-sub clip">${esc(e.owner || '-')}</div></td>
      <td class="money-col"><div class="mono">預算 ${fmt(e.budget)}</div><div class="cell-sub">實支 ${fmt(e.actual_spend)}</div></td>
    </tr>`).join('');
    const rows = campaignRows + nativeRows;
    return `<div class="card" style="margin-bottom:16px">
      <div class="dash-panel-head">
        <div><div class="dash-panel-title">${esc(a.name)}</div><div class="muted-text">會員大會、協辦、贊助與講座以行銷案為主彙整</div></div>
      </div>
      <div class="tw"><table class="assoc-table"><thead><tr><th>行銷案 / 活動</th><th class="status-col">類型 / 狀態</th><th>日期 / 地點</th><th>角色 / 負責</th><th class="money-col">費用</th></tr></thead><tbody>${rows}</tbody></table>${rows ? '' : '<div class="empty">尚無關聯行銷案或會員大會 / 活動紀錄</div>'}</div>
    </div>`;
  }).join('');
  return sections || '<div class="empty">尚無會員大會 / 活動紀錄</div>';
}

function openAssociationModal(id){
  editAssociationId = id || null;
  const a = id ? assocById(id) : null;
  document.getElementById('am-title').textContent = id ? '編輯公會資料' : '新增公會';
  document.getElementById('am-name').value = a?.name || '';
  setCustomSelect('am-type', ASSOC_TYPE_OPTIONS, a?.association_type || '技師公會', existingValues(ASSOCIATIONS, 'association_type'));
  setCustomSelect('am-status', ASSOC_JOIN_STATUS_OPTIONS, a?.join_status || '已加入', existingValues(ASSOCIATIONS, 'join_status'));
  document.getElementById('am-member').value = a?.member_no || '';
  document.getElementById('am-contact').value = a?.primary_contact || '';
  document.getElementById('am-phone').value = a?.phone || '';
  document.getElementById('am-email').value = a?.email || '';
  document.getElementById('am-address').value = a?.address || '';
  document.getElementById('am-website').value = a?.website || '';
  document.getElementById('am-line').value = a?.line_url || '';
  document.getElementById('am-owner').value = a?.internal_owner || '';
  document.getElementById('am-notes').value = a?.notes || '';
  document.getElementById('am-delete').style.display = id ? '' : 'none';
  openM('massociation');
}
async function saveAssociation(){
  const name = document.getElementById('am-name').value.trim();
  if (!name) { alert('請輸入公會名稱'); return; }
  const payload = {
    name,
    association_type: document.getElementById('am-type').value,
    join_status: document.getElementById('am-status').value,
    member_no: document.getElementById('am-member').value.trim() || null,
    primary_contact: document.getElementById('am-contact').value.trim() || null,
    phone: document.getElementById('am-phone').value.trim() || null,
    email: document.getElementById('am-email').value.trim() || null,
    address: document.getElementById('am-address').value.trim() || null,
    website: document.getElementById('am-website').value.trim() || null,
    line_url: document.getElementById('am-line').value.trim() || null,
    internal_owner: document.getElementById('am-owner').value.trim() || null,
    notes: document.getElementById('am-notes').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  try {
    if (editAssociationId) await PATCH(`associations?id=eq.${editAssociationId}`, payload);
    else await POST('associations', payload);
  } catch (e) { alert('公會資料表尚未啟用，請先執行 schema_v17_associations.sql。'); return; }
  closeM('massociation');
  await renderAssociationsPage();
}
async function delAssociation(){
  if (!editAssociationId) return;
  if (!confirm('確定刪除此公會？相關年費、權益、期刊與活動紀錄也會刪除。')) return;
  await DEL(`associations?id=eq.${editAssociationId}`);
  closeM('massociation');
  await renderAssociationsPage();
}

function setAssocSelect(id, selected){ document.getElementById(id).innerHTML = assocSelectOptions(selected); }
function setAssocTaskSelect(id, associationId, selected){ document.getElementById(id).innerHTML = taskSelectOptions(associationId, selected); }
function defaultAssocId(){ return ASSOCIATIONS[0]?.id || ''; }
function openAssocFeeModal(id){
  editAssocFeeId = id || null;
  const f = id ? ASSOC_FEES.find(x => x.id === id) : null;
  document.getElementById('af-title').textContent = id ? '編輯年費與續會' : '新增年費與續會';
  setAssocSelect('af-assoc', f?.association_id || defaultAssocId());
  document.getElementById('af-year').value = f?.year || new Date().getFullYear();
  document.getElementById('af-amount').value = f?.fee_amount ?? '';
  setCustomSelect('af-status', ASSOC_FEE_STATUS_OPTIONS, f?.payment_status || '未繳', existingValues(ASSOC_FEES, 'payment_status'));
  document.getElementById('af-paid').value = f?.payment_date || '';
  document.getElementById('af-due').value = f?.due_date || '';
  document.getElementById('af-receipt-status').value = f?.receipt_status || '';
  document.getElementById('af-reminder').value = f?.renewal_reminder_date || '';
  document.getElementById('af-attachment').value = f?.receipt_attachment || '';
  document.getElementById('af-notes').value = f?.notes || '';
  document.getElementById('af-delete').style.display = id ? '' : 'none';
  openM('massocfee');
}
async function saveAssocFee(){
  const payload = {
    association_id: document.getElementById('af-assoc').value,
    year: Number(document.getElementById('af-year').value) || new Date().getFullYear(),
    fee_amount: document.getElementById('af-amount').value || null,
    payment_status: document.getElementById('af-status').value,
    payment_date: document.getElementById('af-paid').value || null,
    due_date: document.getElementById('af-due').value || null,
    receipt_status: document.getElementById('af-receipt-status').value.trim() || null,
    receipt_attachment: document.getElementById('af-attachment').value.trim() || null,
    renewal_reminder_date: document.getElementById('af-reminder').value || null,
    notes: document.getElementById('af-notes').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  if (editAssocFeeId) await PATCH(`association_fee_records?id=eq.${editAssocFeeId}`, payload);
  else await POST('association_fee_records', payload);
  closeM('massocfee'); ASSOC_TAB = 'fees'; await renderAssociationsPage();
}
async function delAssocFee(){ if (!editAssocFeeId || !confirm('確定刪除此年費紀錄？')) return; await DEL(`association_fee_records?id=eq.${editAssocFeeId}`); closeM('massocfee'); ASSOC_TAB = 'fees'; await renderAssociationsPage(); }

function openAssocBenefitModal(id){
  editAssocBenefitId = id || null;
  const b = id ? ASSOC_BENEFITS.find(x => x.id === id) : null;
  document.getElementById('ab-title').textContent = id ? '編輯會員權益' : '新增會員權益';
  setAssocSelect('ab-assoc', b?.association_id || defaultAssocId());
  document.getElementById('ab-name').value = b?.benefit_name || '';
  setCustomSelect('ab-type', ASSOC_BENEFIT_TYPE_OPTIONS, b?.benefit_type || '其他', existingValues(ASSOC_BENEFITS, 'benefit_type'));
  setCustomSelect('ab-status', ASSOC_USAGE_STATUS_OPTIONS, b?.usage_status || '未使用', existingValues(ASSOC_BENEFITS, 'usage_status'));
  document.getElementById('ab-valid').value = b?.valid_until || '';
  document.getElementById('ab-owner').value = b?.owner || '';
  document.getElementById('ab-desc').value = b?.description || '';
  document.getElementById('ab-notes').value = b?.notes || '';
  document.getElementById('ab-delete').style.display = id ? '' : 'none';
  openM('massocbenefit');
}
async function saveAssocBenefit(){
  const name = document.getElementById('ab-name').value.trim();
  if (!name) { alert('請輸入權益名稱'); return; }
  const payload = { association_id: document.getElementById('ab-assoc').value, benefit_name: name, benefit_type: document.getElementById('ab-type').value, usage_status: document.getElementById('ab-status').value, valid_until: document.getElementById('ab-valid').value || null, owner: document.getElementById('ab-owner').value.trim() || null, description: document.getElementById('ab-desc').value.trim() || null, notes: document.getElementById('ab-notes').value.trim() || null, updated_at: new Date().toISOString() };
  if (editAssocBenefitId) await PATCH(`association_benefits?id=eq.${editAssocBenefitId}`, payload);
  else await POST('association_benefits', payload);
  closeM('massocbenefit'); ASSOC_TAB = 'benefits'; await renderAssociationsPage();
}
async function delAssocBenefit(){ if (!editAssocBenefitId || !confirm('確定刪除此會員權益？')) return; await DEL(`association_benefits?id=eq.${editAssocBenefitId}`); closeM('massocbenefit'); ASSOC_TAB = 'benefits'; await renderAssociationsPage(); }

function openAssocTaskModal(id){
  editAssocTaskId = id || null;
  const t = id ? ASSOC_TASKS.find(x => x.id === id) : null;
  document.getElementById('at-title').textContent = id ? '編輯公會任務' : '新增公會任務';
  setAssocSelect('at-assoc', t?.association_id || defaultAssocId());
  setCampaignSelect('at-campaign', t?.marketing_campaign_id || '');
  document.getElementById('at-name').value = t?.task_name || '';
  setCustomSelect('at-type', ASSOC_TASK_TYPE_OPTIONS, t?.task_type || '其他', existingValues(ASSOC_TASKS, 'task_type'));
  setCustomSelect('at-status', ASSOC_TASK_STATUS_OPTIONS, t?.task_status || '待確認', existingValues(ASSOC_TASKS, 'task_status'));
  setCustomSelect('at-priority', PRIORITY_ORDER, t?.priority || '中', existingValues(ASSOC_TASKS, 'priority'));
  document.getElementById('at-start').value = t?.start_date || '';
  document.getElementById('at-due').value = t?.due_date || '';
  document.getElementById('at-completed').value = t?.completed_date || '';
  document.getElementById('at-progress').value = t?.progress_pct ?? 0;
  document.getElementById('at-owner').value = t?.owner || '';
  document.getElementById('at-desc').value = t?.description || '';
  document.getElementById('at-next').value = t?.next_step || '';
  document.getElementById('at-materials').value = joinList(t?.required_materials) || '';
  document.getElementById('at-attachment').value = t?.attachment || '';
  document.getElementById('at-notes').value = t?.notes || '';
  document.getElementById('at-delete').style.display = id ? '' : 'none';
  openM('massoctask');
}
async function saveAssocTask(){
  const name = document.getElementById('at-name').value.trim();
  if (!name) { alert('請輸入任務名稱'); return; }
  const payload = {
    association_id: document.getElementById('at-assoc').value,
    marketing_campaign_id: document.getElementById('at-campaign').value || null,
    task_name: name,
    task_type: document.getElementById('at-type').value,
    task_status: document.getElementById('at-status').value,
    priority: document.getElementById('at-priority').value,
    start_date: document.getElementById('at-start').value || null,
    due_date: document.getElementById('at-due').value || null,
    completed_date: document.getElementById('at-completed').value || null,
    progress_pct: Math.max(0, Math.min(100, Number(document.getElementById('at-progress').value) || 0)),
    owner: document.getElementById('at-owner').value.trim() || null,
    description: document.getElementById('at-desc').value.trim() || null,
    next_step: document.getElementById('at-next').value.trim() || null,
    required_materials: splitList(document.getElementById('at-materials').value),
    attachment: document.getElementById('at-attachment').value.trim() || null,
    notes: document.getElementById('at-notes').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  try {
    if (editAssocTaskId) await PATCH(`association_tasks?id=eq.${editAssocTaskId}`, payload);
    else await POST('association_tasks', payload);
  } catch (e) { alert('任務資料表尚未啟用或尚未支援行銷專案關聯，請先執行 schema_v19_association_tasks_expenses.sql 與 schema_v20_association_task_campaign_options.sql。'); return; }
  closeM('massoctask'); ASSOC_TAB = 'tasks'; await renderAssociationsPage();
}
async function delAssocTask(){
  if (!editAssocTaskId || !confirm('確定刪除此公會任務？相關費用會保留但解除任務關聯。')) return;
  await DEL(`association_tasks?id=eq.${editAssocTaskId}`);
  closeM('massoctask'); ASSOC_TAB = 'tasks'; await renderAssociationsPage();
}

function openAssocExpenseModal(id){
  editAssocExpenseId = id || null;
  const e = id ? ASSOC_EXPENSES.find(x => x.id === id) : null;
  const assocId = e?.association_id || defaultAssocId();
  document.getElementById('ax-title').textContent = id ? '編輯任務費用' : '新增任務費用';
  setAssocSelect('ax-assoc', assocId);
  setAssocTaskSelect('ax-task', assocId, e?.task_id || '');
  setCustomSelect('ax-type', ASSOC_EXPENSE_TYPE_OPTIONS, e?.expense_type || '其他', existingValues(ASSOC_EXPENSES, 'expense_type'));
  document.getElementById('ax-budget').value = e?.budget_amount ?? '';
  document.getElementById('ax-actual').value = e?.actual_amount ?? '';
  setCustomSelect('ax-status', ASSOC_EXPENSE_STATUS_OPTIONS, e?.payment_status || '未付款', existingValues(ASSOC_EXPENSES, 'payment_status'));
  document.getElementById('ax-paid').value = e?.payment_date || '';
  document.getElementById('ax-receipt-status').value = e?.receipt_status || '';
  document.getElementById('ax-attachment').value = e?.receipt_attachment || '';
  document.getElementById('ax-notes').value = e?.notes || '';
  document.getElementById('ax-delete').style.display = id ? '' : 'none';
  openM('massocexpense');
}
async function saveAssocExpense(){
  const payload = {
    association_id: document.getElementById('ax-assoc').value,
    task_id: document.getElementById('ax-task').value || null,
    expense_type: document.getElementById('ax-type').value,
    budget_amount: document.getElementById('ax-budget').value || null,
    actual_amount: document.getElementById('ax-actual').value || null,
    payment_status: document.getElementById('ax-status').value,
    payment_date: document.getElementById('ax-paid').value || null,
    receipt_status: document.getElementById('ax-receipt-status').value.trim() || null,
    receipt_attachment: document.getElementById('ax-attachment').value.trim() || null,
    notes: document.getElementById('ax-notes').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  try {
    if (editAssocExpenseId) await PATCH(`association_task_expenses?id=eq.${editAssocExpenseId}`, payload);
    else await POST('association_task_expenses', payload);
  } catch (e) { alert('任務費用資料表尚未啟用，請先執行 schema_v19_association_tasks_expenses.sql。'); return; }
  closeM('massocexpense'); ASSOC_TAB = 'expenses'; await renderAssociationsPage();
}
async function delAssocExpense(){
  if (!editAssocExpenseId || !confirm('確定刪除此任務費用？')) return;
  await DEL(`association_task_expenses?id=eq.${editAssocExpenseId}`);
  closeM('massocexpense'); ASSOC_TAB = 'expenses'; await renderAssociationsPage();
}

function openAssocPubModal(id){
  editAssocPubId = id || null;
  const p = id ? ASSOC_PUBLICATIONS.find(x => x.id === id) : null;
  document.getElementById('ap-title').textContent = id ? '編輯期刊排程' : '新增期刊排程';
  setAssocSelect('ap-assoc', p?.association_id || defaultAssocId());
  setAssocTaskSelect('ap-task', p?.association_id || defaultAssocId(), p?.task_id || '');
  document.getElementById('ap-name').value = p?.publication_name || '';
  document.getElementById('ap-publish').value = p?.publish_date || '';
  document.getElementById('ap-deadline').value = p?.deadline_date || '';
  document.getElementById('ap-spec').value = p?.ad_spec || '';
  document.getElementById('ap-topic').value = p?.topic || '';
  document.getElementById('ap-materials').value = joinList(p?.required_materials) || ASSOC_MATERIALS.slice(0, 6).join('、');
  setCustomSelect('ap-status', ASSOC_PUBLICATION_STATUS_OPTIONS, p?.material_status || '未開始', existingValues(ASSOC_PUBLICATIONS, 'material_status'));
  document.getElementById('ap-owner').value = p?.owner || '';
  document.getElementById('ap-submit').value = p?.submission_date || '';
  document.getElementById('ap-result').value = p?.result_notes || '';
  document.getElementById('ap-attachment').value = p?.attachment || '';
  document.getElementById('ap-delete').style.display = id ? '' : 'none';
  openM('massocpub');
}
async function saveAssocPub(){
  const name = document.getElementById('ap-name').value.trim();
  if (!name) { alert('請輸入期刊名稱'); return; }
  const payload = { association_id: document.getElementById('ap-assoc').value, task_id: document.getElementById('ap-task').value || null, publication_name: name, publish_date: document.getElementById('ap-publish').value || null, deadline_date: document.getElementById('ap-deadline').value || null, ad_spec: document.getElementById('ap-spec').value.trim() || null, topic: document.getElementById('ap-topic').value.trim() || null, required_materials: splitList(document.getElementById('ap-materials').value), material_status: document.getElementById('ap-status').value, owner: document.getElementById('ap-owner').value.trim() || null, submission_date: document.getElementById('ap-submit').value || null, result_notes: document.getElementById('ap-result').value.trim() || null, attachment: document.getElementById('ap-attachment').value.trim() || null, updated_at: new Date().toISOString() };
  if (editAssocPubId) await PATCH(`association_publication_schedules?id=eq.${editAssocPubId}`, payload);
  else await POST('association_publication_schedules', payload);
  closeM('massocpub'); ASSOC_TAB = 'publications'; await renderAssociationsPage();
}
async function delAssocPub(){ if (!editAssocPubId || !confirm('確定刪除此期刊排程？')) return; await DEL(`association_publication_schedules?id=eq.${editAssocPubId}`); closeM('massocpub'); ASSOC_TAB = 'publications'; await renderAssociationsPage(); }

function openAssocEventModal(id){
  editAssocEventId = id || null;
  const e = id ? ASSOC_EVENTS.find(x => x.id === id) : null;
  document.getElementById('ae-title').textContent = id ? '編輯會員大會 / 活動' : '新增會員大會 / 活動';
  setAssocSelect('ae-assoc', e?.association_id || defaultAssocId());
  setAssocTaskSelect('ae-task', e?.association_id || defaultAssocId(), e?.task_id || '');
  document.getElementById('ae-name').value = e?.event_name || '';
  setCustomSelect('ae-type', ASSOC_EVENT_TYPE_OPTIONS, e?.event_type || '其他', existingValues(ASSOC_EVENTS, 'event_type'));
  document.getElementById('ae-date').value = e?.event_date || '';
  document.getElementById('ae-location').value = e?.location || '';
  document.getElementById('ae-organizer').value = e?.organizer || '';
  setCustomSelect('ae-role', ASSOC_ROLE_OPTIONS, e?.meisun_role || '', existingValues(ASSOC_EVENTS, 'meisun_role'), '未填');
  document.getElementById('ae-budget').value = e?.budget ?? '';
  document.getElementById('ae-spend').value = e?.actual_spend ?? '';
  document.getElementById('ae-materials').value = joinList(e?.required_materials) || ASSOC_MATERIALS.slice(6).join('、');
  setCustomSelect('ae-status', ASSOC_EVENT_STATUS_OPTIONS, e?.event_status || '待確認', existingValues(ASSOC_EVENTS, 'event_status'));
  document.getElementById('ae-owner').value = e?.owner || '';
  document.getElementById('ae-result').value = e?.result_notes || '';
  document.getElementById('ae-attachment').value = e?.attachment || '';
  document.getElementById('ae-delete').style.display = id ? '' : 'none';
  openM('massocevent');
}
async function saveAssocEvent(){
  const name = document.getElementById('ae-name').value.trim();
  if (!name) { alert('請輸入活動名稱'); return; }
  const payload = { association_id: document.getElementById('ae-assoc').value, task_id: document.getElementById('ae-task').value || null, event_name: name, event_type: document.getElementById('ae-type').value, event_date: document.getElementById('ae-date').value || null, location: document.getElementById('ae-location').value.trim() || null, organizer: document.getElementById('ae-organizer').value.trim() || null, meisun_role: document.getElementById('ae-role').value || null, budget: document.getElementById('ae-budget').value || null, actual_spend: document.getElementById('ae-spend').value || null, required_materials: splitList(document.getElementById('ae-materials').value), event_status: document.getElementById('ae-status').value, owner: document.getElementById('ae-owner').value.trim() || null, result_notes: document.getElementById('ae-result').value.trim() || null, attachment: document.getElementById('ae-attachment').value.trim() || null, updated_at: new Date().toISOString() };
  if (editAssocEventId) await PATCH(`association_events?id=eq.${editAssocEventId}`, payload);
  else await POST('association_events', payload);
  closeM('massocevent'); ASSOC_TAB = 'events'; await renderAssociationsPage();
}
async function delAssocEvent(){ if (!editAssocEventId || !confirm('確定刪除此活動？')) return; await DEL(`association_events?id=eq.${editAssocEventId}`); closeM('massocevent'); ASSOC_TAB = 'events'; await renderAssociationsPage(); }

function openAssocNoteModal(id){
  editAssocNoteId = id || null;
  const n = id ? ASSOC_NOTES.find(x => x.id === id) : null;
  document.getElementById('an-title').textContent = id ? '編輯備註附件' : '新增備註附件';
  setAssocSelect('an-assoc', n?.association_id || defaultAssocId());
  document.getElementById('an-name').value = n?.note_title || '';
  document.getElementById('an-owner').value = n?.owner || '';
  document.getElementById('an-attachment').value = n?.attachment || '';
  document.getElementById('an-note').value = n?.note || '';
  document.getElementById('an-delete').style.display = id ? '' : 'none';
  openM('massocnote');
}
async function saveAssocNote(){
  const title = document.getElementById('an-name').value.trim();
  if (!title) { alert('請輸入備註標題'); return; }
  const payload = {
    association_id: document.getElementById('an-assoc').value,
    note_title: title,
    owner: document.getElementById('an-owner').value.trim() || null,
    attachment: document.getElementById('an-attachment').value.trim() || null,
    note: document.getElementById('an-note').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  try {
    if (editAssocNoteId) await PATCH(`association_notes?id=eq.${editAssocNoteId}`, payload);
    else await POST('association_notes', payload);
  } catch (e) { alert('備註附件資料表尚未啟用，請先執行 schema_v18_association_notes.sql。'); return; }
  closeM('massocnote'); ASSOC_TAB = 'benefits'; await renderAssociationsPage();
}
async function delAssocNote(){
  if (!editAssocNoteId || !confirm('確定刪除此備註附件？')) return;
  await DEL(`association_notes?id=eq.${editAssocNoteId}`);
  closeM('massocnote'); ASSOC_TAB = 'benefits'; await renderAssociationsPage();
}

function distinctUnits(){
  return [...new Set(CAMPAIGNS.map(c => c.owner_unit).filter(Boolean))].sort();
}

function onUnitSelectChange(){
  const sel = document.getElementById('cm-unit');
  const wrap = document.getElementById('cm-unit-new-wrap');
  if (sel.value === '__new__') { wrap.style.display = ''; document.getElementById('cm-unit-new').focus(); }
  else { wrap.style.display = 'none'; }
}

function renderVendorRows(){
  const el = document.getElementById('cm-vendors-list');
  el.innerHTML = vendorRows.map((v, i) => `
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <input value="${esc(v)}" oninput="vendorRows[${i}]=this.value" placeholder="外包公司名稱" style="flex:1;padding:10px 12px;border-radius:3px;border:1.5px solid var(--line);font-size:15px;background:var(--paper)">
      <button type="button" class="btn btn-red btn-sm" onclick="removeVendorRow(${i})">移除</button>
    </div>`).join('') || '<div class="muted-text" style="font-size:13px">尚未新增外包公司</div>';
}
function addVendorRow(){ vendorRows.push(''); renderVendorRows(); }
function removeVendorRow(i){ vendorRows.splice(i, 1); renderVendorRows(); }

async function openCampaignModal(id){
  if (!ASSOCIATIONS.length) ASSOCIATIONS = await safeGET('associations?order=name.asc');
  editCampaignId = id || null;
  let c = id ? CAMPAIGNS.find(x => x.id === id) : null;
  if (id && !c) {
    const rows = await GET(`marketing_campaigns?id=eq.${id}`);
    c = rows?.[0] || null;
  }
  document.getElementById('cm-title').textContent = id ? '編輯行銷案' : '新增行銷案';
  document.getElementById('cm-name').value = c?.name || '';
  document.getElementById('cm-association').innerHTML = campaignAssociationOptions(c?.association_id || '');
  setCustomSelect('cm-assoc-activity', CAMPAIGN_ASSOC_ACTIVITY_OPTIONS, c?.association_activity_type || '', existingValues(CAMPAIGNS, 'association_activity_type'), '不指定');
  document.getElementById('cm-budget').value = c?.budget ?? '';
  document.getElementById('cm-actual').value = c?.actual_spend ?? '';
  document.getElementById('cm-subsidy-planned').value = c?.subsidy_planned ?? '';
  document.getElementById('cm-subsidy-received').value = c?.subsidy_received ?? '';
  document.getElementById('cm-midea-code').value = c?.midea_budget_code || '';
  document.getElementById('cm-payment-status').value = c?.payment_status || '';
  document.getElementById('cm-claim-status').value = c?.claim_status || '';
  document.getElementById('cm-flight').value = c?.flight_cost ?? '';
  document.getElementById('cm-purpose').value = c?.purpose || '';
  document.getElementById('cm-status').value = c?.status || '預計規劃';
  document.getElementById('cm-priority').value = c?.priority || '中';
  document.getElementById('cm-owner').value = c?.owner || '';
  vendorRows = Array.isArray(c?.vendors) ? [...c.vendors] : [];
  renderVendorRows();
  document.getElementById('cm-pstart').value = c?.planned_start || '';
  document.getElementById('cm-pend').value = c?.planned_end || '';
  document.getElementById('cm-astart').value = c?.actual_start || '';
  document.getElementById('cm-aend').value = c?.actual_end || '';
  document.getElementById('cm-notes').value = c?.notes || '';

  const unitSel = document.getElementById('cm-unit');
  unitSel.innerHTML = '<option value="">（未指定）</option>' +
    distinctUnits().map(u => `<option value="${esc(u)}" ${c?.owner_unit === u ? 'selected' : ''}>${esc(u)}</option>`).join('') +
    '<option value="__new__">＋ 新增單位…</option>';
  document.getElementById('cm-unit-new').value = '';
  document.getElementById('cm-unit-new-wrap').style.display = 'none';
  if (c?.owner_unit && !distinctUnits().includes(c.owner_unit)) {
    unitSel.innerHTML += `<option value="${esc(c.owner_unit)}" selected>${esc(c.owner_unit)}</option>`;
  }

  document.getElementById('cm-delete').style.display = id ? '' : 'none';
  openM('mcampaign');
}

async function saveCampaign(){
  const name = document.getElementById('cm-name').value.trim();
  if (!name) { alert('請輸入專案名稱'); return; }
  const unitSel = document.getElementById('cm-unit').value;
  const ownerUnit = unitSel === '__new__' ? document.getElementById('cm-unit-new').value.trim() : unitSel;
  const payload = {
    name,
    association_id: document.getElementById('cm-association').value || null,
    association_activity_type: document.getElementById('cm-assoc-activity').value || null,
    budget: document.getElementById('cm-budget').value || null,
    actual_spend: document.getElementById('cm-actual').value || null,
    subsidy_planned: document.getElementById('cm-subsidy-planned').value || null,
    subsidy_received: document.getElementById('cm-subsidy-received').value || null,
    midea_budget_code: document.getElementById('cm-midea-code').value.trim() || null,
    payment_status: document.getElementById('cm-payment-status').value.trim() || null,
    claim_status: document.getElementById('cm-claim-status').value.trim() || null,
    flight_cost: document.getElementById('cm-flight').value || null,
    purpose: document.getElementById('cm-purpose').value.trim() || null,
    status: document.getElementById('cm-status').value,
    priority: document.getElementById('cm-priority').value,
    vendors: vendorRows.map(v => v.trim()).filter(Boolean),
    owner: document.getElementById('cm-owner').value.trim() || null,
    owner_unit: ownerUnit || null,
    planned_start: document.getElementById('cm-pstart').value || null,
    planned_end: document.getElementById('cm-pend').value || null,
    actual_start: document.getElementById('cm-astart').value || null,
    actual_end: document.getElementById('cm-aend').value || null,
    notes: document.getElementById('cm-notes').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  if (!editCampaignId && campaignSortColumnReady) {
    const ordered = sortCampaignsManual(CAMPAIGNS);
    const firstRank = ordered.length ? campaignSortRank(ordered[0], 1000) : 1000;
    payload.sort_order = firstRank - 10;
  }
  let savedId = editCampaignId;
  try {
    if (editCampaignId) await PATCH(`marketing_campaigns?id=eq.${editCampaignId}`, payload);
    else { const r = await POST('marketing_campaigns', payload); savedId = r?.[0]?.id; }
  } catch (e) {
    alert('行銷案關聯公會欄位尚未啟用，請先執行 schema_v21_campaign_associations.sql。');
    return;
  }
  closeM('mcampaign');
  CAMPAIGNS = _view === 'campaigns' ? await loadCampaignsForManagement() : sortByStatus(await GET('marketing_campaigns?order=created_at.desc') || []);
  if (savedId && detailCampaignId === savedId) await campaignDetail(savedId);
  else if (_view === 'campaigns') _renderCampaignsBody();
  else await nav(_view);
}

async function delCampaign(){
  alert('行銷案已改由 v2 管理生命週期。請到 v2 的「行銷案管理」使用封存，不再從 v1 真刪除。');
}

function csvCell(v){
  const s = (v ?? '').toString();
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function exportCampaignsCSV(){
  const headers = ['專案名稱', '關聯公會', '公會活動類型', '執行狀態', '重要性', '內部預估金額', '實際產生金額', '預估補助金額', '實際補助金額', '美的補助申請號碼', '付款狀態', '請款狀態', '機票費用', '負責人', '負責單位', '負責公司', '預計開始', '預計結束', '實際開始', '實際結束', '專案說明'];
  const rows = CAMPAIGNS.map(c => [c.name, assocName(c.association_id), c.association_activity_type, c.status, c.priority, c.budget, c.actual_spend, c.subsidy_planned, c.subsidy_received, c.midea_budget_code, c.payment_status, c.claim_status, c.flight_cost, c.owner, c.owner_unit, (c.vendors || []).join('、'), c.planned_start, c.planned_end, c.actual_start, c.actual_end, c.purpose]);
  const csv = [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `行銷案清單_${todayISO()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ── 投標工具 ──
async function renderTendersPage(){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  try {
    const [projects, keywords, results, runs] = await Promise.all([
      GET('tender_projects?order=sort_order.asc,created_at.asc'),
      GET('tender_keywords?order=created_at.asc'),
      GET('tender_results?order=last_seen_at.desc'),
      GET('tender_scan_runs?order=started_at.desc')
    ]);
    TENDER_PROJECTS = sortTenderProjects(projects || []);
    TENDER_KEYWORDS = keywords || [];
    TENDER_RESULTS = results || [];
    TENDER_RUNS = runs || [];
    if (!selectedTenderProjectId || !TENDER_PROJECTS.some(p => p.id === selectedTenderProjectId)) {
      selectedTenderProjectId = TENDER_PROJECTS[0]?.id || null;
    }
    _renderTendersBody();
  } catch (e) {
    document.getElementById('vc').innerHTML = `
      <div class="ph"><div><div class="pt">投標工具</div><div class="ps">每日 08:00 監測招標公告與採購訊息</div></div></div>
      <div class="card">
        <div class="dash-panel-head">
          <div>
            <div class="dash-panel-title">尚未啟用投標工具資料表</div>
            <div class="muted-text">請先在 Supabase SQL editor 執行 ${TENDER_SQL_FILE}，再回到此頁使用。</div>
          </div>
          <a class="btn btn-outline btn-sm" href="?sql=${TENDER_SQL_FILE}" target="_blank" rel="noopener">查看 SQL</a>
        </div>
      </div>`;
  }
}

function _renderTendersBody(){
  const selected = TENDER_PROJECTS.find(p => p.id === selectedTenderProjectId) || null;
  const filterColumnReady = !!selected && selected.scan_categories !== undefined && TENDER_RESULTS.every(r => r.relevance_level !== undefined);
  const projectRows = TENDER_PROJECTS.map((p, i) => {
    const run = tenderLatestRun(p.id);
    const hitCount = TENDER_RESULTS.filter(r => r.project_id === p.id).length;
    return `<div class="rowcard ${p.id === selectedTenderProjectId ? 'st-teal' : ''}" onclick="selectTenderProject('${p.id}')">
      <div class="row-info">
        <div class="row-name">${esc(p.name)}</div>
        <div class="cell-sub">${p.is_active ? '啟用' : '停用'}｜${hitCount} 筆命中｜${run ? esc(run.status) : '尚未掃描'}</div>
      </div>
      <div class="row-right" onclick="event.stopPropagation()">
        <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn btn-outline btn-sm" onclick="moveTenderProjectSort('${p.id}', -1)" ${i === 0 ? 'disabled' : ''}>上</button>
          <button class="btn btn-outline btn-sm" onclick="moveTenderProjectSort('${p.id}', 1)" ${i === TENDER_PROJECTS.length - 1 ? 'disabled' : ''}>下</button>
          <button class="btn btn-outline btn-sm" onclick="openTenderProjectModal('${p.id}')">編輯</button>
        </div>
      </div>
    </div>`;
  }).join('') || '<div class="empty">尚無投標監測專案</div>';

  const projectKeywords = selected ? TENDER_KEYWORDS.filter(k => k.project_id === selected.id) : [];
  const keywordRows = projectKeywords.map(k => `
    <div class="dash-item">
      <label style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" style="width:auto" ${k.is_active ? 'checked' : ''} onchange="toggleTenderKeyword('${k.id}', this.checked)">
        <span>${esc(k.keyword)}</span>
      </label>
      <button class="btn btn-outline btn-sm" onclick="deleteTenderKeyword('${k.id}')">刪除</button>
    </div>`).join('') || '<div class="empty">尚未設定關鍵字</div>';

  const projectResults = selected ? TENDER_RESULTS.filter(r => r.project_id === selected.id) : [];
  const resultRows = projectResults.map(r => `
    <tr>
      <td>
        <div class="cell-main clamp2"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a></div>
        <div class="cell-sub clamp2">${esc(r.snippet || '')}</div>
      </td>
      <td>${(r.matched_keywords || []).map(k => `<span class="case-tag">${esc(k)}</span>`).join(' ')}</td>
      <td>${tenderRelevanceTag(r)}</td>
      <td class="mono">${fdFull(r.published_at)}</td>
      <td class="mono">${fmtTaipeiDateTime(r.last_seen_at)}</td>
      <td>${tenderStatusSelect(r)}</td>
    </tr>`).join('');

  const runRows = (selected ? TENDER_RUNS.filter(r => r.project_id === selected.id) : []).slice(0, 5).map(r => {
    const meta = tenderRunMeta(r);
    return `<div class="dash-item">
      <div><div class="dash-item-title">${esc(meta.title)}</div><div class="dash-item-sub">${esc(meta.message)}</div></div>
      <span class="mono">${fmtTaipeiDateTime(r.started_at)}</span>
    </div>`;
  }).join('') || '<div class="empty">尚無掃描紀錄</div>';

  document.getElementById('vc').innerHTML = `
    <div class="ph">
      <div><div class="pt">投標工具</div><div class="ps">每日 08:00 自動搜尋公告關鍵字，命中後保留網址、發布時間與追蹤狀態</div></div>
      <button class="btn btn-primary" onclick="openTenderProjectModal()">＋ 新增監測專案</button>
    </div>
    ${filterColumnReady || !selected ? '' : `
      <div class="card" style="margin-bottom:12px">
        <div class="dash-panel-head">
          <div>
            <div class="dash-panel-title">尚未啟用掃描類別與關聯度分級</div>
            <div class="muted-text">請先執行 ${TENDER_FILTER_SQL_FILE}，之後就能設定掃描類別、保守/平衡/嚴格模式與結果分級。</div>
          </div>
          <a class="btn btn-outline btn-sm" href="?sql=${TENDER_FILTER_SQL_FILE}" target="_blank" rel="noopener">查看 SQL</a>
        </div>
      </div>`}
    <div class="dash-kpi-grid">
      <div class="stat-box"><div class="kpi-label">監測專案</div><div class="stat-num mono">${TENDER_PROJECTS.length}</div></div>
      <div class="stat-box"><div class="kpi-label">啟用關鍵字</div><div class="stat-num mono">${TENDER_KEYWORDS.filter(k => k.is_active).length}</div></div>
      <div class="stat-box"><div class="kpi-label">未讀命中</div><div class="stat-num mono">${TENDER_RESULTS.filter(r => r.status === '未讀').length}</div></div>
      <div class="stat-box"><div class="kpi-label">最後掃描</div><div class="stat-num mono" style="font-size:18px">${fmtTaipeiDateTime(selected?.last_scanned_at)}</div></div>
    </div>
    <div class="tender-layout">
      <div class="card dash-panel">
        <div class="dash-panel-head"><div><div class="dash-panel-title">監測專案排序</div><div class="muted-text">用上 / 下調整顯示順序</div></div></div>
        <div class="dash-list">${projectRows}</div>
      </div>
      <div>
        ${selected ? tenderProjectDetail(selected, keywordRows, resultRows, runRows) : '<div class="card"><div class="empty">請先新增監測專案</div></div>'}
      </div>
    </div>`;
}

function tenderProjectDetail(project, keywordRows, resultRows, runRows){
  return `
    <div class="card dash-panel" style="margin-bottom:16px">
      <div class="dash-panel-head">
        <div>
          <div class="dash-panel-title">${esc(project.name)}</div>
          <div class="muted-text clip">${project.scan_mode === '主動找案' ? `主動找案｜${tenderSearchQueryLabel(project)}` : esc(project.source_url)}</div>
          <div class="muted-text">${esc(project.last_scan_status || '尚未掃描')}</div>
          <div class="muted-text">${esc(project.filter_mode || '保守')}模式｜${tenderCategoryLabels(project.scan_categories).join('、')}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn btn-outline btn-sm" onclick="openTenderProjectModal('${project.id}')">編輯專案</button>
          <button class="btn btn-primary btn-sm" onclick="scanTenderProject('${project.id}')">立即掃描</button>
        </div>
      </div>
    </div>
    <div class="dash-kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-bottom:16px">
      <div class="card dash-panel">
        <div class="dash-panel-head"><div><div class="dash-panel-title">關鍵字</div><div class="muted-text">${project.scan_mode === '主動找案' ? '可選；未填時會從搜尋指令推導' : '可自行新增、停用或刪除'}</div></div></div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input id="tk-keyword" placeholder="新增關鍵字，例如 冰水主機" onkeydown="if(event.key==='Enter') saveTenderKeyword()">
          <button class="btn btn-primary btn-sm" onclick="saveTenderKeyword()">新增</button>
        </div>
        <div class="dash-list">${keywordRows}</div>
      </div>
      <div class="card dash-panel">
        <div class="dash-panel-head"><div><div class="dash-panel-title">最近掃描紀錄</div><div class="muted-text">自動與手動掃描都會記錄</div></div></div>
        <div class="dash-list">${runRows}</div>
      </div>
    </div>
    <div class="tw">
      <table class="assoc-table">
        <thead><tr><th>命中公告網址</th><th>關鍵字</th><th>判斷</th><th>發布時間</th><th>更新時間</th><th>狀態</th></tr></thead>
        <tbody>${resultRows}</tbody>
      </table>
      ${resultRows ? '' : '<div class="empty">目前沒有命中結果</div>'}
    </div>`;
}

function tenderLatestRun(projectId){
  return TENDER_RUNS.filter(r => r.project_id === projectId).sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0))[0] || null;
}

function tenderRunMeta(r){
  const message = r.error_message || `檢查 ${r.checked_pages} 頁，命中 ${r.found_count} 筆，新發現 ${r.new_count} 筆`;
  if (r.status === 'success') return { title: '掃描成功', message };
  if (r.status === 'failed') return { title: '掃描失敗', message };
  const started = new Date(r.started_at || 0);
  if (Date.now() - started.getTime() > 3 * 60 * 1000) {
    return { title: '掃描未完成', message: '前次手動掃描可能逾時，請重新整理後再掃描一次。' };
  }
  return { title: '掃描中', message };
}

function tenderStatusSelect(row){
  return `<select onchange="updateTenderResultStatus('${row.id}', this.value)" style="min-width:92px">${TENDER_STATUS_OPTIONS.map(s => `<option ${row.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>`;
}

function tenderRelevanceTag(row){
  const level = row.relevance_level || '待確認';
  const cls = { '高相關': 'teal', '待確認': 'brass', '低相關': 'muted' }[level] || 'muted';
  const reasons = Array.isArray(row.relevance_reasons) ? row.relevance_reasons.join('；') : '';
  return `<span class="tag tag-${cls}" title="${esc(reasons)}">${esc(level)}${row.relevance_score != null ? ` ${Number(row.relevance_score)}` : ''}</span>`;
}

function tenderCategoryLabels(categories){
  const selected = Array.isArray(categories) && categories.length ? categories : DEFAULT_TENDER_SCAN_CATEGORIES;
  const labels = selected.map(id => TENDER_SCAN_CATEGORIES.find(c => c.id === id)?.label).filter(Boolean);
  return labels.length ? labels : ['全選'];
}

function selectTenderProject(id){
  selectedTenderProjectId = id;
  _renderTendersBody();
}

async function moveTenderProjectSort(id, direction){
  const ordered = sortTenderProjects(TENDER_PROJECTS);
  const index = ordered.findIndex(p => p.id === id);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;
  const current = ordered[index];
  const target = ordered[targetIndex];
  const currentRank = tenderSortRank(current, (index + 1) * 1000);
  const targetRank = tenderSortRank(target, (targetIndex + 1) * 1000);
  await Promise.all([
    PATCH(`tender_projects?id=eq.${current.id}`, { sort_order: targetRank, updated_at: new Date().toISOString() }),
    PATCH(`tender_projects?id=eq.${target.id}`, { sort_order: currentRank, updated_at: new Date().toISOString() })
  ]);
  await renderTendersPage();
}

function openTenderProjectModal(id = null){
  editTenderProjectId = id;
  const p = id ? TENDER_PROJECTS.find(x => x.id === id) : null;
  document.getElementById('tpm-title').textContent = id ? '編輯監測專案' : '新增監測專案';
  document.getElementById('tpm-name').value = p?.name || '';
  document.getElementById('tpm-scan-mode').value = p?.scan_mode || '指定網址';
  document.getElementById('tpm-url').value = p?.source_url?.startsWith('active-search://') ? '' : (p?.source_url || '');
  document.getElementById('tpm-search-queries').value = Array.isArray(p?.search_queries) ? p.search_queries.join('\n') : '';
  document.getElementById('tpm-limit').value = p?.page_limit ?? 2;
  document.getElementById('tpm-filter-mode').value = p?.filter_mode || '保守';
  renderTenderCategoryChecks(p?.scan_categories);
  document.getElementById('tpm-active').checked = p?.is_active !== false;
  document.getElementById('tpm-email').value = p?.notify_email || '';
  document.getElementById('tpm-notes').value = p?.notes || '';
  document.getElementById('tpm-delete').style.display = id ? '' : 'none';
  updateTenderModeFields();
  openM('mtenderproject');
}

function updateTenderModeFields(){
  const mode = document.getElementById('tpm-scan-mode')?.value || '指定網址';
  const isActive = mode === '主動找案';
  const urlWrap = document.getElementById('tpm-url-wrap');
  const searchWrap = document.getElementById('tpm-search-wrap');
  if (urlWrap) urlWrap.style.display = isActive ? 'none' : '';
  if (searchWrap) searchWrap.style.display = isActive ? '' : 'none';
}

function renderTenderCategoryChecks(selectedCategories){
  const selected = new Set(Array.isArray(selectedCategories) && selectedCategories.length ? selectedCategories : DEFAULT_TENDER_SCAN_CATEGORIES);
  const wrap = document.getElementById('tpm-categories');
  if (!wrap) return;
  wrap.innerHTML = TENDER_SCAN_CATEGORIES.map(c => `
    <label class="category-option">
      <input type="checkbox" value="${esc(c.id)}" ${selected.has(c.id) ? 'checked' : ''}>
      <span>${esc(c.label)}</span>
    </label>`).join('');
}

function setTenderCategoryChecks(checked){
  document.querySelectorAll('#tpm-categories input[type="checkbox"]').forEach(input => { input.checked = checked; });
}

function selectedTenderCategories(){
  const values = [...document.querySelectorAll('#tpm-categories input[type="checkbox"]:checked')].map(input => input.value);
  return values.length ? values : DEFAULT_TENDER_SCAN_CATEGORIES;
}

async function saveTenderProject(){
  const name = document.getElementById('tpm-name').value.trim();
  const scanMode = document.getElementById('tpm-scan-mode').value || '指定網址';
  const sourceUrl = document.getElementById('tpm-url').value.trim();
  if (!name || (scanMode === '指定網址' && !sourceUrl)) { alert('請輸入專案名稱與網址'); return; }
  const searchQueries = parseTenderSearchQueries();
  if (scanMode === '主動找案' && !searchQueries.length && !TENDER_KEYWORDS.some(k => k.project_id === editTenderProjectId && k.is_active)) {
    alert('主動找案請至少填一組搜尋指令，或先建立啟用中的關鍵字。');
    return;
  }
  const payload = {
    name,
    scan_mode: scanMode,
    source_url: scanMode === '主動找案' ? 'active-search://default' : sourceUrl,
    search_queries: searchQueries,
    page_limit: Math.max(1, Math.min(Number(document.getElementById('tpm-limit').value) || 1, 10)),
    filter_mode: document.getElementById('tpm-filter-mode').value || '保守',
    scan_categories: selectedTenderCategories(),
    is_active: document.getElementById('tpm-active').checked,
    notify_email: document.getElementById('tpm-email').value.trim() || null,
    notes: document.getElementById('tpm-notes').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  let savedId = editTenderProjectId;
  try {
    if (editTenderProjectId) await PATCH(`tender_projects?id=eq.${editTenderProjectId}`, payload);
    else {
      const lastRank = TENDER_PROJECTS.reduce((max, p) => Math.max(max, tenderSortRank(p, 0)), 0);
      const r = await POST('tender_projects', { ...payload, sort_order: lastRank + 10 });
      savedId = r?.[0]?.id;
    }
  } catch (e) {
    alert(`專案儲存失敗，請確認已執行 ${TENDER_FILTER_SQL_FILE} 與 ${TENDER_ACTIVE_SQL_FILE}。`);
    return;
  }
  selectedTenderProjectId = savedId;
  closeM('mtenderproject');
  await renderTendersPage();
}

function parseTenderSearchQueries(){
  const raw = document.getElementById('tpm-search-queries')?.value || '';
  return raw.split(/[\n,，]+/).map(s => s.trim()).filter(Boolean).slice(0, 12);
}

function tenderSearchQueryLabel(project){
  const queries = Array.isArray(project.search_queries) ? project.search_queries.filter(Boolean) : [];
  return queries.length ? `${queries.slice(0, 3).join('、')}${queries.length > 3 ? '…' : ''}` : '依關鍵字自動組合搜尋';
}

async function deleteTenderProject(){
  if (!editTenderProjectId || !confirm('確定刪除此監測專案？關鍵字與命中結果也會一併刪除。')) return;
  await DEL(`tender_projects?id=eq.${editTenderProjectId}`);
  selectedTenderProjectId = null;
  closeM('mtenderproject');
  await renderTendersPage();
}

async function saveTenderKeyword(){
  const selected = TENDER_PROJECTS.find(p => p.id === selectedTenderProjectId);
  const input = document.getElementById('tk-keyword');
  const keyword = input.value.trim();
  if (!selected || !keyword) return;
  try {
    await POST('tender_keywords', { project_id: selected.id, keyword, is_active: true });
    input.value = '';
    await renderTendersPage();
  } catch (e) {
    alert('關鍵字已存在，或資料庫尚未啟用投標工具。');
  }
}

async function toggleTenderKeyword(id, checked){
  await PATCH(`tender_keywords?id=eq.${id}`, { is_active: checked, updated_at: new Date().toISOString() });
  await renderTendersPage();
}

async function deleteTenderKeyword(id){
  if (!confirm('確定刪除此關鍵字？')) return;
  await DEL(`tender_keywords?id=eq.${id}`);
  await renderTendersPage();
}

async function updateTenderResultStatus(id, status){
  await PATCH(`tender_results?id=eq.${id}`, { status, updated_at: new Date().toISOString() });
  const row = TENDER_RESULTS.find(r => r.id === id);
  if (row) row.status = status;
}

async function scanTenderProject(id){
  try {
    const res = await fetch('/api/tender-scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('ms_token') || ''}`
      },
      body: JSON.stringify({ projectId: id })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `掃描失敗 ${res.status}`);
    const sd = data.searchDiagnostics || {};
    const searchedQueries = sd.queries?.slice(0, 5).join('、');
    const diagnosticText = sd.source
      ? `\n搜尋來源：${sd.source}\n搜尋候選：${data.checkedPages || 0} 筆｜原始回傳：${sd.returned || 0} 筆｜來源總數：${sd.totalResults || 0}${sd.errors?.length ? `\n錯誤：${sd.errors.slice(0, 3).join('、')}` : ''}`
      : '';
    alert(data.preservedExistingResults
      ? `掃描完成：本次主動找案未回傳新結果，已保留既有結果。${diagnosticText}${searchedQueries ? `\n查詢：${searchedQueries}` : ''}`
      : `掃描完成：命中 ${data.foundCount} 筆，新發現 ${data.newCount} 筆`);
    await renderTendersPage();
  } catch (e) {
    alert(`掃描失敗：${e.message}\n請確認已登入平台，且已執行投標工具 SQL。`);
  }
}

// ── 每週文案彙整 ──
function mondayOf(dateStr){
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

const DRAFT_TAG_CLASS = { '草稿': 'brass', '已採用': 'teal', '已發布': 'deep' };

async function renderDraftsPage(){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  DRAFTS = await GET('marketing_content_drafts?order=week_start.desc,created_at.desc') || [];
  CAMPAIGNS = await GET('marketing_campaigns?order=name.asc') || [];
  const groups = {};
  DRAFTS.forEach(d => { (groups[d.week_start] ||= []).push(d); });
  const weeks = Object.keys(groups).sort().reverse();
  const body = weeks.map(w => `
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--line)">
        <div class="mono" style="font-size:15px;font-weight:600">${fd(w)} 那一週</div>
        <button class="btn btn-outline btn-sm" onclick="copyWeek('${w}')">複製整週文案</button>
      </div>
      ${groups[w].map(d => `
        <div style="padding:12px 0;border-bottom:1px solid var(--paper)">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:start;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <div style="font-weight:600;font-size:16px">${esc(d.title || '（未命名文案）')}</div>
              <div style="font-size:14px;color:var(--muted);white-space:pre-wrap;margin-top:5px">${esc(d.content).slice(0, 160)}${d.content.length > 160 ? '…' : ''}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <span class="tag tag-${DRAFT_TAG_CLASS[d.status] || 'muted'}">${esc(d.status)}</span>
              <div style="margin-top:8px;display:flex;gap:6px">
                <button class="btn btn-outline btn-sm" onclick="openDraftModal('${d.id}')">編輯</button>
                <button class="btn btn-outline btn-sm" onclick="copyDraft('${d.id}')">複製</button>
              </div>
            </div>
          </div>
        </div>`).join('')}
    </div>`).join('') || '<div class="empty">尚無文案，點擊右上角新增</div>';

  document.getElementById('vc').innerHTML = `
    <div class="ph">
      <div><div class="pt">每週文案彙整</div><div class="ps">可手動產生本週草稿，確認後自行貼到 Facebook / Google Sheet</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline" id="draft-generate-btn" onclick="generateWeeklyDrafts()">產生本週草稿</button>
        <button class="btn btn-primary" onclick="openDraftModal()">＋ 新增文案</button>
      </div>
    </div>
    ${body}`;
}

async function generateWeeklyDrafts(){
  const btn = document.getElementById('draft-generate-btn');
  const oldText = btn?.textContent || '產生本週草稿';
  if (btn) { btn.disabled = true; btn.textContent = '產生中…'; }
  try {
    const res = await fetch('/api/weekly-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('ms_token') || ''}`
      },
      body: JSON.stringify({ week: mondayOf() })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || '產生失敗');
    alert(`本週草稿產生完成：新增 ${data.created || 0} 則，略過 ${data.skipped || 0} 則。`);
    await renderDraftsPage();
  } catch (e) {
    alert(`本週草稿產生失敗：${e.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = oldText; }
  }
}

function openDraftModal(id, prefill){
  editDraftId = id || null;
  const d = id ? DRAFTS.find(x => x.id === id) : null;
  document.getElementById('dm-title-label').textContent = id ? '編輯文案' : '新增文案';
  document.getElementById('dm-week').value = d?.week_start || mondayOf();
  document.getElementById('dm-campaign').innerHTML = '<option value="">（不指定行銷案）</option>' +
    CAMPAIGNS.map(c => `<option value="${c.id}" ${d?.campaign_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  document.getElementById('dm-title').value = d?.title || prefill?.title || '';
  document.getElementById('dm-content').value = d?.content || '';
  document.getElementById('dm-source').value = d?.source_note || prefill?.source_note || '';
  document.getElementById('dm-status').value = d?.status || '草稿';
  document.getElementById('dm-delete').style.display = id ? '' : 'none';
  openM('mdraft');
}

async function saveDraft(){
  const content = document.getElementById('dm-content').value.trim();
  if (!content) { alert('請輸入文案內容'); return; }
  const payload = {
    week_start: document.getElementById('dm-week').value || mondayOf(),
    campaign_id: document.getElementById('dm-campaign').value || null,
    title: document.getElementById('dm-title').value.trim() || null,
    content,
    source_note: document.getElementById('dm-source').value.trim() || null,
    status: document.getElementById('dm-status').value
  };
  if (editDraftId) await PATCH(`marketing_content_drafts?id=eq.${editDraftId}`, payload);
  else await POST('marketing_content_drafts', payload);
  closeM('mdraft');
  await renderDraftsPage();
}

async function delDraft(){
  if (!editDraftId) return;
  if (!confirm('確定刪除此文案？')) return;
  await DEL(`marketing_content_drafts?id=eq.${editDraftId}`);
  closeM('mdraft');
  await renderDraftsPage();
}

async function copyDraft(id){
  const d = DRAFTS.find(x => x.id === id);
  if (!d) return;
  const text = (d.title ? d.title + '\n\n' : '') + d.content;
  await navigator.clipboard.writeText(text);
  alert('已複製到剪貼簿，可直接貼到 Facebook');
}

async function copyWeek(week){
  const items = DRAFTS.filter(d => d.week_start === week);
  const text = items.map(d => (d.title ? `【${d.title}】\n` : '') + d.content).join('\n\n---\n\n');
  await navigator.clipboard.writeText(text);
  alert('已複製整週文案，可貼到 Google Sheet 或 Facebook');
}

// ── 新聞蒐集 ──
async function renderNewsPage(){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  KEYWORDS = await GET('marketing_news_keywords?order=created_at.asc') || [];
  const groups = KEYWORDS.map(k => `
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--line);flex-wrap:wrap;gap:8px">
        <div style="font-weight:600;font-size:16px">${esc(k.keyword)}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="fetchNewsFor('${k.id}','${esc(k.keyword)}')">重新抓取</button>
          <button class="btn btn-outline btn-sm" onclick="editKeyword('${k.id}')">編輯關鍵字</button>
          <button class="btn btn-red btn-sm" onclick="delKeyword('${k.id}')">刪除關鍵字</button>
        </div>
      </div>
      <div id="news-${k.id}" class="mono" style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em">尚未抓取，點擊「重新抓取」</div>
    </div>`).join('');

  document.getElementById('vc').innerHTML = `
    <div class="ph">
      <div><div class="pt">新聞蒐集</div><div class="ps">依關鍵字抓取 Google 新聞，供撰寫行銷文案參考</div></div>
    </div>
    <div class="card" style="margin-bottom:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <input id="nk-input" placeholder="新增關鍵字" style="flex:1;min-width:160px;padding:10px 12px;border-radius:3px;border:1.5px solid var(--line);font-size:15px">
      <button class="btn btn-primary btn-sm" onclick="addKeyword()">＋ 新增</button>
    </div>
    ${groups || '<div class="empty">尚無關鍵字，請先新增</div>'}`;
}

async function addKeyword(){
  const input = document.getElementById('nk-input');
  const keyword = input.value.trim();
  if (!keyword) return;
  await POST('marketing_news_keywords', { keyword });
  input.value = '';
  await renderNewsPage();
}

async function editKeyword(id){
  const item = KEYWORDS.find(k => k.id === id);
  if (!item) return;
  const keyword = prompt('編輯關鍵字', item.keyword || '');
  if (keyword == null) return;
  const value = keyword.trim();
  if (!value) { alert('關鍵字不可空白'); return; }
  await PATCH(`marketing_news_keywords?id=eq.${id}`, { keyword: value });
  await renderNewsPage();
}

async function delKeyword(id){
  if (!confirm('確定刪除此關鍵字？')) return;
  await DEL(`marketing_news_keywords?id=eq.${id}`);
  await renderNewsPage();
}

async function fetchNewsFor(id, keyword){
  const box = document.getElementById(`news-${id}`);
  box.innerHTML = '抓取中...';
  try{
    const res = await fetch(`/api/news?q=${encodeURIComponent(keyword)}`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || '抓取失敗');
    if (!data.items?.length) { box.innerHTML = '沒有找到相關新聞'; return; }
    box.innerHTML = data.items.map(it => `
      <div style="padding:10px 0;border-bottom:1px solid var(--paper);display:flex;justify-content:space-between;gap:10px;align-items:start;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <a href="${esc(it.link)}" target="_blank" rel="noopener" style="font-size:15px;font-weight:600;color:var(--text);font-family:'IBM Plex Sans'">${esc(it.title)}</a>
          <div class="mono" style="font-size:11.5px;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:.03em">${esc(it.source)}${it.pubDate ? ' · ' + esc(it.pubDate) : ''}</div>
        </div>
        <button class="btn btn-outline btn-sm" style="flex-shrink:0" onclick='createDraftFromNews(${JSON.stringify(it.title)}, ${JSON.stringify(it.link)})'>＋ 建立文案草稿</button>
      </div>`).join('');
  } catch(e){
    box.innerHTML = `<span style="color:var(--rust)">抓取失敗：${esc(e.message)}</span>`;
  }
}

async function createDraftFromNews(title, link){
  CAMPAIGNS = await GET('marketing_campaigns?order=name.asc') || [];
  openDraftModal(null, { title, source_note: link });
}

// ── 成功案例 ──
async function renderCasesPage(){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  CASES = await GET('marketing_case_studies?order=created_at.desc') || [];

  const cardsHtml = await Promise.all(CASES.map(async c => {
    const coverUrl = c.cover_image_path ? await getSignedUrl('case-study-photos', c.cover_image_path) : '';
    const tagsHtml = (c.tags || []).map(t => `<span class="case-tag">${esc(t)}</span>`).join('');
    return `
    <div class="case-card" onclick="openCaseModal('${c.id}')">
      ${coverUrl ? `<img class="case-cover" src="${coverUrl}" loading="lazy">` : '<div class="case-cover-ph">尚無封面照片</div>'}
      <div class="case-body">
        <div class="case-name">${esc(c.title)}</div>
        <div class="case-meta">${esc(c.project_name || '')}${c.product_model ? ' · ' + esc(c.product_model) : ''}</div>
        ${c.metrics ? `<div class="case-meta" style="margin-top:4px;color:var(--teal)">${esc(c.metrics)}</div>` : ''}
        <div class="case-tags">${tagsHtml}</div>
        ${coverUrl ? `<div class="case-actions"><button class="case-download" data-path="${esc(c.cover_image_path)}" data-title="${esc(c.title)}" onclick="event.stopPropagation();downloadCaseImageFromButton(this)">下載圖片</button></div>` : ''}
      </div>
    </div>`;
  }));

  document.getElementById('vc').innerHTML = `
    <div class="ph">
      <div><div class="pt">成功案例</div><div class="ps">共 ${CASES.length} 筆，原廠案例翻譯整理後存放於此</div></div>
      <button class="btn btn-primary" onclick="openCaseModal()">＋ 新增案例</button>
    </div>
    <div class="case-grid">${cardsHtml.join('') || ''}</div>
    ${CASES.length ? '' : '<div class="empty">尚無案例，點擊右上角新增</div>'}`;
}

async function openCaseModal(id){
  editCaseId = id || null;
  const c = id ? CASES.find(x => x.id === id) : null;
  document.getElementById('cs-title-label').textContent = id ? '編輯案例' : '新增案例';
  document.getElementById('cs-title').value = c?.title || '';
  document.getElementById('cs-project').value = c?.project_name || '';
  document.getElementById('cs-model').value = c?.product_model || '';
  document.getElementById('cs-summary').value = c?.summary || '';
  document.getElementById('cs-metrics').value = c?.metrics || '';
  document.getElementById('cs-tags').value = (c?.tags || []).join(',');
  document.getElementById('cs-canva').value = c?.canva_design_url || '';
  document.getElementById('cs-cover-file').value = '';
  pendingCoverFile = null;
  currentCoverPath = c?.cover_image_path || null;

  const preview = document.getElementById('cs-cover-preview');
  if (currentCoverPath) {
    const url = await getSignedUrl('case-study-photos', currentCoverPath);
    preview.innerHTML = url ? `<img src="${url}" style="max-width:200px;display:block"><div class="case-actions"><button class="case-download" data-path="${esc(currentCoverPath)}" data-title="${esc(c?.title)}" onclick="downloadCaseImageFromButton(this)">下載圖片</button></div>` : '';
  } else {
    preview.innerHTML = '';
  }

  document.getElementById('cs-delete').style.display = id ? '' : 'none';
  openM('mcase');
}

function onCoverFilePick(input){
  pendingCoverFile = input.files[0] || null;
  const preview = document.getElementById('cs-cover-preview');
  if (pendingCoverFile) preview.innerHTML = `<span class="muted-text">待上傳：${esc(pendingCoverFile.name)}</span>`;
}

async function downloadCaseImageFromButton(btn){
  await downloadCaseImage(btn.dataset.path, btn.dataset.title);
}

async function downloadCaseImage(path, title){
  if (!path) return;
  const url = await getSignedUrl('case-study-photos', path, 300);
  if (!url) { alert('圖片下載連結產生失敗，請重新登入後再試。'); return; }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const ext = (path.split('.').pop() || 'png').split('?')[0];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = safeDownloadName(title, ext);
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  } catch (e) {
    window.open(url, '_blank', 'noopener');
  }
}

async function downloadStorageFile(bucket, path, fileName){
  if (!path) return;
  const url = await getSignedUrl(bucket, path, 300);
  if (!url) { alert('檔案下載連結產生失敗，請重新登入後再試。'); return; }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName || path.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  } catch (e) {
    window.open(url, '_blank', 'noopener');
  }
}

async function saveCaseStudy(){
  const title = document.getElementById('cs-title').value.trim();
  if (!title) { alert('請輸入案例標題'); return; }

  let coverPath = currentCoverPath;
  if (pendingCoverFile) {
    try { coverPath = await uploadStorageFile('case-study-photos', pendingCoverFile); }
    catch (e) { alert('封面照片上傳失敗：' + e.message); return; }
  }

  const payload = {
    title,
    project_name: document.getElementById('cs-project').value.trim() || null,
    product_model: document.getElementById('cs-model').value.trim() || null,
    summary: document.getElementById('cs-summary').value.trim() || null,
    metrics: document.getElementById('cs-metrics').value.trim() || null,
    tags: document.getElementById('cs-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    canva_design_url: document.getElementById('cs-canva').value.trim() || null,
    cover_image_path: coverPath,
    updated_at: new Date().toISOString()
  };
  if (editCaseId) await PATCH(`marketing_case_studies?id=eq.${editCaseId}`, payload);
  else await POST('marketing_case_studies', payload);
  closeM('mcase');
  await renderCasesPage();
}

async function delCaseStudy(){
  if (!editCaseId) return;
  if (!confirm('確定刪除此案例？')) return;
  if (currentCoverPath) await deleteStorageFile('case-study-photos', currentCoverPath);
  await DEL(`marketing_case_studies?id=eq.${editCaseId}`);
  closeM('mcase');
  await renderCasesPage();
}

function sqlFileFromUrl(){
  const params = new URLSearchParams(location.search);
  const file = params.get('sql');
  if (!file) return '';
  if (!/^schema_v\d+_[a-z0-9_]+\.sql$/i.test(file)) return '';
  return file;
}

async function showSqlFile(file){
  const screen = document.getElementById('sql-screen');
  if (!screen) return false;
  document.getElementById('login-screen')?.classList.add('hidden');
  document.getElementById('password-screen')?.classList.remove('open');
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('main').style.display = 'none';
  screen.classList.add('open');
  document.getElementById('sql-file-name').textContent = file || '未指定檔案';
  const code = document.getElementById('sql-code');
  const msg = document.getElementById('sql-message');
  if (!file) {
    code.textContent = '';
    msg.style.display = '';
    msg.textContent = '找不到 SQL 檔案名稱。';
    return true;
  }
  try {
    const res = await fetch(file, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    code.textContent = await res.text();
    msg.style.display = 'none';
  } catch (e) {
    code.textContent = '';
    msg.style.display = '';
    msg.textContent = 'SQL 檔案載入失敗，請確認連結是否正確。';
  }
  return true;
}

async function copySqlText(){
  const text = document.getElementById('sql-code')?.textContent || '';
  if (!text.trim()) { alert('目前沒有可複製的 SQL'); return; }
  try {
    await navigator.clipboard.writeText(text);
    alert('SQL 已複製');
  } catch (e) {
    const code = document.getElementById('sql-code');
    const range = document.createRange();
    range.selectNodeContents(code);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    alert('已選取 SQL，請手動複製');
  }
}

// ── MODAL ──
function openM(id){ document.getElementById(id).classList.add('open'); }
function closeM(id){ document.getElementById(id).classList.remove('open'); }
