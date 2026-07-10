// ── AUTH STATE ──
async function doLogin(){
  const email = document.getElementById('li-email').value.trim();
  const pw    = document.getElementById('li-pw').value;
  const btn   = document.getElementById('li-btn');
  const err   = document.getElementById('li-err');
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
      sessionStorage.setItem('ms_token',   data.access_token);
      sessionStorage.setItem('ms_refresh', data.refresh_token);
      sessionStorage.setItem('ms_expires', Date.now() + data.expires_in * 1000);
      sessionStorage.setItem('ms_email',   email);
      await showApp();
      nav('campaigns');
    } else {
      err.textContent = data.error_description || data.msg || '帳號或密碼錯誤';
    }
  } catch(e){ err.textContent = '連線失敗，請稍後再試'; }
  btn.disabled = false; btn.textContent = '登入';
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
      sessionStorage.setItem('ms_token',   data.access_token);
      sessionStorage.setItem('ms_refresh', data.refresh_token);
      sessionStorage.setItem('ms_expires', Date.now() + data.expires_in * 1000);
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
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('sidebar').style.display = 'flex';
  document.getElementById('main').style.display = 'block';
  document.getElementById('sb-user').textContent = sessionStorage.getItem('ms_email') || '';
}

async function doLogout(){
  if(!confirm('確定登出？')) return;
  try{
    await fetch(`${SB}/auth/v1/logout`,{
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${sessionStorage.getItem('ms_token') || ''}` }
    });
  } catch(e){}
  ['ms_token','ms_refresh','ms_expires','ms_email'].forEach(k => sessionStorage.removeItem(k));
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('main').style.display    = 'none';
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('li-pw').value = '';
}
