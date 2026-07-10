// ── API ──
function getH(){
  const tok = sessionStorage.getItem('ms_token');
  return {
    apikey: KEY,
    Authorization: `Bearer ${tok || KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
}

async function api(method, path, body){
  const r = await fetch(`${SB}/rest/v1/${path}`, {
    method,
    headers: getH(),
    body: body ? JSON.stringify(body) : undefined
  });
  if(!r.ok){ const e = await r.text(); throw new Error(e); }
  if(r.status === 204) return null;
  return r.json();
}

const GET  = p     => api('GET',    p);
const POST = (p,d) => api('POST',   p, d);
const PATCH= (p,d) => api('PATCH',  p, d);
const DEL  = p     => api('DELETE', p);
