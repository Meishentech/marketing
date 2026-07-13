import { scanProject } from '../../scripts/tender-monitor-core.mjs';

export async function onRequestPost(context) {
  try {
    const auth = context.request.headers.get('authorization') || '';
    const projectId = (await context.request.json().catch(() => ({}))).projectId;
    if (!projectId) return json({ error: 'missing projectId' }, 400);

    const userRes = await fetch(`${context.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: context.env.SUPABASE_ANON_KEY,
        Authorization: auth
      }
    });
    if (!userRes.ok) return json({ error: 'unauthorized' }, 401);

    const result = await scanProject({
      supabaseUrl: context.env.SUPABASE_URL,
      serviceKey: context.env.SUPABASE_SERVICE_ROLE_KEY,
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
