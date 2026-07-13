// Cloudflare Pages Function：/api/news?q=關鍵字
// 使用 weekly-content-core 的多層備援新聞抓取，避免 RSS2JSON 暫時失敗時整頁不可用。
import { fetchNews } from '../../scripts/weekly-content-core.mjs';

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) return json({ error: 'missing q' }, 400);
    const items = await fetchNews(q, { rss2jsonKey: context.env.RSS2JSON_API_KEY });
    return json({ keyword: q, items: items.slice(0, 15) });
  } catch (err) {
    return json({ error: err.message || 'news fetch failed' }, 502);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
