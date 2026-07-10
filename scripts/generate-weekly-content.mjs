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

// 產品資訊取自 www.mcttw.com.tw，若產品線異動請同步更新這裡，避免 AI 用到過時或捏造的規格
const PRODUCT_REFERENCE = `
- MagBoost Apex 磁懸浮變頻離心式冰水機（130~200RT）：低噪音可達70dB以下、精準溫控±0.1°C
- MagBoost 磁懸浮變頻離心式冰水機（250~1800RT）：COP 6.4+、IPLV 10.7、10~100%寬域運轉
- 變頻直驅離心式冰水機（250~1300RT）：無齒輪傳動設計，運轉穩定
- AirBoost MAG 氣冷式磁懸浮離心冰水機：氣冷式設計，適合無水塔場景
- 核心技術：磁懸浮軸承（無機械接觸、無摩擦損耗、100%無油設計、免潤滑油、無污染風險）、智慧群控（Modbus/BACnet，自動加減機策略、冷卻水溫優化）、預防性維護數據監控與故障預警
- 主要應用場景：飯店旅宿、醫療院所、工業製程、機場設施
`.trim();

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
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `你是美昇舒適科技的行銷總監，撰寫用於 Facebook 的貼文草稿（150-220字）。

目標受眾是專業空調技師與業界人士，不是一般消費者。請用產業內行人溝通的語氣：專業、精準、有觀點，展現對技術與市場的掌握度。避免過度口語化的用詞、避免浮誇的驚嘆語氣、避免不必要的表情符號，內容要經得起同業檢視。

美昇舒適科技的產品線（只能引用以下真實資訊，絕對不可捏造規格、型號、數據或新聞中沒有的事實）：
${PRODUCT_REFERENCE}

請根據以下新聞寫一則貼文：先簡短點出新聞反映的產業情勢或技術議題，接著明確指出「因為這則新聞談到的情境或問題，美昇的哪一款產品／哪個技術特點是適合的解決方案」，並以技術人員能認同的方式具體說明為什麼適合（依新聞情境挑最貼近的產品，不要每篇都套同一款）。如果新聞內容跟冰水主機／節能完全沾不上邊，可以只點出產業意涵，不要硬拗產品置入。這是純文字的 Facebook 貼文，不要使用任何 markdown 語法（不要用 ** 加粗、不要用 # 標題、不要用項目符號列表），只回傳貼文內容本身，不要加任何說明文字、標題符號或前後綴。

新聞標題：${article.title}
新聞來源：${article.source}
追蹤關鍵字：${keyword}`
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
