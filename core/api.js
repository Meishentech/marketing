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

// ── Storage ──
function storageSafeFileName(name){
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot) : '';
  const base = (dot >= 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${Date.now()}_${base}${ext}`;
}

async function uploadStorageFile(bucket, file){
  const tok = sessionStorage.getItem('ms_token');
  const path = storageSafeFileName(file.name);
  const r = await fetch(`${SB}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${tok || KEY}`, 'Content-Type': file.type || 'application/octet-stream' },
    body: file
  });
  if(!r.ok) throw new Error(await r.text());
  return path;
}

async function getSignedUrl(bucket, path, expiresIn = 3600){
  const tok = sessionStorage.getItem('ms_token');
  const r = await fetch(`${SB}/storage/v1/object/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${tok || KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn })
  });
  if(!r.ok) return '';
  const data = await r.json();
  return `${SB}/storage/v1${data.signedURL}`;
}

async function deleteStorageFile(bucket, path){
  const tok = sessionStorage.getItem('ms_token');
  await fetch(`${SB}/storage/v1/object/${bucket}/${path}`, {
    method: 'DELETE',
    headers: { apikey: KEY, Authorization: `Bearer ${tok || KEY}` }
  });
}
