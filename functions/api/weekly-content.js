import { generateWeeklyContent } from '../../scripts/weekly-content-core.mjs';

const DEFAULT_SUPABASE_URL = 'https://apgrclmrkarxlajmhnpa.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZ3JjbG1ya2FyeGxham1obnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Mjk1NzQsImV4cCI6MjA5OTIwNTU3NH0.qmiZsy4tIkprrhdggCZK_qyr0OuRVFk3sr576CdkLYw';

export async function onRequestPost(context) {
  try {
    const auth = context.request.headers.get('authorization') || '';
    const supabaseUrl = context.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const anonKey = context.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
    const serviceKey = context.env.SUPABASE_SERVICE_ROLE_KEY;
    const anthropicKey = context.env.ANTHROPIC_API_KEY;
    if (!serviceKey || !anthropicKey) return json({ error: '尚未設定 SUPABASE_SERVICE_ROLE_KEY 或 ANTHROPIC_API_KEY' }, 500);

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: auth
      }
    });
    if (!userRes.ok) return json({ error: 'unauthorized' }, 401);

    const body = await context.request.json().catch(() => ({}));
    const result = await generateWeeklyContent({
      supabaseUrl,
      serviceKey,
      rss2jsonKey: context.env.RSS2JSON_API_KEY,
      anthropicKey,
      week: body.week || undefined
    });
    return json(result);
  } catch (err) {
    return json({ error: err.message || 'weekly content generation failed' }, 500);
  }
}

export async function onRequestGet() {
  return json({ error: 'method not allowed' }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
