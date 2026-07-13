const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export function mondayOfTaipei(date = new Date()) {
  const taipei = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const day = (taipei.getUTCDay() + 6) % 7;
  taipei.setUTCDate(taipei.getUTCDate() - day);
  return taipei.toISOString().slice(0, 10);
}

async function sb({ supabaseUrl, serviceKey }, method, path, body) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path} failed: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

export async function fetchNews(keyword, { rss2jsonKey } = {}) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
  const errors = [];
  const loaders = [
    () => fetchViaRss2Json(rssUrl, rss2jsonKey),
    () => fetchViaGoogleRss(rssUrl),
    () => fetchViaJina(rssUrl)
  ];

  for (const load of loaders) {
    try {
      const items = await load();
      if (items.length) return items.slice(0, 5);
    } catch (err) {
      errors.push(err.message || String(err));
    }
  }
  throw new Error(errors.join(' / ') || 'no news returned');
}

async function fetchViaRss2Json(rssUrl, apiKey) {
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}${apiKey ? `&api_key=${apiKey}` : ''}`;
  const res = await fetch(proxyUrl, { headers: newsHeaders() });
  if (!res.ok) throw new Error(`RSS2JSON ${res.status}`);
  const data = await res.json();
  if (data.status !== 'ok') throw new Error(data.message || 'RSS2JSON failed');
  return (data.items || []).map(normalizeRss2JsonItem);
}

async function fetchViaGoogleRss(rssUrl) {
  const res = await fetch(rssUrl, { headers: newsHeaders() });
  if (!res.ok) throw new Error(`Google RSS ${res.status}`);
  const xml = await res.text();
  if (!/<item[\s>]/.test(xml)) throw new Error('Google RSS returned no items');
  return parseGoogleRssItems(xml);
}

async function fetchViaJina(rssUrl) {
  const readerUrl = `https://r.jina.ai/http://r.jina.ai/http://https://news.google.com/rss/search?${rssUrl.split('?')[1] || ''}`;
  const res = await fetch(readerUrl, { headers: newsHeaders() });
  if (!res.ok) throw new Error(`Jina Reader ${res.status}`);
  return parseJinaNewsItems(await res.text());
}

function normalizeRss2JsonItem(it) {
  const parts = (it.title || '').split(' - ');
  const source = parts.length > 1 ? parts.pop() : '';
  return {
    title: parts.join(' - ') || it.title || '',
    link: it.link || '',
    pubDate: it.pubDate || '',
    source
  };
}

function parseGoogleRssItems(xml) {
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return itemMatches.map(item => {
    const rawTitle = textBetween(item, 'title');
    const source = textBetween(item, 'source');
    const title = source && rawTitle.endsWith(` - ${source}`)
      ? rawTitle.slice(0, -(` - ${source}`).length)
      : rawTitle;
    return {
      title,
      link: textBetween(item, 'link'),
      pubDate: textBetween(item, 'pubDate'),
      source
    };
  }).filter(it => it.title && it.link);
}

function parseJinaNewsItems(text) {
  const items = [];
  const re = /### \[([^\]]+)\]\((https:\/\/news\.google\.com\/rss\/articles\/[^)]+)\)[\s\S]*?\n\n([A-Z][a-z]{2}, [^\n]+)/g;
  let match;
  while ((match = re.exec(text)) && items.length < 15) {
    const titleParts = match[1].split(' - ');
    const source = titleParts.length > 1 ? titleParts.pop() : '';
    items.push({
      title: titleParts.join(' - ') || match[1],
      link: match[2],
      pubDate: match[3],
      source
    });
  }
  return items;
}

function textBetween(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return decodeXml(m?.[1] || '');
}

function decodeXml(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function newsHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (compatible; MeishengMarketingOS/1.0)',
    'Accept': 'application/rss+xml, application/xml, application/json, text/plain;q=0.9, */*;q=0.8'
  };
}

const PRODUCT_REFERENCE = `
- MagBoost Apex 磁懸浮變頻離心式冰水機（130~200RT）：低噪音可達70dB以下、精準溫控±0.1°C
- MagBoost 磁懸浮變頻離心式冰水機（250~1800RT）：COP 6.4+、IPLV 10.7、10~100%寬域運轉
- 變頻直驅離心式冰水機（250~1300RT）：無齒輪傳動設計，運轉穩定
- AirBoost MAG 氣冷式磁懸浮離心冰水機：氣冷式設計，適合無水塔場景
- 核心技術：磁懸浮軸承（無機械接觸、無摩擦損耗、100%無油設計、免潤滑油、無污染風險）、智慧群控（Modbus/BACnet，自動加減機策略、冷卻水溫優化）、預防性維護數據監控與故障預警
- 主要應用場景：飯店旅宿、醫療院所、工業製程、機場設施
`.trim();

async function draftCopy(article, keyword, { anthropicKey, model = DEFAULT_MODEL }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: 650,
      messages: [{
        role: 'user',
        content: `你是美昇舒適科技的行銷總監，撰寫用於 Facebook 的貼文草稿（150-220字）。

目標受眾是專業空調技師與業界人士，不是一般消費者。請用產業內行人溝通的語氣：專業、精準、有觀點，展現對技術與市場的掌握度。避免過度口語化的用詞、避免浮誇的驚嘆語氣，內容要經得起同業檢視。

美昇舒適科技的產品線（只能引用以下真實資訊，絕對不可捏造規格、型號、數據或新聞中沒有的事實）：
${PRODUCT_REFERENCE}

請根據以下新聞寫一則貼文：先簡短點出新聞反映的產業情勢或技術議題，接著明確指出「因為這則新聞談到的情境或問題，美昇的哪一款產品／哪個技術特點是適合的解決方案」，並以技術人員能認同的方式具體說明為什麼適合（依新聞情境挑最貼近的產品，不要每篇都套同一款）。如果新聞內容跟冰水主機／節能完全沾不上邊，可以只點出產業意涵，不要硬拗產品置入。

這則貼文要貼在 Facebook，請注意排版：
- 用換行分段（開頭破題一段、產品解決方案一段、結尾一段），手機閱讀要好讀，不要擠成一大塊
- 適度穿插符合專業形象的 icon（例如 ⚙️🔧📊❄️✅📈 這類空調／節能／技術／數據相關圖示），每段開頭或重點處可以放一個，但不要用誇張或幼稚的表情符號（例如🎉💪😍），整體語氣仍要專業
- 文末另起一行加上 3-5 個中文 hashtag，需與新聞內容、追蹤關鍵字、美昇產品相關（例如 #磁懸浮冰水機 #節能改善 #空調技師 之類，依實際內容決定，不要每篇都一樣）

不要使用 markdown 語法（不要用 ** 加粗、不要用 # 標題級距語法，hashtag 本身用 # 開頭是可以的、不要用項目符號列表），只回傳貼文內容本身，不要加任何說明文字或前後綴。

新聞標題：${article.title}
新聞來源：${article.source}
追蹤關鍵字：${keyword}`
      }]
    })
  });
  if (!res.ok) throw new Error(`Anthropic API failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || '';
}

export async function generateWeeklyContent(options) {
  const { supabaseUrl, serviceKey, rss2jsonKey, anthropicKey, week = mondayOfTaipei(), model } = options || {};
  if (!supabaseUrl || !serviceKey || !anthropicKey) {
    throw new Error('missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ANTHROPIC_API_KEY');
  }

  const ctx = { supabaseUrl, serviceKey };
  const keywords = await sb(ctx, 'GET', 'marketing_news_keywords?select=keyword&order=created_at.asc');
  const existing = await sb(ctx, 'GET', 'marketing_content_drafts?select=source_note');
  const existingLinks = new Set((existing || []).map(d => d.source_note).filter(Boolean));
  const logs = [];
  const drafts = [];
  let created = 0;
  let skipped = 0;

  for (const { keyword } of keywords || []) {
    let articles = [];
    try {
      articles = await fetchNews(keyword, { rss2jsonKey });
    } catch (err) {
      logs.push({ keyword, status: 'news_failed', message: err.message });
      skipped++;
      continue;
    }

    const fresh = articles.find(a => a.link && !existingLinks.has(a.link));
    if (!fresh) {
      logs.push({ keyword, status: 'no_new_article' });
      skipped++;
      continue;
    }

    let content = '';
    try {
      content = await draftCopy(fresh, keyword, { anthropicKey, model });
    } catch (err) {
      logs.push({ keyword, status: 'draft_failed', message: err.message });
      skipped++;
      continue;
    }
    if (!content) {
      logs.push({ keyword, status: 'empty_draft' });
      skipped++;
      continue;
    }

    await sb(ctx, 'POST', 'marketing_content_drafts', {
      week_start: week,
      title: fresh.title,
      content,
      source_note: fresh.link,
      status: '草稿'
    });
    existingLinks.add(fresh.link);
    drafts.push({ keyword, title: fresh.title, source: fresh.source });
    logs.push({ keyword, status: 'created', title: fresh.title });
    created++;
  }

  return { week, created, skipped, drafts, logs };
}
