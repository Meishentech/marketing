const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; MeisunTenderMonitor/1.0)',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

export const DEFAULT_SCAN_CATEGORIES = [
  'bid_open',
  'procurement',
  'deadline',
  'chiller',
  'central_ac',
  'ventilation',
  'maglev',
  'exclude_closed',
  'exclude_residential'
];

const CATEGORY_RULES = {
  bid_open: { label: '招標 / 投標中', score: 30, terms: ['招標', '公開招標', '投標', '領標', '開標', '招商'] },
  procurement: { label: '採購 / 報價', score: 24, terms: ['採購', '報價', '徵求', '邀標', '標案', '公告'] },
  deadline: { label: '截止 / 開標日期', score: 10, terms: ['截止', '期限', '開標日期', '投標截止', '收件截止'] },
  chiller: { label: '冰水主機', score: 45, terms: ['冰水主機', '冰水機', '冰機', 'chiller', 'Chiller'] },
  central_ac: { label: '中央空調 / 空調設備', score: 34, terms: ['中央空調', '空調設備', '空調系統', '空調工程', '空調'] },
  ventilation: { label: '通風設備', score: 26, terms: ['通風設備', '通風系統', '排風', '排煙', '送風'] },
  maglev: { label: '磁浮 / 磁懸浮', score: 50, terms: ['磁浮', '磁懸浮', '磁軸承'] },
  exclude_closed: { label: '排除決標 / 得標', score: -80, terms: ['決標', '得標', '流標', '廢標', '結果公告', '得標廠商'] },
  exclude_residential: { label: '降低家用冷氣', score: -40, terms: ['家用冷氣', '分離式冷氣', '窗型冷氣', '冷氣機', '冷氣維修'] }
};

const FILTER_THRESHOLDS = {
  '保守': { high: 55, review: 0 },
  '平衡': { high: 70, review: 25 },
  '嚴格': { high: 85, review: 45 }
};

const ACTIVE_SEARCH_REQUEST_LIMIT = 12;

export function createSupabaseClient({ supabaseUrl, serviceKey, apiKey, authToken }) {
  const restKey = apiKey || serviceKey;
  const authHeader = authToken || (serviceKey ? `Bearer ${serviceKey}` : '');
  if (!supabaseUrl || !restKey || !authHeader) throw new Error('缺少 Supabase 連線資訊');
  async function request(method, path, body, extraHeaders = {}) {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: restKey,
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...extraHeaders
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error(`Supabase ${method} ${path} 失敗: ${res.status} ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  }
  return {
    get: path => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    del: path => request('DELETE', path)
  };
}

export async function scanAllActiveProjects(options) {
  const sb = options.sb || createSupabaseClient(options);
  const projects = await sb.get('tender_projects?is_active=eq.true&order=sort_order.asc,created_at.asc');
  const results = [];
  for (const project of projects || []) {
    results.push(await scanProject({ ...options, sb, projectId: project.id, project }));
  }
  return results;
}

export async function scanProject(options) {
  const sb = options.sb || createSupabaseClient(options);
  const project = options.project || (await sb.get(`tender_projects?id=eq.${options.projectId}`))?.[0];
  if (!project) throw new Error('找不到投標監測專案');

  const run = (await sb.post('tender_scan_runs', { project_id: project.id, status: 'running' }))?.[0];
  const startedAt = new Date().toISOString();
  try {
    const keywords = await sb.get(`tender_keywords?project_id=eq.${project.id}&is_active=eq.true&order=created_at.asc`);
    const explicitWords = (keywords || []).map(k => k.keyword).filter(Boolean);
    const words = explicitWords.length ? explicitWords : inferWordsFromSearchQueries(project);
    if (!words.length) throw new Error(project.scan_mode === '主動找案' ? '此主動找案專案沒有關鍵字或搜尋指令' : '此專案沒有啟用中的關鍵字');

    const candidates = new Map();
    let checkedPages = 0;
    if (project.scan_mode === '主動找案') {
      for (const item of await activeSearchCandidates({
        project,
        words,
        maxCandidates: options.maxCandidates || 30,
        requestLimit: options.activeSearchRequestLimit || ACTIVE_SEARCH_REQUEST_LIMIT
      })) {
        if (!candidates.has(item.url)) candidates.set(item.url, item);
      }
      checkedPages = candidates.size;
    } else {
      const pages = projectPageUrls(project.source_url, options.pageLimitOverride || project.page_limit || 1);
      checkedPages = pages.length;
      for (const pageUrl of pages) {
        const html = await fetchHtml(pageUrl);
        for (const item of extractScanCandidates(html, pageUrl, options.maxCandidates || 80)) {
          if (!candidates.has(item.url)) candidates.set(item.url, item);
        }
      }
    }

    let foundCount = 0;
    let newCount = 0;
    const matchedRows = [];
    for (const item of candidates.values()) {
      let detailHtml = '';
      if (options.fetchDetails !== false) {
        try { detailHtml = await fetchHtml(item.url); }
        catch { detailHtml = ''; }
      }

      const detailText = htmlToText(detailHtml);
      const title = cleanText(extractTitle(detailHtml) || item.title);
      const haystack = `${title}\n${item.pageText || ''}\n${detailText}`;
      const matchedKeywords = words.filter(w => haystack.includes(w));
      const relevance = evaluateTenderRelevance({
        text: haystack,
        matchedKeywords,
        scanCategories: project.scan_categories,
        filterMode: project.filter_mode
      });
      if (project.scan_mode !== '主動找案' && !matchedKeywords.length) continue;
      if (project.scan_mode === '主動找案' && !matchedKeywords.length && relevance.score < relevance.thresholds.review) continue;

      const publishedAt = extractPublishedDate(`${detailText}\n${item.pageText || ''}\n${title}`);
      if (project.scan_mode === '主動找案' && isStaleActiveSearchResult(haystack, publishedAt)) continue;

      foundCount++;
      const snippet = makeSnippet(haystack, matchedKeywords[0]);
      const existing = await sb.get(`tender_results?project_id=eq.${project.id}&url=eq.${encodeURIComponent(item.url)}&select=id`);
      const resultPayload = {
        title,
        published_at: publishedAt,
        matched_keywords: matchedKeywords,
        snippet,
        relevance_score: relevance.score,
        relevance_level: relevance.level,
        relevance_reasons: relevance.reasons
      };
      if (existing?.[0]?.id) {
        await saveTenderResult(sb, 'patch', `tender_results?id=eq.${existing[0].id}`, {
          ...resultPayload,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else {
        await saveTenderResult(sb, 'post', 'tender_results', {
          project_id: project.id,
          url: item.url,
          ...resultPayload
        });
        newCount++;
      }
      matchedRows.push({ title, url: item.url, publishedAt, matchedKeywords, snippet, relevance });
    }

    const preservedExistingResults = foundCount === 0 && project.scan_mode === '主動找案';
    if (foundCount === 0 && project.scan_mode !== '主動找案') {
      await sb.del(`tender_results?project_id=eq.${project.id}`).catch(() => {});
    }

    await sb.patch(`tender_scan_runs?id=eq.${run.id}`, {
      status: 'success',
      checked_pages: checkedPages,
      found_count: foundCount,
      new_count: newCount,
      finished_at: new Date().toISOString()
    });
    await sb.patch(`tender_projects?id=eq.${project.id}`, {
      last_scanned_at: startedAt,
      last_scan_status: preservedExistingResults
        ? '成功：主動找案本次未回傳新結果，已保留既有結果'
        : `成功：命中 ${foundCount} 筆，新發現 ${newCount} 筆`,
      updated_at: new Date().toISOString()
    });

    if (newCount > 0 && options.notify !== false) {
      await sendNotification({ project, rows: matchedRows.slice(0, newCount), ...options }).catch(err => {
        console.warn(`通知寄送失敗：${err.message}`);
      });
    }

    return { projectId: project.id, checkedPages, foundCount, newCount, preservedExistingResults, matches: matchedRows };
  } catch (err) {
    if (run?.id) {
      await sb.patch(`tender_scan_runs?id=eq.${run.id}`, {
        status: 'failed',
        error_message: err.message,
        finished_at: new Date().toISOString()
      }).catch(() => {});
    }
    await sb.patch(`tender_projects?id=eq.${project.id}`, {
      last_scanned_at: startedAt,
      last_scan_status: `失敗：${err.message}`,
      updated_at: new Date().toISOString()
    }).catch(() => {});
    throw err;
  }
}

export function projectPageUrls(sourceUrl, pageLimit = 1) {
  const limit = Math.max(1, Math.min(Number(pageLimit) || 1, 10));
  const urls = [];
  for (let pageNo = 1; pageNo <= limit; pageNo++) {
    const url = new URL(sourceUrl);
    if (url.searchParams.has('pageNo') || limit > 1) url.searchParams.set('pageNo', String(pageNo));
    urls.push(url.toString());
  }
  return urls;
}

export async function fetchHtml(url) {
  const res = await fetch(url, { headers: DEFAULT_HEADERS });
  if (!res.ok) throw new Error(`讀取公告頁失敗 ${res.status}: ${url}`);
  const buf = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || '';
  const firstPass = new TextDecoder('utf-8').decode(buf);
  const charset = (contentType.match(/charset=([^;]+)/i)?.[1] || firstPass.match(/charset=["']?([\w-]+)/i)?.[1] || 'utf-8').toLowerCase();
  try {
    return new TextDecoder(charset === 'big5' ? 'big5' : charset).decode(buf);
  } catch {
    return firstPass;
  }
}

export function extractTenderLinks(html, baseUrl, maxLinks = 80) {
  const links = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && links.length < maxLinks) {
    const href = decodeHtml(m[1]);
    if (!/page_name=detail/i.test(href) || !/aid=803/i.test(href)) continue;
    const titleAttr = m[0].match(/\btitle=["']([^"']+)["']/i)?.[1];
    const title = cleanText(decodeHtml(titleAttr || htmlToText(m[2])));
    const url = new URL(href, baseUrl).toString();
    if (title) links.push({ title, url });
  }
  return links;
}

export function extractScanCandidates(html, baseUrl, maxLinks = 80) {
  const tenderLinks = extractTenderLinks(html, baseUrl, maxLinks);
  if (tenderLinks.length) return tenderLinks;

  const base = new URL(baseUrl);
  const seen = new Set();
  const candidates = [{
    title: cleanText(extractTitle(html) || base.hostname),
    url: base.toString(),
    pageText: htmlToText(html)
  }];
  seen.add(normalizeCandidateUrl(base.toString()));

  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && candidates.length < maxLinks) {
    const href = decodeHtml(m[1]).trim();
    if (!href || /^(#|javascript:|mailto:|tel:)/i.test(href)) continue;
    let url;
    try { url = new URL(href, baseUrl); }
    catch { continue; }
    if (url.hostname !== base.hostname) continue;
    if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|rar|css|js|ico)(\?|$)/i.test(url.pathname)) continue;
    const normalized = normalizeCandidateUrl(url.toString());
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    const titleAttr = m[0].match(/\btitle=["']([^"']+)["']/i)?.[1];
    const title = cleanText(decodeHtml(titleAttr || htmlToText(m[2])) || url.pathname);
    if (title) candidates.push({ title, url: normalized });
  }
  return candidates;
}

async function activeSearchCandidates({ project, words, maxCandidates = 30, requestLimit = ACTIVE_SEARCH_REQUEST_LIMIT }) {
  const queries = activeSearchQueries(project, words);
  const seen = new Set();
  const candidates = [];
  let requestCount = 0;
  for (const query of queries) {
    if (candidates.length >= maxCandidates) break;
    for (const searchQuery of activeSearchQueryVariants(query)) {
      if (candidates.length >= maxCandidates) break;
      if (requestCount >= requestLimit) return candidates;
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
      let html = '';
      requestCount++;
      try { html = await fetchHtml(url); }
      catch { continue; }
      for (const item of extractSearchResultLinks(html, url)) {
        if (candidates.length >= maxCandidates) break;
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        candidates.push(item);
      }
    }
  }
  return candidates;
}

function activeSearchQueries(project, words) {
  const custom = Array.isArray(project.search_queries) ? project.search_queries.map(q => String(q || '').trim()).filter(Boolean) : [];
  if (custom.length) return custom.slice(0, 12);
  const priorityWords = (words || []).slice(0, 8);
  const intents = ['招標', '採購', '公開招標', '投標截止'];
  const queries = [];
  for (const word of priorityWords) {
    for (const intent of intents) queries.push(`${word} ${intent}`);
  }
  return queries.slice(0, 12);
}

function activeSearchQueryVariants(query) {
  const base = String(query || '').trim();
  if (!base) return [];
  const year = new Date().getFullYear();
  const rocYear = year - 1911;
  const variants = [base];
  if (!base.includes(String(year)) && !base.includes(String(rocYear))) {
    variants.unshift(`${base} ${year}`);
    variants.push(`${base} ${rocYear}年`);
  }
  return variants;
}

function inferWordsFromSearchQueries(project) {
  const queries = Array.isArray(project.search_queries) ? project.search_queries : [];
  const stopTerms = new Set(['招標', '採購', '公開招標', '投標', '投標截止', '截止', '開標', '公告', '標案', '報價', '徵求', '案']);
  const words = [];
  for (const query of queries) {
    const parts = String(query || '').split(/[\s,，、+]+/).map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (stopTerms.has(part)) continue;
      if (part.length < 2) continue;
      words.push(part);
    }
  }
  return [...new Set(words)].slice(0, 12);
}

function extractSearchResultLinks(html, baseUrl) {
  const links = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const rawHref = decodeHtml(m[1]);
    const url = normalizeSearchResultUrl(rawHref, baseUrl);
    if (!url) continue;
    const title = cleanText(htmlToText(m[2]));
    if (!title || /^(圖片|影片|新聞|更多|下一頁|上一頁)$/.test(title)) continue;
    const pageText = cleanText(`${title} ${nearbyText(html, m.index, 420)}`);
    links.push({ title, url, pageText });
  }
  return dedupeCandidates(links).slice(0, 20);
}

function normalizeSearchResultUrl(rawHref, baseUrl) {
  let url;
  try { url = new URL(rawHref, baseUrl); }
  catch { return ''; }
  const uddg = url.searchParams.get('uddg');
  if (uddg) {
    try { url = new URL(uddg); }
    catch { return ''; }
  }
  if (!/^https?:$/.test(url.protocol)) return '';
  if (/duckduckgo\.com$/i.test(url.hostname)) return '';
  if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|rar|css|js|ico)(\?|$)/i.test(url.pathname)) return '';
  url.hash = '';
  return url.toString();
}

function nearbyText(html, index, size) {
  const start = Math.max(0, index);
  return htmlToText(String(html || '').slice(start, start + size));
}

function dedupeCandidates(items) {
  const seen = new Set();
  const rows = [];
  for (const item of items) {
    const key = normalizeCandidateUrl(item.url);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ ...item, url: key });
  }
  return rows;
}

function normalizeCandidateUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.hash = '';
  return url.toString();
}

export function evaluateTenderRelevance({ text, matchedKeywords = [], scanCategories, filterMode = '保守' }) {
  const categories = Array.isArray(scanCategories) && scanCategories.length ? scanCategories : DEFAULT_SCAN_CATEGORIES;
  const thresholds = FILTER_THRESHOLDS[filterMode] || FILTER_THRESHOLDS['保守'];
  const body = String(text || '');
  const reasons = [];
  let score = 0;

  for (const keyword of matchedKeywords) {
    const weight = keywordWeight(keyword);
    score += weight;
    reasons.push(`關鍵字「${keyword}」+${weight}`);
  }

  for (const category of categories) {
    const rule = CATEGORY_RULES[category];
    if (!rule) continue;
    const matchedTerms = rule.terms.filter(term => body.includes(term));
    if (!matchedTerms.length) continue;
    score += rule.score;
    const sign = rule.score > 0 ? '+' : '';
    reasons.push(`${rule.label}：${matchedTerms.slice(0, 3).join('、')} ${sign}${rule.score}`);
  }

  let level = '低相關';
  if (score >= thresholds.high) level = '高相關';
  else if (score >= thresholds.review) level = '待確認';

  return { score, level, reasons, thresholds };
}

async function saveTenderResult(sb, method, path, payload) {
  try {
    return method === 'patch' ? await sb.patch(path, payload) : await sb.post(path, payload);
  } catch (err) {
    if (!isRelevanceSchemaCacheError(err)) throw err;
    const fallback = { ...payload };
    delete fallback.relevance_score;
    delete fallback.relevance_level;
    delete fallback.relevance_reasons;
    return method === 'patch' ? await sb.patch(path, fallback) : await sb.post(path, fallback);
  }
}

function isRelevanceSchemaCacheError(err) {
  const msg = String(err?.message || err || '');
  return msg.includes('PGRST204') && (
    msg.includes('relevance_score') ||
    msg.includes('relevance_level') ||
    msg.includes('relevance_reasons')
  );
}

function keywordWeight(keyword) {
  if (/磁浮|磁懸浮|磁軸承/.test(keyword)) return 50;
  if (/冰水主機|冰水機/.test(keyword)) return 45;
  if (/中央空調/.test(keyword)) return 40;
  if (/通風/.test(keyword)) return 30;
  if (/空調/.test(keyword)) return 24;
  if (/冷氣/.test(keyword)) return 12;
  return 25;
}

function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) return htmlToText(h1);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? htmlToText(title).split('|')[0] : '';
}

function extractPublishedDate(text) {
  const labeled = String(text || '').match(/(?:張貼日期|公告日期|發佈日期|發布日期|刊登日期|開標日期|截止日期|投標截止)[:：\s]*(?:(\d{4})|民國\s*(\d{2,3})|(\d{2,3}))[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})/);
  if (labeled) {
    const year = normalizeTenderYear(labeled[1] || labeled[2] || labeled[3]);
    return formatTenderDate(year, labeled[4], labeled[5]);
  }
  return extractTenderDates(text)[0] || null;
}

function isStaleActiveSearchResult(text, publishedAt) {
  const dates = publishedAt ? [publishedAt, ...extractTenderDates(text)] : extractTenderDates(text);
  if (!dates.length) return false;
  const latest = dates
    .map(d => new Date(`${d}T00:00:00+08:00`))
    .filter(d => !Number.isNaN(d.getTime()))
    .sort((a, b) => b - a)[0];
  if (!latest) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 180);
  return latest < cutoff;
}

function extractTenderDates(text) {
  const dates = [];
  const body = String(text || '');
  const re = /(?:(20\d{2})|民國\s*(\d{2,3})|(?<!\d)(1\d{2})(?!\d))[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})(?:日)?/g;
  let m;
  while ((m = re.exec(body))) {
    const year = normalizeTenderYear(m[1] || m[2] || m[3]);
    const iso = formatTenderDate(year, m[4], m[5]);
    if (iso) dates.push(iso);
  }
  return [...new Set(dates)];
}

function normalizeTenderYear(rawYear) {
  const year = Number(rawYear);
  if (!year) return 0;
  return year < 1911 ? year + 1911 : year;
}

function formatTenderDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function makeSnippet(text, keyword) {
  const compact = cleanText(text);
  const i = compact.indexOf(keyword);
  if (i < 0) return compact.slice(0, 180);
  return compact.slice(Math.max(0, i - 80), i + 140);
}

function htmlToText(html) {
  return decodeHtml(String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '));
}

function cleanText(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function decodeHtml(s) {
  return String(s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

async function sendNotification({ project, rows, resendApiKey, notificationFrom, notificationTo }) {
  const apiKey = resendApiKey || envVar('RESEND_API_KEY');
  if (!apiKey || !rows?.length) return;
  const from = notificationFrom || envVar('TENDER_NOTIFICATION_FROM') || '美昇行銷平台 <notifications@mcttw.com.tw>';
  const to = notificationTo || project.notify_email || envVar('TENDER_NOTIFICATION_TO');
  if (!to) return;
  const html = rows.map(r => `
    <li>
      <a href="${escapeAttr(r.url)}">${escapeHtml(r.title)}</a><br>
      <small>關鍵字：${escapeHtml(r.matchedKeywords.join('、'))}${r.publishedAt ? `｜發布：${escapeHtml(r.publishedAt)}` : ''}</small>
    </li>`).join('');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: to.split(',').map(x => x.trim()).filter(Boolean),
      subject: `投標工具命中新公告：${project.name}`,
      html: `<p>${escapeHtml(project.name)} 有新的關鍵字命中：</p><ul>${html}</ul>`
    })
  });
  if (!res.ok) throw new Error(`Resend API 失敗: ${res.status} ${await res.text()}`);
}

function envVar(name) {
  return typeof process !== 'undefined' ? process.env?.[name] : undefined;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}
