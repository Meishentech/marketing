// Cloudflare Pages Function：/api/news?q=關鍵字
// 先經由 rss2json.com 中轉；若第三方服務暫時 500/額度異常，改用 Google RSS XML 直接解析，
// 再保留 Jina Reader 文字版作最後備援，避免單一服務失敗讓新聞蒐集整頁不可用。
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) return json({ error: 'missing q' }, 400);

    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
    const errors = [];
    const loaders = [
      () => fetchViaRss2Json(rssUrl, context.env.RSS2JSON_API_KEY),
      () => fetchViaGoogleRss(rssUrl),
      () => fetchViaJina(rssUrl)
    ];

    for (const load of loaders) {
      try {
        const items = await load();
        if (items.length) return json({ keyword: q, items: items.slice(0, 15) });
      } catch (err) {
        errors.push(err.message || String(err));
      }
    }
    return json({ error: `新聞抓取失敗：${errors.join(' / ') || '沒有回傳資料'}` }, 502);
  } catch (err) {
    return json({ error: err.message || 'news fetch failed' }, 500);
  }
}

async function fetchViaRss2Json(rssUrl, apiKey) {
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}${apiKey ? `&api_key=${apiKey}` : ''}`;
  const res = await fetch(proxyUrl, { headers: newsHeaders() });
  if (!res.ok) throw new Error(`RSS2JSON ${res.status}`);
  const data = await res.json();
  if (data.status !== 'ok') throw new Error(data.message || 'RSS2JSON 回傳失敗');
  return (data.items || []).map(normalizeRss2JsonItem);
}

async function fetchViaGoogleRss(rssUrl) {
  const res = await fetch(rssUrl, { headers: newsHeaders() });
  if (!res.ok) throw new Error(`Google RSS ${res.status}`);
  const xml = await res.text();
  if (!/<item[\s>]/.test(xml)) throw new Error('Google RSS 沒有新聞項目');
  return parseGoogleRssItems(xml);
}

async function fetchViaJina(rssUrl) {
  const readerUrl = `https://r.jina.ai/http://r.jina.ai/http://https://news.google.com/rss/search?${rssUrl.split('?')[1] || ''}`;
  const res = await fetch(readerUrl, { headers: newsHeaders() });
  if (!res.ok) throw new Error(`Jina Reader ${res.status}`);
  const text = await res.text();
  return parseJinaNewsItems(text);
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

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
