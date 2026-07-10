// ── 共用 helper ──
const esc = s => (s ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => n == null || n === '' ? '-' : Number(n).toLocaleString('zh-TW');
const fd  = s => s ? s.slice(5).replace('-', '/') : '';
const fdFull = s => s ? s.replace(/-/g, '/') : '未填';
const todayISO = () => new Date().toISOString().slice(0, 10);

// 狀態沿用冷媒循環的溫度隱喻：預計規劃＝尚未升溫（灰），估價中＝尚未啟動（黃銅），進行中＝正在冷卻（冷媒藍綠），補助申請＝行政作業（鋼藍），結案＝完全冷卻（深藍綠）
const STATUS_ORDER = ['預計規劃', '估價中', '進行中', '補助申請', '結案'];
const STATUS_HEX   = { '預計規劃': '#7C8B94', '估價中': '#B97A3D', '進行中': '#0E7C86', '補助申請': '#5B7FA6', '結案': '#0B4F55' };
const STATUS_CLASS = { '預計規劃': 'plan',    '估價中': 'brass',   '進行中': 'teal',    '補助申請': 'grant',   '結案': 'deep' };

function sortByStatus(list){
  return [...list].sort((a, b) => {
    const d = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    return d !== 0 ? d : new Date(b.created_at) - new Date(a.created_at);
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
let _view = 'dashboard';
let _campaignView = 'list';
let editCampaignId = null;
let editDraftId = null;
let editCaseId = null;
let editTaskId = null;
let editBudgetItemId = null;
let editDocId = null;
let editRiskId = null;
let detailCampaignId = null;
let vendorRows = [];
let pendingCoverFile = null;
let currentCoverPath = null;
let pendingDocFile = null;
let currentDocPath = null;
let currentDocFileName = null;

// ── NAV ──
async function nav(view){
  _view = view;
  document.querySelectorAll('.ni').forEach(el => el.classList.toggle('on', el.dataset.view === view));
  if (view === 'dashboard') await renderDashboard();
  else if (view === 'campaigns') await renderCampaignsPage();
  else if (view === 'drafts') await renderDraftsPage();
  else if (view === 'news') await renderNewsPage();
  else if (view === 'cases') await renderCasesPage();
}

function tag(status){
  const cls = STATUS_CLASS[status] || 'muted';
  return `<span class="tag tag-${cls}">${esc(status)}</span>`;
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

function daysUntil(s){
  const d = dval(s);
  if (!d) return null;
  const today = dval(todayISO());
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

// ── DASHBOARD ──
async function renderDashboard(){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  CAMPAIGNS = await GET('marketing_campaigns?order=created_at.desc') || [];
  const dashboardTasks = await GET('marketing_campaign_tasks?select=id,campaign_id,task_name,planned_start,planned_end,status,completion_pct&order=planned_end.asc') || [];
  const dashboardBudgetItems = await GET('marketing_campaign_budget_items?select=id,campaign_id,item_name,budget_nature,amount_twd,quote_status&order=seq.asc') || [];
  const dashboardRisks = await safeGET('marketing_campaign_risks?select=id,campaign_id,risk_type,title,description,impact_level,owner,due_date,status,show_on_dashboard,resolution_note&order=due_date.asc,created_at.desc');
  const total = CAMPAIGNS.length;
  const statusCounts = STATUS_ORDER.map(s => ({ status: s, count: CAMPAIGNS.filter(c => c.status === s).length }));
  const totalBudget = CAMPAIGNS.reduce((s, c) => s + (Number(c.budget) || 0), 0);
  const totalSpend = CAMPAIGNS.reduce((s, c) => s + (Number(c.actual_spend) || 0), 0);
  const remainingBudget = Math.max(0, totalBudget - totalSpend);
  const subsidyPlanned = CAMPAIGNS.reduce((s, c) => s + (Number(c.subsidy_planned) || 0), 0);
  const subsidyReceived = CAMPAIGNS.reduce((s, c) => s + (Number(c.subsidy_received) || 0), 0);
  const subsidyRate = subsidyPlanned ? Math.round(subsidyReceived / subsidyPlanned * 100) : 0;
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
    .map(r => ({ r, c: campaignById[r.campaign_id] }))
    .filter(x => x.c);
  const decisions = decisionRiskRows.length ? decisionRiskRows : CAMPAIGNS
    .map(c => ({ c, reasons: decisionReasons(c, dashboardTasks, dashboardBudgetItems) }))
    .filter(x => x.reasons.length)
    .slice(0, 6);
  const formalRiskRows = openRisks
    .map(r => ({ r, c: campaignById[r.campaign_id] }))
    .filter(x => x.c)
    .sort((a, b) => {
      const score = x => ({ '高': 3, '中': 2, '低': 1 }[x.r.impact_level] || 0);
      return score(b) - score(a) || (dval(a.r.due_date) || 0) - (dval(b.r.due_date) || 0);
    });
  const risks = formalRiskRows.length ? formalRiskRows : CAMPAIGNS
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
  const decisionRows = decisions.map(({ c, reasons, r }) => `
    <div class="dash-alert" onclick="campaignDetail('${c.id}')">
      <div><div class="dash-item-title">${esc(r?.title || c.name)}</div><div class="dash-item-sub">${esc(r ? `${c.name} · ${r.risk_type}${r.due_date ? ' · ' + fdFull(r.due_date) : ''}` : reasons.join('、'))}</div></div>
      ${r ? riskImpactTag(r.impact_level) : tag(c.status)}
    </div>`).join('') || '<div class="empty">目前沒有明確待決策項目</div>';
  const riskRows = risks.map(({ c, reasons, r }) => `
    <div class="dash-alert risk" onclick="campaignDetail('${c.id}')">
      <div><div class="dash-item-title">${esc(r?.title || c.name)}</div><div class="dash-item-sub">${esc(r ? `${c.name} · ${r.risk_type}${r.due_date ? ' · ' + fdFull(r.due_date) : ''}` : reasons.join('、'))}</div></div>
      ${r ? riskImpactTag(r.impact_level) : `<span class="mono dash-risk-count">${reasons.length}</span>`}
    </div>`).join('') || '<div class="empty">目前沒有高風險專案</div>';
  const categoryRows = categories.map(([name, amount]) => {
    const pct = totalBudget ? Math.round(amount / totalBudget * 100) : 0;
    return `<div class="dash-mix-row">
      <div class="dash-mix-label">${esc(name)}<span class="mono">NT$ ${fmt(amount)}</span></div>
      <div class="kpi-bar"><i style="width:${pct}%;background:var(--teal)"></i></div>
    </div>`;
  }).join('') || '<div class="empty">尚無預算分類資料</div>';

  document.getElementById('vc').innerHTML = `
    <div class="ph"><div><div class="pt">經營總覽</div><div class="ps">${new Date().getFullYear()} 年度行銷投資、風險與近期活動</div></div>
      <button class="btn btn-primary" onclick="openCampaignModal()">＋ 新增行銷案</button></div>
    <div class="kpi-strip">
      <div class="kpi-seg"><div class="kpi-label">全部行銷案</div><div class="kpi-val mono">${total}</div></div>
      ${statusCounts.map(({ status, count }) => `
        <div class="kpi-seg"><div class="kpi-label">${esc(status)}</div><div class="kpi-val mono" style="color:${STATUS_HEX[status]}">${count}</div></div>`).join('')}
    </div>
    <div class="dash-kpi-grid">
      <div class="stat-box"><div class="kpi-label">年度總預算</div><div class="stat-num">NT$ ${fmt(totalBudget)}</div></div>
      <div class="stat-box">
        <div class="kpi-label">預算執行率</div>
        <div class="stat-num">${execRate}<span style="font-size:16px">%</span> <span style="font-size:13px;color:var(--muted);font-family:'IBM Plex Sans';font-weight:500">NT$ ${fmt(totalSpend)} 已花費</span></div>
        <div class="kpi-bar"><i style="width:${Math.min(100, execRate)}%;background:var(--teal)"></i></div>
      </div>
      <div class="stat-box"><div class="kpi-label">剩餘可用預算</div><div class="stat-num">NT$ ${fmt(remainingBudget)}</div></div>
      <div class="stat-box">
        <div class="kpi-label">美的補助核發率</div>
        <div class="stat-num">${subsidyRate}<span style="font-size:16px">%</span> <span style="font-size:13px;color:var(--muted);font-family:'IBM Plex Sans';font-weight:500">NT$ ${fmt(subsidyReceived)} / ${fmt(subsidyPlanned)}</span></div>
        <div class="kpi-bar"><i style="width:${Math.min(100, subsidyRate)}%;background:var(--steel)"></i></div>
      </div>
    </div>
    <div class="dash-grid">
      <div class="card dash-panel">
        <div class="dash-panel-head"><div><div class="kpi-label">未來 30 天</div><div class="dash-panel-title">重點活動與任務</div></div></div>
        <div class="dash-list">${upcomingRows}</div>
      </div>
      <div class="card dash-panel">
        <div class="dash-panel-head"><div><div class="kpi-label">管理追蹤</div><div class="dash-panel-title">待決策事項</div></div></div>
        <div class="dash-list">${decisionRows}</div>
      </div>
      <div class="card dash-panel">
        <div class="dash-panel-head"><div><div class="kpi-label">管理風險</div><div class="dash-panel-title">高風險專案</div></div></div>
        <div class="dash-list">${riskRows}</div>
      </div>
      <div class="card dash-panel">
        <div class="dash-panel-head"><div><div class="kpi-label">資源配置</div><div class="dash-panel-title">預算分類</div></div></div>
        <div class="dash-mix">${categoryRows}</div>
      </div>
    </div>
    <div style="margin-top:16px">
      <div class="kpi-label" style="margin-bottom:8px">重點專案 Top 5</div>
      <div class="rowlist">${focusRows}</div>
    </div>`;
}

// ── CAMPAIGNS：總表 ──
async function renderCampaignsPage(){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  const data = await GET('marketing_campaigns?order=created_at.desc') || [];
  CAMPAIGNS = sortByStatus(data);
  _campaignView = 'list';
  _renderCampaignsBody();
}

function _renderCampaignsBody(){
  const isGantt = _campaignView === 'gantt';
  const rows = CAMPAIGNS.map(c => `
    <tr onclick="campaignDetail('${c.id}')">
      <td class="tb-name">${esc(c.name)}</td>
      <td>${tag(c.status)}</td>
      <td class="mono tb-amt">NT$ ${fmt(c.budget)}</td>
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
    <div id="campaign-list" style="${isGantt ? 'display:none' : ''}" class="tw">
      <table>
        <thead><tr><th>專案名稱</th><th>執行狀態</th><th>預算</th></tr></thead>
        <tbody>${rows || ''}</tbody>
      </table>
      ${rows ? '' : '<div class="empty">尚無行銷案</div>'}
    </div>
    <div id="campaign-gantt" style="${isGantt ? '' : 'display:none'}"></div>`;
  if (isGantt) renderCampaignGantt();
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

function renderTasksBlock(tasks){
  const rows = tasks.map(t => `
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
    </tr>`).join('');
  return `
    <div class="tw">
      <table>
        <thead><tr><th>#</th><th>任務／里程碑</th><th>負責人</th><th>預計時程</th><th>狀態</th><th>完成率</th></tr></thead>
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
    </tr>`).join('');
  return `
    <div class="tw">
      <table>
        <thead><tr><th>類型</th><th>事項</th><th>影響</th><th>狀態</th><th>負責人</th><th>到期日</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${rows ? '' : '<div class="empty">尚無風險或待決事項，點擊「＋ 新增事項」開始追蹤</div>'}
    </div>`;
}

// ── CAMPAIGNS：詳情頁 ──
async function campaignDetail(id){
  detailCampaignId = id;
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  let c = CAMPAIGNS.find(x => x.id === id);
  if (!c) { const r = await GET(`marketing_campaigns?id=eq.${id}`); c = r?.[0]; }
  if (!c) { document.getElementById('vc').innerHTML = '<div class="empty">找不到此行銷案</div>'; return; }
  TASKS = await GET(`marketing_campaign_tasks?campaign_id=eq.${id}&order=seq.asc,created_at.asc`) || [];
  BUDGET_ITEMS = await GET(`marketing_campaign_budget_items?campaign_id=eq.${id}&order=seq.asc,created_at.asc`) || [];
  DOCS = await GET(`marketing_campaign_documents?campaign_id=eq.${id}&order=uploaded_at.desc`) || [];
  RISKS = await safeGET(`marketing_campaign_risks?campaign_id=eq.${id}&order=due_date.asc,created_at.desc`);
  const docsWithUrl = await Promise.all(DOCS.map(async d => ({ doc: d, url: await getSignedUrl('campaign-documents', d.file_path) })));

  const execRate = c.budget ? Math.round((Number(c.actual_spend) || 0) / c.budget * 100) : 0;
  const hasTime = c.planned_start || c.planned_end || c.actual_start || c.actual_end;
  const hasSubsidyMeta = c.midea_budget_code || c.payment_status || c.claim_status || c.flight_cost != null;

  document.getElementById('vc').innerHTML = `
    <div class="ph">
      <div>
        <button class="btn btn-outline btn-sm" onclick="nav('campaigns')" style="margin-bottom:12px">← 返回總表</button>
        <div class="pt">${esc(c.name)}</div>
        <div class="ps" style="display:flex;align-items:center;gap:10px;margin-top:8px">${tag(c.status)}</div>
      </div>
      <button class="btn btn-primary" onclick="openCampaignModal('${c.id}')">編輯</button>
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
        <div class="kpi-label">專案預算</div>
        <div class="stat-num">NT$ ${fmt(c.budget)}</div>
        <div class="muted-text" style="margin-top:6px">實際花費 NT$ ${fmt(c.actual_spend)}（${execRate}%）</div>
        <div class="kpi-bar" style="background:var(--line)"><i style="width:${Math.min(100, execRate)}%;background:var(--teal)"></i></div>
        ${(c.subsidy_planned != null || c.subsidy_received != null) ? `
          <div class="muted-text" style="margin-top:10px">美的預計補助 NT$ ${fmt(c.subsidy_planned)}</div>
          <div class="muted-text" style="margin-top:2px">美的已核發補助 NT$ ${fmt(c.subsidy_received)}</div>` : ''}
      </div>

      <div class="card detail-block">
        <div class="kpi-label">負責人</div>
        <div class="detail-text">${c.owner ? esc(c.owner) : '<span class="muted-text">尚未填寫</span>'}</div>
      </div>

      <div class="card detail-block">
        <div class="kpi-label">負責單位<span class="muted-text" style="text-transform:none;letter-spacing:0"> · 主要配合單位</span></div>
        <div class="detail-text">${c.owner_unit ? esc(c.owner_unit) : '<span class="muted-text">尚未填寫</span>'}</div>
      </div>

      <div class="card detail-block ff">
        <div class="kpi-label">負責公司<span class="muted-text" style="text-transform:none;letter-spacing:0"> · 外包合作對象</span></div>
        <div class="detail-text">${(c.vendors && c.vendors.length) ? c.vendors.map(v => esc(v)).join('、') : '<span class="muted-text">尚未填寫</span>'}</div>
      </div>

      ${hasSubsidyMeta ? `
      <div class="card detail-block">
        <div class="kpi-label">補助與請款狀態</div>
        ${c.midea_budget_code ? `<div class="detail-text" style="font-size:14px">美的預算編號　<span class="mono">${esc(c.midea_budget_code)}</span></div>` : ''}
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
  openM('mrisk');
}

async function saveRisk(){
  const title = document.getElementById('rm-name').value.trim();
  if (!title) { alert('請輸入事項標題'); return; }
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
  } catch (e) {
    alert('風險與待決事項資料表尚未啟用，請先在 Supabase SQL Editor 執行 schema_v10_risks.sql。');
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

function openCampaignModal(id){
  editCampaignId = id || null;
  const c = id ? CAMPAIGNS.find(x => x.id === id) : null;
  document.getElementById('cm-title').textContent = id ? '編輯行銷案' : '新增行銷案';
  document.getElementById('cm-name').value = c?.name || '';
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
  let savedId = editCampaignId;
  if (editCampaignId) await PATCH(`marketing_campaigns?id=eq.${editCampaignId}`, payload);
  else { const r = await POST('marketing_campaigns', payload); savedId = r?.[0]?.id; }
  closeM('mcampaign');
  CAMPAIGNS = sortByStatus(await GET('marketing_campaigns?order=created_at.desc') || []);
  if (savedId && detailCampaignId === savedId) await campaignDetail(savedId);
  else if (_view === 'campaigns') _renderCampaignsBody();
  else await nav(_view);
}

async function delCampaign(){
  if (!editCampaignId) return;
  if (!confirm('確定刪除此行銷案？')) return;
  await DEL(`marketing_campaigns?id=eq.${editCampaignId}`);
  closeM('mcampaign');
  await renderCampaignsPage();
}

function csvCell(v){
  const s = (v ?? '').toString();
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function exportCampaignsCSV(){
  const headers = ['專案名稱', '執行狀態', '預算', '實際花費', '美的預計補助', '美的已核發補助', '美的預算編號', '付款狀態', '請款狀態', '機票費用', '負責人', '負責單位', '負責公司', '預計開始', '預計結束', '實際開始', '實際結束', '專案說明'];
  const rows = CAMPAIGNS.map(c => [c.name, c.status, c.budget, c.actual_spend, c.subsidy_planned, c.subsidy_received, c.midea_budget_code, c.payment_status, c.claim_status, c.flight_cost, c.owner, c.owner_unit, (c.vendors || []).join('、'), c.planned_start, c.planned_end, c.actual_start, c.actual_end, c.purpose]);
  const csv = [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `行銷案清單_${todayISO()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
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
      <div><div class="pt">每週文案彙整</div><div class="ps">手動彙整，確認後自行貼到 Facebook / Google Sheet</div></div>
      <button class="btn btn-primary" onclick="openDraftModal()">＋ 新增文案</button>
    </div>
    ${body}`;
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
    preview.innerHTML = url ? `<img src="${url}" style="max-width:200px;display:block">` : '';
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

// ── MODAL ──
function openM(id){ document.getElementById(id).classList.add('open'); }
function closeM(id){ document.getElementById(id).classList.remove('open'); }
