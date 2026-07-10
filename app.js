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
let _view = 'dashboard';
let _campaignView = 'list';
let editCampaignId = null;
let editDraftId = null;
let detailCampaignId = null;
let vendorRows = [];

// ── NAV ──
async function nav(view){
  _view = view;
  document.querySelectorAll('.ni').forEach(el => el.classList.toggle('on', el.dataset.view === view));
  if (view === 'dashboard') await renderDashboard();
  else if (view === 'campaigns') await renderCampaignsPage();
  else if (view === 'drafts') await renderDraftsPage();
  else if (view === 'news') await renderNewsPage();
}

function tag(status){
  const cls = STATUS_CLASS[status] || 'muted';
  return `<span class="tag tag-${cls}">${esc(status)}</span>`;
}

// ── DASHBOARD ──
async function renderDashboard(){
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  CAMPAIGNS = await GET('marketing_campaigns?order=created_at.desc') || [];
  const total = CAMPAIGNS.length;
  const statusCounts = STATUS_ORDER.map(s => ({ status: s, count: CAMPAIGNS.filter(c => c.status === s).length }));
  const totalBudget = CAMPAIGNS.reduce((s, c) => s + (Number(c.budget) || 0), 0);
  const totalSpend = CAMPAIGNS.reduce((s, c) => s + (Number(c.actual_spend) || 0), 0);
  const execRate = totalBudget ? Math.round(totalSpend / totalBudget * 100) : 0;

  const recent = CAMPAIGNS.slice(0, 5).map(c => `
    <div class="rowcard st-${STATUS_CLASS[c.status] || ''}" onclick="campaignDetail('${c.id}')">
      <div class="row-info"><div class="row-name">${esc(c.name)}</div></div>
      <div class="row-right">
        <div class="row-amt">NT$ ${fmt(c.budget)}</div>
        ${tag(c.status)}
      </div>
    </div>`).join('') || '<div class="empty">尚無行銷案</div>';

  document.getElementById('vc').innerHTML = `
    <div class="ph"><div><div class="pt">總覽</div><div class="ps">${new Date().getFullYear()} 年度行銷規劃</div></div>
      <button class="btn btn-primary" onclick="openCampaignModal()">＋ 新增行銷案</button></div>
    <div class="kpi-strip">
      <div class="kpi-seg"><div class="kpi-label">全部行銷案</div><div class="kpi-val mono">${total}</div></div>
      ${statusCounts.map(({ status, count }) => `
        <div class="kpi-seg"><div class="kpi-label">${esc(status)}</div><div class="kpi-val mono" style="color:${STATUS_HEX[status]}">${count}</div></div>`).join('')}
    </div>
    <div class="stat-row">
      <div class="stat-box"><div class="kpi-label">年度總預算</div><div class="stat-num">NT$ ${fmt(totalBudget)}</div></div>
      <div class="stat-box">
        <div class="kpi-label">預算執行率</div>
        <div class="stat-num">${execRate}<span style="font-size:16px">%</span> <span style="font-size:13px;color:var(--muted);font-family:'IBM Plex Sans';font-weight:500">NT$ ${fmt(totalSpend)} 已花費</span></div>
        <div class="kpi-bar"><i style="width:${Math.min(100, execRate)}%;background:var(--teal)"></i></div>
      </div>
    </div>
    <div>
      <div class="kpi-label" style="margin-bottom:8px">最近更新行銷案</div>
      <div class="rowlist">${recent}</div>
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

// ── CAMPAIGNS：詳情頁 ──
async function campaignDetail(id){
  detailCampaignId = id;
  document.getElementById('vc').innerHTML = '<div class="loading">Loading</div>';
  let c = CAMPAIGNS.find(x => x.id === id);
  if (!c) { const r = await GET(`marketing_campaigns?id=eq.${id}`); c = r?.[0]; }
  if (!c) { document.getElementById('vc').innerHTML = '<div class="empty">找不到此行銷案</div>'; return; }

  const execRate = c.budget ? Math.round((Number(c.actual_spend) || 0) / c.budget * 100) : 0;
  const hasTime = c.planned_start || c.planned_end || c.actual_start || c.actual_end;

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

      ${c.notes ? `<div class="card detail-block ff"><div class="kpi-label">備註</div><div class="detail-text">${esc(c.notes)}</div></div>` : ''}
    </div>`;
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
  const headers = ['專案名稱', '執行狀態', '預算', '實際花費', '美的預計補助', '美的已核發補助', '負責人', '負責單位', '負責公司', '預計開始', '預計結束', '實際開始', '實際結束', '專案說明'];
  const rows = CAMPAIGNS.map(c => [c.name, c.status, c.budget, c.actual_spend, c.subsidy_planned, c.subsidy_received, c.owner, c.owner_unit, (c.vendors || []).join('、'), c.planned_start, c.planned_end, c.actual_start, c.actual_end, c.purpose]);
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

// ── MODAL ──
function openM(id){ document.getElementById(id).classList.add('open'); }
function closeM(id){ document.getElementById(id).classList.remove('open'); }
