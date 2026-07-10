// ── 共用 helper ──
const esc = s => (s ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => n == null || n === '' ? '-' : Number(n).toLocaleString('zh-TW');
const fd  = s => s ? s.slice(5).replace('-', '/') : '';
const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_COLOR = { '估價': '#F59E0B', '進行中': '#3B82F6', '結案': '#10B981' };
const STATUS_BADGE  = { '估價': 'ba', '進行中': 'bb', '結案': 'bg' };

let CAMPAIGNS = [];
let DRAFTS = [];
let KEYWORDS = [];
let _view = 'dashboard';
let _campaignView = 'list';
let editCampaignId = null;
let editDraftId = null;

// ── NAV ──
async function nav(view){
  _view = view;
  document.querySelectorAll('.ni').forEach(el => el.classList.toggle('on', el.dataset.view === view));
  if (view === 'dashboard') await renderDashboard();
  else if (view === 'campaigns') await renderCampaignsPage();
  else if (view === 'drafts') await renderDraftsPage();
  else if (view === 'news') await renderNewsPage();
}

// ── DASHBOARD ──
async function renderDashboard(){
  document.getElementById('vc').innerHTML = '<div class="loading">載入中...</div>';
  CAMPAIGNS = await GET('marketing_campaigns?order=created_at.desc') || [];
  const total = CAMPAIGNS.length;
  const inProgress = CAMPAIGNS.filter(c => c.status === '進行中').length;
  const quoting = CAMPAIGNS.filter(c => c.status === '估價').length;
  const closed = CAMPAIGNS.filter(c => c.status === '結案').length;
  const totalBudget = CAMPAIGNS.reduce((s, c) => s + (Number(c.budget) || 0), 0);
  const totalSpend = CAMPAIGNS.reduce((s, c) => s + (Number(c.actual_spend) || 0), 0);
  const recent = CAMPAIGNS.slice(0, 5).map(c => `
    <div class="proj-top" style="cursor:pointer" onclick="openCampaignModal('${c.id}')">
      <div class="proj-info">
        <div class="proj-name">${esc(c.name)}</div>
        <div class="proj-meta">${esc(c.partner || '')}${c.vendor ? ' · 委外：' + esc(c.vendor) : ''}</div>
      </div>
      <div class="proj-right">
        <span class="badge ${STATUS_BADGE[c.status] || 'bx'}">${esc(c.status)}</span>
      </div>
    </div>`).join('') || '<div style="text-align:center;padding:32px;color:var(--muted)">尚無行銷案</div>';

  document.getElementById('vc').innerHTML = `
    <div class="ph"><div><div class="pt">總覽</div><div class="ps">${new Date().getFullYear()} 年度行銷規劃</div></div>
      <button class="btn btn-primary" onclick="openCampaignModal()">＋ 新增行銷案</button></div>
    <div class="sg">
      <div class="sc"><div class="sl">全部行銷案</div><div class="sv">${total}</div></div>
      <div class="sc"><div class="sl">進行中</div><div class="sv" style="color:${STATUS_COLOR['進行中']}">${inProgress}</div></div>
      <div class="sc"><div class="sl">估價中</div><div class="sv" style="color:${STATUS_COLOR['估價']}">${quoting}</div></div>
      <div class="sc"><div class="sl">已結案</div><div class="sv" style="color:${STATUS_COLOR['結案']}">${closed}</div></div>
    </div>
    <div class="sg" style="grid-template-columns:repeat(2,1fr)">
      <div class="sc"><div class="sl">年度總預算</div><div class="sv">NT$ ${fmt(totalBudget)}</div></div>
      <div class="sc"><div class="sl">實際花費</div><div class="sv">NT$ ${fmt(totalSpend)}</div>
        <div class="ss">${totalBudget ? Math.round(totalSpend / totalBudget * 100) : 0}% 預算執行率</div></div>
    </div>
    <div class="card">
      <div style="font-weight:700;margin-bottom:8px">最近更新行銷案</div>
      <div class="proj-list">${recent}</div>
    </div>`;
}

// ── CAMPAIGNS ──
async function renderCampaignsPage(){
  document.getElementById('vc').innerHTML = '<div class="loading">載入中...</div>';
  CAMPAIGNS = await GET('marketing_campaigns?order=created_at.desc') || [];
  _campaignView = 'list';
  _renderCampaignsBody();
}

function _renderCampaignsBody(){
  const isGantt = _campaignView === 'gantt';
  const cards = CAMPAIGNS.map(c => `
    <div class="proj-card">
      <div class="proj-top" onclick="openCampaignModal('${c.id}')">
        <div class="proj-info">
          <div class="proj-name">${esc(c.name)}</div>
          <div class="proj-meta">${esc(c.partner || '未填配合單位')}${c.vendor ? ' · 委外：' + esc(c.vendor) : ''}${c.purpose ? ' · ' + esc(c.purpose) : ''}</div>
        </div>
        <div class="proj-right">
          <div class="proj-amt">NT$ ${fmt(c.budget)}</div>
          <span class="badge ${STATUS_BADGE[c.status] || 'bx'}">${esc(c.status)}</span>
        </div>
      </div>
    </div>`).join('');

  document.getElementById('vc').innerHTML = `
    <div class="ph">
      <div><div class="pt">行銷案管理</div><div class="ps">共 ${CAMPAIGNS.length} 筆</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline btn-sm" id="btn-gantt-toggle" onclick="toggleCampaignGantt()" style="${isGantt ? 'background:var(--primary);color:#fff;border-color:var(--primary)' : ''}">📅 甘特圖</button>
        <button class="btn btn-primary" onclick="openCampaignModal()">＋ 新增行銷案</button>
      </div>
    </div>
    <div id="campaign-list" style="${isGantt ? 'display:none' : ''}" class="proj-list">${cards || '<div style="text-align:center;padding:48px;color:var(--muted)">尚無行銷案</div>'}</div>
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
    gantt.innerHTML = '<div style="text-align:center;padding:48px;color:var(--muted)">尚無填寫時程資料的行銷案</div>';
    return;
  }
  const allDates = items.flatMap(c => [c.planned_start, c.planned_end, c.actual_start, c.actual_end].filter(Boolean));
  const minD = new Date(allDates.reduce((a, b) => a < b ? a : b));
  const maxD = new Date(allDates.reduce((a, b) => a > b ? a : b));
  minD.setDate(1); maxD.setMonth(maxD.getMonth() + 1); maxD.setDate(0);
  const totalDays = Math.max(1, Math.round((maxD - minD) / 86400000));
  const months = []; let d = new Date(minD);
  while (d <= maxD) { months.push({ label: `${d.getFullYear()}/${d.getMonth() + 1}`, left: Math.round((d - minD) / 86400000 / totalDays * 100) }); d.setMonth(d.getMonth() + 1); }
  const pct = ds => Math.max(0, Math.min(100, Math.round((new Date(ds) - minD) / 86400000 / totalDays * 100)));
  const rows = items.map(c => {
    const s = c.actual_start || c.planned_start;
    const e = c.actual_end || c.planned_end || s;
    const left = pct(s); const w = Math.max(1, pct(e) - left);
    const color = STATUS_COLOR[c.status] || '#64748b';
    return `<div style="display:grid;grid-template-columns:180px 1fr;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9">
      <div style="font-size:12px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:pointer;color:var(--primary)" onclick="openCampaignModal('${c.id}')" title="${esc(c.name)}">${esc(c.name)}</div>
      <div style="position:relative;height:24px;background:#f8fafc;border-radius:4px">
        <div style="position:absolute;left:${left}%;width:${w}%;height:100%;background:${color};border-radius:4px;opacity:.85;display:flex;align-items:center;padding:0 6px;font-size:10px;color:#fff;white-space:nowrap;overflow:hidden">${fd(s)}${e !== s ? ` ～ ${fd(e)}` : ''}</div>
      </div></div>`;
  }).join('');
  const headerCols = months.map((m, i) => { const next = months[i + 1]; const w = next ? next.left - m.left : 100 - m.left; return `<div style="position:absolute;left:${m.left}%;width:${w}%;font-size:10px;color:var(--muted);border-left:1px dashed #e2e8f0;padding-left:3px">${m.label}</div>`; }).join('');
  const legend = Object.entries(STATUS_COLOR).map(([s, c]) => `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;margin-right:10px"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${c}"></span>${s}</span>`).join('');
  gantt.innerHTML = `
    <div class="card" style="overflow-x:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
        <div style="font-size:14px;font-weight:700">行銷案時程甘特圖</div>
        <div style="display:flex;gap:10px;align-items:center">${legend}</div>
      </div>
      <div style="display:grid;grid-template-columns:180px 1fr;gap:8px;margin-bottom:4px"><div></div><div style="position:relative;height:18px">${headerCols}</div></div>
      ${rows}
    </div>`;
}

function openCampaignModal(id){
  editCampaignId = id || null;
  const c = id ? CAMPAIGNS.find(x => x.id === id) : null;
  document.getElementById('cm-title').textContent = id ? '編輯行銷案' : '新增行銷案';
  document.getElementById('cm-name').value = c?.name || '';
  document.getElementById('cm-budget').value = c?.budget ?? '';
  document.getElementById('cm-actual').value = c?.actual_spend ?? '';
  document.getElementById('cm-partner').value = c?.partner || '';
  document.getElementById('cm-purpose').value = c?.purpose || '';
  document.getElementById('cm-status').value = c?.status || '估價';
  document.getElementById('cm-vendor').value = c?.vendor || '';
  document.getElementById('cm-pstart').value = c?.planned_start || '';
  document.getElementById('cm-pend').value = c?.planned_end || '';
  document.getElementById('cm-astart').value = c?.actual_start || '';
  document.getElementById('cm-aend').value = c?.actual_end || '';
  document.getElementById('cm-notes').value = c?.notes || '';
  document.getElementById('cm-delete').style.display = id ? '' : 'none';
  openM('mcampaign');
}

async function saveCampaign(){
  const name = document.getElementById('cm-name').value.trim();
  if (!name) { alert('請輸入專案名稱'); return; }
  const payload = {
    name,
    budget: document.getElementById('cm-budget').value || null,
    actual_spend: document.getElementById('cm-actual').value || null,
    partner: document.getElementById('cm-partner').value.trim() || null,
    purpose: document.getElementById('cm-purpose').value.trim() || null,
    status: document.getElementById('cm-status').value,
    vendor: document.getElementById('cm-vendor').value.trim() || null,
    planned_start: document.getElementById('cm-pstart').value || null,
    planned_end: document.getElementById('cm-pend').value || null,
    actual_start: document.getElementById('cm-astart').value || null,
    actual_end: document.getElementById('cm-aend').value || null,
    notes: document.getElementById('cm-notes').value.trim() || null,
    updated_at: new Date().toISOString()
  };
  if (editCampaignId) await PATCH(`marketing_campaigns?id=eq.${editCampaignId}`, payload);
  else await POST('marketing_campaigns', payload);
  closeM('mcampaign');
  await renderCampaignsPage();
}

async function delCampaign(){
  if (!editCampaignId) return;
  if (!confirm('確定刪除此行銷案？')) return;
  await DEL(`marketing_campaigns?id=eq.${editCampaignId}`);
  closeM('mcampaign');
  await renderCampaignsPage();
}

// ── 每週文案彙整 ──
function mondayOf(dateStr){
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

async function renderDraftsPage(){
  document.getElementById('vc').innerHTML = '<div class="loading">載入中...</div>';
  DRAFTS = await GET('marketing_content_drafts?order=week_start.desc,created_at.desc') || [];
  CAMPAIGNS = await GET('marketing_campaigns?order=name.asc') || [];
  const groups = {};
  DRAFTS.forEach(d => { (groups[d.week_start] ||= []).push(d); });
  const weeks = Object.keys(groups).sort().reverse();
  const body = weeks.map(w => `
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-weight:700">📅 ${fd(w)} 那一週</div>
        <button class="btn btn-outline btn-sm" onclick="copyWeek('${w}')">📋 複製整週文案</button>
      </div>
      ${groups[w].map(d => `
        <div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:start">
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px">${esc(d.title || '（未命名文案）')}</div>
              <div style="font-size:12px;color:var(--muted);white-space:pre-wrap;margin-top:4px">${esc(d.content).slice(0, 160)}${d.content.length > 160 ? '…' : ''}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <span class="badge ${d.status === '已發布' ? 'bg' : d.status === '已採用' ? 'bb' : 'bx'}">${esc(d.status)}</span>
              <div style="margin-top:6px;display:flex;gap:4px">
                <button class="btn btn-outline btn-sm" onclick="openDraftModal('${d.id}')">編輯</button>
                <button class="btn btn-outline btn-sm" onclick="copyDraft('${d.id}')">複製</button>
              </div>
            </div>
          </div>
        </div>`).join('')}
    </div>`).join('') || '<div style="text-align:center;padding:48px;color:var(--muted)">尚無文案，點擊右上角新增</div>';

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
  document.getElementById('vc').innerHTML = '<div class="loading">載入中...</div>';
  KEYWORDS = await GET('marketing_news_keywords?order=created_at.asc') || [];
  const groups = KEYWORDS.map(k => `
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-weight:700">🔍 ${esc(k.keyword)}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="fetchNewsFor('${k.id}','${esc(k.keyword)}')">重新抓取</button>
          <button class="btn btn-outline btn-sm" style="color:var(--red)" onclick="delKeyword('${k.id}')">刪除關鍵字</button>
        </div>
      </div>
      <div id="news-${k.id}" style="font-size:12px;color:var(--muted)">尚未抓取，點擊「重新抓取」</div>
    </div>`).join('');

  document.getElementById('vc').innerHTML = `
    <div class="ph">
      <div><div class="pt">新聞蒐集</div><div class="ps">依關鍵字抓取 Google 新聞，供撰寫行銷文案參考</div></div>
    </div>
    <div class="card" style="margin-bottom:14px;display:flex;gap:8px;align-items:center">
      <input id="nk-input" placeholder="新增關鍵字" style="flex:1;padding:8px 11px;border-radius:7px;border:1px solid var(--border);font-size:13px">
      <button class="btn btn-primary btn-sm" onclick="addKeyword()">＋ 新增</button>
    </div>
    ${groups || '<div style="text-align:center;padding:48px;color:var(--muted)">尚無關鍵字，請先新增</div>'}`;
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
      <div style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;gap:10px;align-items:start">
        <div style="flex:1;min-width:0">
          <a href="${esc(it.link)}" target="_blank" rel="noopener" style="font-size:13px;font-weight:600;color:var(--text)">${esc(it.title)}</a>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${esc(it.source)}${it.pubDate ? ' · ' + esc(it.pubDate) : ''}</div>
        </div>
        <button class="btn btn-outline btn-sm" style="flex-shrink:0" onclick='createDraftFromNews(${JSON.stringify(it.title)}, ${JSON.stringify(it.link)})'>＋ 建立文案草稿</button>
      </div>`).join('');
  } catch(e){
    box.innerHTML = `<span style="color:var(--red)">抓取失敗：${esc(e.message)}</span>`;
  }
}

async function createDraftFromNews(title, link){
  CAMPAIGNS = await GET('marketing_campaigns?order=name.asc') || [];
  openDraftModal(null, { title, source_note: link });
}

// ── MODAL ──
function openM(id){ document.getElementById(id).classList.add('open'); }
function closeM(id){ document.getElementById(id).classList.remove('open'); }
