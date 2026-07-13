import { scanProject } from '../../scripts/tender-monitor-core.mjs';

const DEFAULT_SUPABASE_URL = 'https://apgrclmrkarxlajmhnpa.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZ3JjbG1ya2FyeGxham1obnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Mjk1NzQsImV4cCI6MjA5OTIwNTU3NH0.qmiZsy4tIkprrhdggCZK_qyr0OuRVFk3sr576CdkLYw';

export async function onRequestPost(context) {
  try {
    const auth = context.request.headers.get('authorization') || '';
    const projectId = (await context.request.json().catch(() => ({}))).projectId;
    if (!projectId) return json({ error: 'missing projectId' }, 400);
    const supabaseUrl = context.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const anonKey = context.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
    const serviceKey = context.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return json({ error: 'missing SUPABASE_SERVICE_ROLE_KEY' }, 500);

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: auth
      }
    });
    if (!userRes.ok) return json({ error: 'unauthorized' }, 401);

    const result = await scanProject({
      supabaseUrl,
      serviceKey,
      projectId,
      resendApiKey: context.env.RESEND_API_KEY,
      notificationFrom: context.env.TENDER_NOTIFICATION_FROM,
      notificationTo: context.env.TENDER_NOTIFICATION_TO
    });
    return json(result);
  } catch (err) {
    return json({ error: err.message || 'scan failed' }, 500);
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
