// Cloudflare Pages Function：/api/news?q=關鍵字
// Google News RSS 直接從 Cloudflare Pages Function 抓會被 Google 判定為機器人流量擋下（共用 IP 被封鎖）
// 改經由 rss2json.com 中轉；免費方案有嚴格的匿名額度限制，需要在 Cloudflare Pages
// 環境變數設定 RSS2JSON_API_KEY（免費申請，不會產生費用），金鑰不寫死在程式碼中
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return json({ error: 'missing q' }, 400);

  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
  const apiKey = context.env.RSS2JSON_API_KEY;
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}${apiKey ? `&api_key=${apiKey}` : ''}`;
  const res = await fetch(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return json({ error: `rss2json fetch failed: ${res.status}` }, 502);
  const data = await res.json();
  if (data.status !== 'ok') return json({ error: data.message || 'rss2json 回傳失敗' }, 502);

  const items = (data.items || []).slice(0, 15).map(it => {
    const parts = (it.title || '').split(' - ');
    const source = parts.length > 1 ? parts.pop() : '';
    return {
      title: parts.join(' - ') || it.title || '',
      link: it.link || '',
      pubDate: it.pubDate || '',
      source
    };
  });
  return json({ keyword: q, items });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
