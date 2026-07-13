const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; MeisunTenderMonitor/1.0)',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

export function createSupabaseClient({ supabaseUrl, serviceKey }) {
  if (!supabaseUrl || !serviceKey) throw new Error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  async function request(method, path, body, extraHeaders = {}) {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
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
    const words = (keywords || []).map(k => k.keyword).filter(Boolean);
    if (!words.length) throw new Error('此專案沒有啟用中的關鍵字');

    const pages = projectPageUrls(project.source_url, project.page_limit || 1);
    const candidates = new Map();
    for (const pageUrl of pages) {
      const html = await fetchHtml(pageUrl);
      for (const item of extractTenderLinks(html, pageUrl)) {
        if (!candidates.has(item.url)) candidates.set(item.url, item);
      }
    }

    let foundCount = 0;
    let newCount = 0;
    const matchedRows = [];
    for (const item of candidates.values()) {
      let detailHtml = '';
      try { detailHtml = await fetchHtml(item.url); }
      catch { detailHtml = ''; }

      const detailText = htmlToText(detailHtml);
      const title = cleanText(extractTitle(detailHtml) || item.title);
      const haystack = `${title}\n${detailText}`;
      const matchedKeywords = words.filter(w => haystack.includes(w));
      if (!matchedKeywords.length) continue;

      foundCount++;
      const publishedAt = extractPublishedDate(detailText);
      const snippet = makeSnippet(haystack, matchedKeywords[0]);
      const existing = await sb.get(`tender_results?project_id=eq.${project.id}&url=eq.${encodeURIComponent(item.url)}&select=id`);
      if (existing?.[0]?.id) {
        await sb.patch(`tender_results?id=eq.${existing[0].id}`, {
          title,
          published_at: publishedAt,
          matched_keywords: matchedKeywords,
          snippet,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else {
        await sb.post('tender_results', {
          project_id: project.id,
          title,
          url: item.url,
          published_at: publishedAt,
          matched_keywords: matchedKeywords,
          snippet
        });
        newCount++;
      }
      matchedRows.push({ title, url: item.url, publishedAt, matchedKeywords, snippet });
    }

    await sb.patch(`tender_scan_runs?id=eq.${run.id}`, {
      status: 'success',
      checked_pages: pages.length,
      found_count: foundCount,
      new_count: newCount,
      finished_at: new Date().toISOString()
    });
    await sb.patch(`tender_projects?id=eq.${project.id}`, {
      last_scanned_at: startedAt,
      last_scan_status: `成功：命中 ${foundCount} 筆，新發現 ${newCount} 筆`,
      updated_at: new Date().toISOString()
    });

    if (newCount > 0 && options.notify !== false) {
      await sendNotification({ project, rows: matchedRows.slice(0, newCount), ...options }).catch(err => {
        console.warn(`通知寄送失敗：${err.message}`);
      });
    }

    return { projectId: project.id, checkedPages: pages.length, foundCount, newCount, matches: matchedRows };
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

export function extractTenderLinks(html, baseUrl) {
  const links = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = decodeHtml(m[1]);
    if (!/page_name=detail/i.test(href) || !/aid=803/i.test(href)) continue;
    const titleAttr = m[0].match(/\btitle=["']([^"']+)["']/i)?.[1];
    const title = cleanText(decodeHtml(titleAttr || htmlToText(m[2])));
    const url = new URL(href, baseUrl).toString();
    if (title) links.push({ title, url });
  }
  return links;
}

function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) return htmlToText(h1);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? htmlToText(title).split('|')[0] : '';
}

function extractPublishedDate(text) {
  const m = text.match(/(?:張貼日期|公告日期|發佈日期|發布日期|刊登日期)[:：\s]*(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
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
