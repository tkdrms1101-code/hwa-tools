/* 생산관리 핸드폰(웹) 버전: 업무도구 앱과 같은 Firebase 계정으로 로그인하고, 생산관리 화면에 claude.use('db') 를 넘겨줍니다.
 * 계정·승인 규칙은 앱과 같습니다 (가입하면 승인 대기 → 관리자가 앱의 공유 창에서 승인). */
(function () {
  'use strict';
  var CFG = {
    apiKey: 'AIzaSyDgDuAaBjaThPvvhjP3JuD6JyAaUNO4wmY',
    authDomain: 'hwa-tools.firebaseapp.com',
    projectId: 'hwa-tools',
    storageBucket: 'hwa-tools.firebasestorage.app',
    messagingSenderId: '856419234689',
    appId: '1:856419234689:web:2d0e553d0a09937a14ae80',
  };
  // 개발용 점검: http://localhost…?emu=1 일 때만 이 PC의 Firebase 시험 서버에 붙음
  var emu = location.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]emu=1\b/.test(location.search);
  if (emu) { CFG.projectId = 'demo-hwa'; CFG.authDomain = 'demo-hwa.firebaseapp.com'; }
  firebase.initializeApp(CFG);
  var auth = firebase.auth(), db = firebase.firestore();
  if (emu) { auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); db.useEmulator('127.0.0.1', 8080); }
  db.settings({ ignoreUndefinedProperties: true, merge: true });
  db.enablePersistence({ synchronizeTabs: true }).catch(function () {});

  window.__HWA_WEB__ = true;
  window.__HWA_APP__ = true; // 등급 자료는 필요한 화면에서만 읽기 (무료 한도 아끼기)

  var ready, readyP = new Promise(function (r) { ready = r; }), cur = null;
  window.claude = {
    use: async function (name) {
      var x = await readyP;
      if (name === 'db') return db;
      if (name === 'user') return {
        id: async function () { return x.uid; },
        profiles: async function (ids) {
          var o = {};
          await Promise.all(ids.map(async function (id) { try { var d = await db.doc('members/' + id).get(); if (d.exists) o[id] = { name: d.data().name }; } catch (e) {} }));
          return o;
        },
      };
      return null;
    },
  };

  /* ---------- 로그인 화면 ---------- */
  var css = '#hwLogin{position:fixed;inset:0;z-index:50;background:var(--bg,#f7f4ee);display:flex;align-items:flex-start;justify-content:center;padding:max(48px,env(safe-area-inset-top)) 16px 24px;overflow:auto}' +
    '#hwLogin[hidden]{display:none}#hwLogin .box{width:100%;max-width:380px;background:var(--card,#fff);border:1px solid var(--line,#e3ddd2);border-radius:14px;padding:20px;display:grid;gap:12px}' +
    '#hwLogin h2{margin:0;font-size:20px}#hwLogin p{margin:0;color:var(--mut,#6b645a);font-size:14px;line-height:1.5}#hwLogin form{display:grid;gap:10px}' +
    '#hwLogin .err{color:var(--alert,#a33a17)}#hwLogin a{color:var(--hw,#7f1925);font-weight:700}' +
    '.hwOut{margin-inline-start:8px;font:inherit;font-size:12px;border:1px solid rgba(255,255,255,.5);background:transparent;color:#fff;border-radius:8px;padding:4px 10px;cursor:pointer}';
  var mode = 'in', msg = '';
  function el() { var e = document.getElementById('hwLogin'); if (!e) { var s = document.createElement('style'); s.textContent = css; document.head.append(s); e = document.createElement('div'); e.id = 'hwLogin'; document.body.append(e); } return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var ERR = { 'auth/invalid-email': '이메일 형식이 맞지 않습니다.', 'auth/missing-password': '비밀번호를 넣어주세요.', 'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.', 'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인해 주세요.', 'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않습니다.', 'auth/invalid-login-credentials': '이메일 또는 비밀번호가 맞지 않습니다.', 'auth/wrong-password': '이메일 또는 비밀번호가 맞지 않습니다.', 'auth/user-not-found': '가입되지 않은 이메일입니다.', 'auth/too-many-requests': '시도가 너무 많습니다. 잠시 후 다시 해 주세요.', 'auth/network-request-failed': '인터넷 연결을 확인해 주세요.' };
  function show(state) {
    var e = el(); e.hidden = false;
    if (state === 'pending') {
      e.innerHTML = '<div class="box"><h2>승인 기다리는 중</h2><p><b>' + esc(cur && cur.email) + '</b> 계정으로 가입되었습니다. 관리자가 업무도구 앱의 <b>공유</b> 창에서 승인하면 바로 쓸 수 있습니다.</p>' +
        (msg ? '<p class="err">' + esc(msg) + '</p>' : '') + '<button class="btn pri" id="hwRe" type="button">다시 확인</button><button class="btn" id="hwOut" type="button">로그아웃</button></div>';
      document.getElementById('hwRe').onclick = function () { location.reload(); };
      document.getElementById('hwOut').onclick = function () { auth.signOut(); };
      return;
    }
    if (state === 'loading') { e.innerHTML = '<div class="box"><p>연결 중…</p></div>'; return; }
    e.innerHTML = '<div class="box"><h2>화려한우 생산관리</h2><p>업무도구 앱과 같은 계정으로 로그인하세요.</p><form id="hwF">' +
      (mode === 'up' ? '<input id="hwN" placeholder="이름 (메모·기록에 표시)" required autocomplete="name">' : '') +
      '<input id="hwE" type="email" placeholder="이메일" required autocomplete="username">' +
      '<input id="hwP" type="password" placeholder="비밀번호 (6자 이상)" required autocomplete="' + (mode === 'up' ? 'new-password' : 'current-password') + '">' +
      '<button class="btn pri" type="submit">' + (mode === 'up' ? '가입하기' : '로그인') + '</button></form>' +
      (msg ? '<p class="err">' + esc(msg) + '</p>' : '') +
      '<p>' + (mode === 'up' ? '이미 계정이 있나요? <a href="#" id="hwM">로그인</a>' : '처음이면 <a href="#" id="hwM">가입하기</a> · 가입 후 관리자가 승인하면 쓸 수 있습니다.') + '</p>' +
      (mode === 'up' ? '' : '<p><a href="#" id="hwR">비밀번호를 잊었어요</a> · 이메일을 적고 누르면 재설정 메일이 갑니다.</p>') + '</div>';
    var rl = document.getElementById('hwR');
    if (rl) rl.onclick = async function (ev) {
      ev.preventDefault();
      var em = document.getElementById('hwE').value.trim();
      if (!em) { msg = '먼저 이메일 칸에 가입한 이메일을 적어 주세요.'; show('out'); return; }
      try { await auth.sendPasswordResetEmail(em); msg = em + ' 로 재설정 메일을 보냈습니다. 메일의 링크에서 새 비밀번호를 정한 뒤 로그인하세요. (스팸함도 확인)'; }
      catch (err) { msg = ERR[err && err.code] || ('오류: ' + ((err && (err.code || err.message)) || err)); }
      show('out'); document.getElementById('hwE').value = em;
    };
    document.getElementById('hwM').onclick = function (ev) { ev.preventDefault(); mode = mode === 'up' ? 'in' : 'up'; msg = ''; show('out'); };
    document.getElementById('hwF').onsubmit = async function (ev) {
      ev.preventDefault(); msg = '';
      var em = document.getElementById('hwE').value.trim(), pw = document.getElementById('hwP').value;
      try {
        if (mode === 'up') {
          try { localStorage.setItem('hwa_signup_name', document.getElementById('hwN').value.trim()); } catch (e2) {}
          var cr = await auth.createUserWithEmailAndPassword(em, pw);
          try { await cr.user.sendEmailVerification(); } catch (e3) {}
        } else await auth.signInWithEmailAndPassword(em, pw);
      } catch (err) { msg = ERR[err && err.code] || ('오류: ' + ((err && (err.code || err.message)) || err)); show('out'); }
    };
  }
  function hide() { var e = document.getElementById('hwLogin'); if (e) e.hidden = true; }
  function addLogout() {
    var b = document.querySelector('.brand');
    if (!b || document.querySelector('.hwOut')) return;
    var x = document.createElement('button'); x.className = 'hwOut'; x.type = 'button'; x.textContent = '로그아웃';
    x.onclick = function () { auth.signOut().then(function () { location.reload(); }); };
    b.append(x);
  }

  auth.onAuthStateChanged(async function (u) {
    cur = u;
    if (!u) { if (document.body) show('out'); else document.addEventListener('DOMContentLoaded', function () { show('out'); }); return; }
    show('loading');
    var ref = db.doc('members/' + u.uid), m = null;
    try {
      var s = await ref.get();
      if (!s.exists) {
        var name = ''; try { name = localStorage.getItem('hwa_signup_name') || ''; } catch (e) {}
        await ref.set({ email: u.email, name: name || (u.email || '').split('@')[0], approved: false, role: 'member', at: Date.now() });
        s = await ref.get();
      }
      m = s.exists ? s.data() : null;
    } catch (e) { msg = '계정 정보를 읽지 못했습니다: ' + (e.code || e.message); show('pending'); return; }
    if (!m || !m.approved) { show('pending'); return; }
    hide(); addLogout();
    ready({ uid: u.uid, member: m });
  });
})();
