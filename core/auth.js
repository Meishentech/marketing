// ── AUTH STATE ──
const DEFAULT_INITIAL_PASSWORD = '123456';

function authHeaders(token){
  return {
    apikey: KEY,
    Authorization: `Bearer ${token || sessionStorage.getItem('ms_token') || KEY}`,
    'Content-Type': 'application/json'
  };
}

function storeSession(data, email){
  sessionStorage.setItem('ms_token', data.access_token);
  if (data.refresh_token) sessionStorage.setItem('ms_refresh', data.refresh_token);
  if (data.expires_in) sessionStorage.setItem('ms_expires', Date.now() + data.expires_in * 1000);
  if (email) sessionStorage.setItem('ms_email', email);
}

async function getCurrentUser(){
  const res = await fetch(`${SB}/auth/v1/user`, { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json();
}

async function loadUserAccess(email){
  try {
    const res = await fetch(`${SB}/rest/v1/app_user_access?email=eq.${encodeURIComponent(email)}&select=email,is_active,must_change_password`, {
      headers: authHeaders()
    });
    if (res.status === 404) return { tableMissing: true, allowed: true, mustChange: false };
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    if (!rows.length) return { allowed: false, mustChange: false };
    return { allowed: rows[0].is_active !== false, mustChange: rows[0].must_change_password === true };
  } catch (e) {
    console.warn('app_user_access check skipped', e);
    return { tableMissing: true, allowed: true, mustChange: false };
  }
}

async function completeLogin(email, landing = 'campaigns'){
  const access = await loadUserAccess(email);
  if (!access.allowed) {
    await clearSession(false);
    document.getElementById('li-err').textContent = '此帳號尚未開通平台權限，請聯絡管理者。';
    return;
  }
  if (access.mustChange) {
    showPasswordScreen('首次登入請變更密碼', 'First Login Required', '請先把預設密碼改成自己的密碼，完成後才能進入平台。');
    return;
  }
  await showApp();
  await nav(landing);
}

async function doLogin(){
  const email = document.getElementById('li-email').value.trim();
  const pw    = document.getElementById('li-pw').value;
  const btn   = document.getElementById('li-btn');
  const err   = document.getElementById('li-err');
  document.getElementById('li-note').textContent = '';
  if(!email || !pw){ err.textContent = '請輸入帳號與密碼'; return; }
  btn.disabled = true; btn.textContent = '登入中…'; err.textContent = '';
  try{
    const res = await fetch(`${SB}/auth/v1/token?grant_type=password`,{
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw })
    });
    const data = await res.json();
    if(data.access_token){
      storeSession(data, email);
      await completeLogin(email, 'campaigns');
    } else {
      err.textContent = data.error_description || data.msg || '帳號或密碼錯誤';
    }
  } catch(e){ err.textContent = '連線失敗，請稍後再試'; }
  btn.disabled = false; btn.textContent = '登入';
}

async function sendPasswordReset(){
  const email = document.getElementById('li-email').value.trim();
  const err = document.getElementById('li-err');
  const note = document.getElementById('li-note');
  err.textContent = ''; note.textContent = '';
  if (!email) { err.textContent = '請先輸入帳號 email'; return; }
  try {
    const redirectTo = `${location.origin}${location.pathname}`;
    const res = await fetch(`${SB}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error(await res.text());
    note.textContent = '已寄出密碼重設信，請到信箱點擊連結後設定新密碼。';
  } catch (e) {
    err.textContent = '重設信寄送失敗，請確認 email 或稍後再試。';
  }
}

async function handleAuthRedirect(){
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(location.search);
  const type = hash.get('type') || query.get('type');
  const accessToken = hash.get('access_token');
  if (type !== 'recovery' || !accessToken) return false;
  storeSession({
    access_token: accessToken,
    refresh_token: hash.get('refresh_token') || '',
    expires_in: Number(hash.get('expires_in') || 3600)
  });
  history.replaceState(null, '', location.pathname);
  const user = await getCurrentUser();
  if (user?.email) sessionStorage.setItem('ms_email', user.email);
  showPasswordScreen('設定新密碼', 'Password Recovery', '請輸入新的密碼，完成後即可回到平台登入。', true);
  return true;
}

function showPasswordScreen(title, sub, note, recovery = false){
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('main').style.display = 'none';
  document.getElementById('password-screen').classList.add('open');
  document.getElementById('pw-title').textContent = title;
  document.getElementById('pw-sub').textContent = sub;
  document.getElementById('pw-note').textContent = note;
  document.getElementById('pw-err').textContent = '';
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-confirm').value = '';
  document.getElementById('pw-btn').dataset.recovery = recovery ? '1' : '';
}

async function changeOwnPassword(){
  const pw = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;
  const err = document.getElementById('pw-err');
  const btn = document.getElementById('pw-btn');
  err.textContent = '';
  if (pw.length < 8) { err.textContent = '新密碼至少需要 8 碼'; return; }
  if (pw === DEFAULT_INITIAL_PASSWORD) { err.textContent = '新密碼不可與預設密碼相同'; return; }
  if (pw !== confirm) { err.textContent = '兩次輸入的新密碼不一致'; return; }
  btn.disabled = true; btn.textContent = '儲存中…';
  try {
    const res = await fetch(`${SB}/auth/v1/user`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ password: pw })
    });
    if (!res.ok) throw new Error(await res.text());
    const email = sessionStorage.getItem('ms_email') || (await getCurrentUser())?.email || '';
    if (email) {
      try {
        await fetch(`${SB}/rest/v1/app_user_access?email=eq.${encodeURIComponent(email)}`, {
          method: 'PATCH',
          headers: { ...authHeaders(), Prefer: 'return=minimal' },
          body: JSON.stringify({ must_change_password: false, updated_at: new Date().toISOString() })
        });
      } catch (e) {}
    }
    document.getElementById('password-screen').classList.remove('open');
    await showApp();
    await nav('dashboard');
  } catch (e) {
    err.textContent = '密碼更新失敗，請稍後再試。';
  }
  btn.disabled = false; btn.textContent = '儲存新密碼';
}

async function refreshSession(){
  try{
    const ref = sessionStorage.getItem('ms_refresh');
    if(!ref) return false;
    const res = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`,{
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: ref })
    });
    const data = await res.json();
    if(data.access_token){
      storeSession(data);
      return true;
    }
    return false;
  } catch(e){ return false; }
}

async function checkAuth(){
  try{
    const exp = parseInt(sessionStorage.getItem('ms_expires') || 0);
    const tok = sessionStorage.getItem('ms_token');
    if(!tok) return false;
    if(Date.now() > exp - 60000) return await refreshSession();
    return true;
  } catch(e){ return false; }
}

async function showApp(){
  document.getElementById('password-screen').classList.remove('open');
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('sidebar').style.display = 'flex';
  document.getElementById('main').style.display = 'block';
  document.getElementById('sb-user').textContent = sessionStorage.getItem('ms_email') || '';
}

async function clearSession(callLogout = true){
  if (callLogout) {
    try{
      await fetch(`${SB}/auth/v1/logout`,{
        method: 'POST',
        headers: { apikey: KEY, Authorization: `Bearer ${sessionStorage.getItem('ms_token') || ''}` }
      });
    } catch(e){}
  }
  ['ms_token','ms_refresh','ms_expires','ms_email'].forEach(k => sessionStorage.removeItem(k));
}

async function doLogout(ask = true){
  if(ask && !confirm('確定登出？')) return;
  await clearSession(true);
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('main').style.display    = 'none';
  document.getElementById('password-screen').classList.remove('open');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('li-pw').value = '';
}
