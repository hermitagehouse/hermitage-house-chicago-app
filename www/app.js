// Shared helpers. No address, door code or Wi-Fi is ever stored here; the stay link stays on this phone.
// Storage that still works if the browser blocks localStorage (some preview windows do): falls back to window.name, which survives moving between screens
var LS = (function () {
  try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return localStorage; } catch (e) {}
  function rd() { try { return JSON.parse(window.name || '{}') || {}; } catch (e) { return {}; } }
  function wr(o) { window.name = JSON.stringify(o); }
  return { getItem: function (k) { var o = rd(); return k in o ? o[k] : null; }, setItem: function (k, v) { var o = rd(); o[k] = String(v); wr(o); }, removeItem: function (k) { var o = rd(); delete o[k]; wr(o); } };
})();
var SITE = 'https://hermitagehousechicago.com';
var P = (window.Capacitor && window.Capacitor.Plugins) || {};
function el(tag, text, cls) { var e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
function kv(k) { return P.Preferences ? P.Preferences.get({ key: k }).then(function (r) { return r.value; }) : Promise.resolve(LS.getItem(k)); }
function kvSet(k, v) { return P.Preferences ? P.Preferences.set({ key: k, value: v }) : Promise.resolve(LS.setItem(k, v)); }
function kvDel(k) { return P.Preferences ? P.Preferences.remove({ key: k }) : Promise.resolve(LS.removeItem(k)); }
function openSite(path) { var u = SITE + path; if (P.Browser) P.Browser.open({ url: u }); else window.open(u, '_blank'); }
function api(path, body) {
  var o = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
  return fetch(SITE + path, o).then(function (r) { return r.json().catch(function () { return { ok: false, message: 'Something went wrong. Try again.' }; }); })
    .catch(function () { return { ok: false, message: 'No connection right now. Try again when you are online.' }; });
}
var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function us(d) { var p = d.split('-'); return MO[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0]; }
function stamp() { return new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }); }


// SAMPLE-STAY MODE (test version): sample data on this phone only; nothing real is read or sent for the stay screens
var DEMO = LS.getItem('demo') === '1';
var _api = api;
api = function (path, body) {
  if (DEMO && path.indexOf('/api/stay') === 0) {
    if (body) return Promise.resolve({ ok: true });
    if (path.indexOf('/api/stay-details') === 0) return Promise.resolve({ ok: true, detailsOpen: LS.getItem('demoLocked') !== '1', garageCode: '0000', address: '1234 Sample Street, Chicago (sample only)', doorCode: '0000', wifiName: 'SampleWiFi', wifiPassword: 'sample-password', checkInSteps: 'Sample check-in steps show here.', checkOutSteps: 'Sample checkout steps show here.', parkingNote: 'Sample parking note.', extinguisher: 'By the front door or in the front closet.', terms: { words: 'full refund 45 or more days before arrival; from 15 to 44 days we keep 30% of the total price; inside 15 days we keep half of the total price' } });
    return Promise.resolve({ ok: true, name: 'Sample Guest', apt: '1', start: '2027-01-10', end: '2027-02-12', guests: 2, pets: false, garage: false });
  }
  return _api(path, body);
};
// REAL ACCOUNT MODE: after sign-in the app holds a token (secure storage) and talks to /api/account/*
function acctCall(path, body) {
  return kv('token').then(function (t) {
    var h = { 'Content-Type': 'application/json' }; if (t) h.Authorization = 'Bearer ' + t;
    var o = body ? { method: 'POST', headers: h, body: JSON.stringify(body) } : { headers: h };
    return fetch(SITE + path, o).then(function (r) {
      return r.json().catch(function () { return { ok: false, message: 'Something went wrong. Try again.' }; }).then(function (j) {
        if (r.status === 401 && t && path.indexOf('/api/account/signin') !== 0 && path.indexOf('/api/account/password') !== 0 && path.indexOf('/api/account/delete') !== 0) { leaveDemo(); location.replace('signin.html'); j.signedOut = true; }
        if (r.status === 403 && !j.message) j.message = 'The site did not accept this request yet. Please try again later.';
        if (r.status >= 400 && j.ok === undefined) j.ok = false;
        return j;
      });
    }).catch(function () { return { ok: false, message: 'No connection right now. Try again when you are online.' }; });
  });
}
var _api3 = api;
api = function (path, body) {
  return kv('token').then(function (t) {
    if (!t || DEMO) return _api3(path, body);
    var m = !body && path.match(/^\/api\/stay-(update|details)\?id=([^&]*)/);
    if (m) {
      var id = decodeURIComponent(m[2]);
      if (m[1] === 'details') return acctCall('/api/account/stay?id=' + encodeURIComponent(id));
      return acctCall('/api/account/me').then(function (d) {
        if (d.signedOut || !d.me) return d.signedOut ? d : { ok: false, message: d.message || 'Something went wrong. Try again.' };
        var s = (d.stays || []).filter(function (x) { return String(x.id) === id; })[0];
        if (!s) return { ok: false, message: 'We could not find that stay on your account.' };
        return { ok: true, id: s.id, name: d.me.name || s.name, apt: s.apt, start: s.start, end: s.end, status: s.status };
      });
    }
    if (body && (path === '/api/stay-update' || path === '/api/stay-problem')) return Promise.resolve({ ok: false, message: 'Sending from your account is not connected yet. Please use Messages to reach Hannah.' });
    return _api3(path, body);
  });
};
// pick the stay the app opens on: the one happening now or next, else the newest
function pickStay(stays) {
  var n = new Date(), td = n.getFullYear() + '-' + ('0' + (n.getMonth() + 1)).slice(-2) + '-' + ('0' + n.getDate()).slice(-2);
  var up = (stays || []).filter(function (x) { return x.end >= td; }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  return up[0] || (stays || [])[0] || null;
}
function profileFrom(me, old) {
  var o = old || {}; var oth = (me.others || []).map(function (x) { return x.name || x.email || x.phone || ''; }).filter(Boolean).join(', ');
  var pets = me.pets; if (Array.isArray(pets)) pets = pets.map(function (x) { return typeof x === 'string' ? x : (x.name || ''); }).join(', '); else if (pets && typeof pets === 'object') pets = pets.name || ''; else if (pets === true) pets = 'Yes'; else if (!pets) pets = '';
  return { name: me.name || '', email: me.email || '', phone: me.phone || '', others: oth, pets: String(pets), nEmail: !(me.notify && me.notify.email === false), nPush: o.nPush !== false };
}
function leaveDemo() { LS.removeItem('demo'); ['stay', 'trip', 'safety', 'checks', 'profile', 'chat', 'token', 'rv_door', 'rv_wifi', 'rv_garage'].forEach(kvDel); }
function signedIn() { return kv('stay').then(function (v) { return !!v; }); }
(function () {
  if (!DEMO) return;
  var d = document.createElement('div'); d.style.cssText = 'background:#3A2A20;color:#F5EFE3;font:600 12px sans-serif;text-align:center;padding:6px;position:sticky;top:0;z-index:20';
  d.textContent = 'Sample stay for testing. Nothing here is real or sent. ';
  var x = document.createElement('a'); x.textContent = 'Leave sample'; x.href = 'index.html'; x.style.color = '#EBD3CB'; x.onclick = leaveDemo; d.appendChild(x);
  document.addEventListener('DOMContentLoaded', function () { document.body.insertBefore(d, document.body.firstChild); });
})();

// bottom tab bar on every screen: My Stay, ShallWe, Messages, Profile
(function () {
  var I = {
    home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
    stay: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    places: '<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    msg: '<path d="M4 5h16v11H9l-5 4z"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'
  };
  var T = [['index.html', 'My Stay', 'home'], ['shallwe.html', 'ShallWe', 'places'], ['messages.html', 'Messages', 'msg'], ['profile.html', 'Profile', 'me']];
  var alias = { 'stay.html': 'index.html', 'emergency.html': 'index.html', 'getting-around.html': 'index.html', 'contact.html': 'messages.html', 'signin.html': 'profile.html' };
  var here = (location.pathname.split('/').pop() || 'index.html'); here = alias[here] || here;
  var page = location.pathname.split('/').pop() || 'index.html';
  if (page === 'signin.html' || page === 'offline.html') return;
  kv('stay').then(function (v) { if (!v) location.replace('signin.html'); });
  var nav = document.createElement('nav'); nav.className = 'tabs';
  T.forEach(function (t) {
    var a = document.createElement('a'); a.href = t[0];
    if (t[0] === here) a.className = 'on';
    a.innerHTML = '<svg viewBox="0 0 24 24">' + I[t[2]] + '</svg>' + t[1]; nav.appendChild(a);
  });
  document.body.appendChild(nav);
  kv('token').then(function (t) { if (!t || DEMO) return; acctCall('/api/account/me').then(function (m) {
    var n = 0; (m.stays || []).forEach(function (x) { n += (+x.unread || 0); });
    if (n > 0) { var a = nav.querySelectorAll('a')[2]; if (a) { var b = document.createElement('i'); b.className = 'badge'; b.textContent = n > 9 ? '9+' : n; a.appendChild(b); } } }); });
})();


// Small stacked logo at the top of every screen except Home, Sign in and ShallWe (ShallWe carries only ShallWe)
(function () {
  var page = location.pathname.split('/').pop() || 'index.html';
  if (page === 'index.html' || page === 'signin.html' || page === 'shallwe.html' || page === 'offline.html') return;
  document.addEventListener('DOMContentLoaded', function () {
    var m = document.querySelector('main'); if (!m) return;
    var a = document.createElement('a'); a.className = 'mark'; a.href = 'index.html'; a.setAttribute('aria-label', 'Hermitage House Chicago, home');
    a.innerHTML = '<img src="img/wash.webp" alt=""><b>Hermitage</b><i>House</i><span>Chicago</span>';
    m.insertBefore(a, m.firstChild);
  });
})();

// One window (sheet) for everything: X, tap outside, Escape and the phone's Back all close it; the page behind stays put
var _sheet = null;
function closeSheet(fromPop) { if (!_sheet) return; var s = _sheet; _sheet = null; s.o.remove(); document.removeEventListener('keydown', s.k); document.body.style.overflow = s.ov; if (s.back) s.back.focus && s.back.focus(); if (!fromPop && history.state && history.state.sheet) history.back(); }
window.addEventListener('popstate', function () { closeSheet(true); });
function openSheet(title, fill) {
  closeSheet();
  var o = el('div', '', 'sheet'), b = el('div'); o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
  var x = el('button', '×', 'x'); x.setAttribute('aria-label', 'Close'); x.onclick = function () { closeSheet(); };
  o.onclick = function (e) { if (e.target === o) closeSheet(); };
  b.appendChild(el('h2', title)); fill(b); b.appendChild(x); o.appendChild(b);
  var k = function (e) { if (e.key === 'Escape') closeSheet(); };
  document.addEventListener('keydown', k);
  _sheet = { o: o, k: k, ov: document.body.style.overflow, back: document.activeElement };
  document.body.style.overflow = 'hidden'; document.body.appendChild(o);
  try { history.pushState({ sheet: 1 }, ''); } catch (e) {}
  x.focus();
}
