// 每週文案自動草稿：抓新聞 → Claude 生成草稿 → 寫入 marketing_content_drafts（狀態固定為「草稿」）
// 由 .github/workflows/weekly-content.yml 排程執行，也可手動觸發測試

const SB = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RSS2JSON_KEY = process.env.RSS2JSON_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!SB || !SERVICE_KEY || !RSS2JSON_KEY || !ANTHROPIC_KEY) {
  console.error('缺少必要的環境變數（SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / RSS2JSON_API_KEY / ANTHROPIC_API_KEY）');
  process.exit(1);
}

async function sb(method, path, body) {
  const res = await fetch(`${SB}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path} 失敗: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

function mondayOf(d = new Date()) {
  const day = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - day);
  return monday.toISOString().slice(0, 10);
}

async function fetchNews(keyword) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&api_key=${RSS2JSON_KEY}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) return [];
  const data = await res.json();
  if (data.status !== 'ok') return [];
  return (data.items || []).slice(0, 5).map(it => {
    const parts = (it.title || '').split(' - ');
    const source = parts.length > 1 ? parts.pop() : '';
    return { title: parts.join(' - ') || it.title || '', link: it.link || '', source };
  });
}

async function draftCopy(article, keyword) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `你是美昇舒適科技（磁懸浮冰水主機廠商）的行銷小編。根據以下新聞，寫一則 Facebook 貼文草稿（120-200字，口語、不浮誇、不捏造事實，可以自然帶到節能／磁浮冰水主機相關話題但不要硬置入）。只回傳貼文內容本身，不要加任何說明文字或標題符號。\n\n新聞標題：${article.title}\n新聞來源：${article.source}\n追蹤關鍵字：${keyword}`
      }]
    })
  });
  if (!res.ok) throw new Error(`Anthropic API 失敗: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || '';
}

async function main() {
  const keywords = await sb('GET', 'marketing_news_keywords?select=keyword');
  const week = mondayOf();
  const existing = await sb('GET', 'marketing_content_drafts?select=source_note');
  const existingLinks = new Set((existing || []).map(d => d.source_note).filter(Boolean));

  let created = 0;
  for (const { keyword } of keywords || []) {
    let articles;
    try { articles = await fetchNews(keyword); }
    catch (e) { console.error(`抓新聞失敗（${keyword}）：${e.message}`); continue; }

    const fresh = articles.find(a => a.link && !existingLinks.has(a.link));
    if (!fresh) { console.log(`「${keyword}」沒有新的文章可用`); continue; }

    let content;
    try { content = await draftCopy(fresh, keyword); }
    catch (e) { console.error(`生成文案失敗（${keyword}）：${e.message}`); continue; }
    if (!content) continue;

    await sb('POST', 'marketing_content_drafts', {
      week_start: week,
      title: fresh.title,
      content,
      source_note: fresh.link,
      status: '草稿'
    });
    existingLinks.add(fresh.link);
    created++;
    console.log(`已建立草稿：${fresh.title}`);
  }
  console.log(`本次共建立 ${created} 則草稿（週別 ${week}）`);
}

main().catch(e => { console.error(e); process.exit(1); });
