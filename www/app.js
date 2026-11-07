// Shared helpers. No address, door code or Wi-Fi is ever stored here; the stay link stays on this phone.
var SITE = 'https://hermitagehousechicago.com';
var P = (window.Capacitor && window.Capacitor.Plugins) || {};
function el(tag, text, cls) { var e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
function kv(k) { return P.Preferences ? P.Preferences.get({ key: k }).then(function (r) { return r.value; }) : Promise.resolve(localStorage.getItem(k)); }
function kvSet(k, v) { return P.Preferences ? P.Preferences.set({ key: k, value: v }) : Promise.resolve(localStorage.setItem(k, v)); }
function kvDel(k) { return P.Preferences ? P.Preferences.remove({ key: k }) : Promise.resolve(localStorage.removeItem(k)); }
function openSite(path) { var u = SITE + path; if (P.Browser) P.Browser.open({ url: u }); else window.open(u, '_blank'); }
function api(path, body) {
  var o = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
  return fetch(SITE + path, o).then(function (r) { return r.json().catch(function () { return { ok: false, message: 'Something went wrong. Try again.' }; }); })
    .catch(function () { return { ok: false, message: 'No connection right now. Try again when you are online.' }; });
}
var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function us(d) { var p = d.split('-'); return MO[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0]; }
function stamp() { return new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }); }

// bottom tab bar on every screen
(function () {
  var I = {
    home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
    stay: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    places: '<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    msg: '<path d="M4 5h16v11H9l-5 4z"/>',
    sos: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'
  };
  var T = [['index.html', 'Home', 'home'], ['stay.html', 'My stay', 'stay'], ['shallwe.html', 'Places', 'places'], ['contact.html', 'Message', 'msg'], ['emergency.html', 'Emergency', 'sos']];
  var here = (location.pathname.split('/').pop() || 'index.html');
  var nav = document.createElement('nav'); nav.className = 'tabs';
  T.forEach(function (t) {
    var a = document.createElement('a'); a.href = t[0];
    if (t[0] === here) a.className = 'on'; if (t[2] === 'sos') a.className += ' sos';
    a.innerHTML = '<svg viewBox="0 0 24 24">' + I[t[2]] + '</svg>' + t[1]; nav.appendChild(a);
  });
  document.body.appendChild(nav);
})();
