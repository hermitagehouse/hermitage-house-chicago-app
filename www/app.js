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
