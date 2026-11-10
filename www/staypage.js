var box0 = document.getElementById('box'), box2 = document.getElementById('box2'), box = box0, S = null;
var CHECK = [];
function checkItems(d) {
  var a = [];
  a.push('Dishwasher loaded with all remaining dirty dishes');
  a.push(String(d && d.apt) === '2' ? 'All trash and recycling left in their bins by the back door. We will take them out for you!' : 'All trash and recycling left in their bins in the apartment. We will take them out for you!');
  a.push('Please leave all used bedding on the beds. All dirty towels can go in the bathroom.');
  a.push('Check to make sure you have collected all your belongings. If we find anything left behind we will let you know.');
  if (d && d.garage) a.push('Garage door opener left with the remotes in the living room.');
  return a;
}
function firstTime(t) { var m = /\b(\d{1,2}(?::\d{2})?)\s?([ap])\.?m\b/i.exec(String(t || '')); return m ? m[1] + m[2].toLowerCase() + 'm' : ''; }
function clear() { box = box0; box.textContent = ''; if (box2) box2.textContent = ''; }
function parseLink(txt) { try { var u = new URL(txt.trim()); var id = u.searchParams.get('id'), t = u.searchParams.get('t'); return id && t ? { id: id, t: t } : null; } catch (e) { return null; } }
function entry(msg) {
  clear();
  box.appendChild(el('h2', 'Sign in to see your stay')); box.appendChild(el('p', 'Your stay, check-in details and messages show here after you sign in with the email you booked with.')); var si = el('a', 'Sign in', 'btn'); si.href = 'signin.html'; box.appendChild(si); box.appendChild(el('p', 'Have a private stay link instead? Paste it here.', 'note'));
  var i = el('input'); i.type = 'url'; i.placeholder = 'Paste your stay link'; box.appendChild(i);
  var b = el('button', 'Open my stay'); b.style.marginTop = '12px'; box.appendChild(b);
  var m = el('p', msg || '', 'err'); box.appendChild(m);
  b.onclick = function () {
    var l = parseLink(i.value); if (!l) { m.textContent = 'That does not look like your stay link.'; return; }
    api('/api/stay-update?id=' + encodeURIComponent(l.id) + '&t=' + encodeURIComponent(l.t)).then(function (d) {
      if (!d.ok) { m.textContent = d.message || 'This link is not valid anymore.'; return; }
      kvSet('stay', JSON.stringify(l)).then(function () { show(l, d); });
    });
  };
}
function post(extra) { return api('/api/stay-update', Object.assign({ id: S.id, t: S.t }, extra)); }
function sent(where, label) { where.textContent = ''; where.appendChild(el('p', 'Sent. Hannah received your ' + label + ' on ' + stamp() + '. Nothing changes until we confirm it in writing.', 'ok')); }
function quick(label, note, d) {
  var b = el('button', label, 'alt'), m = el('p', '', 'note');
  b.onclick = function () { b.disabled = true; post({ note: note }).then(function (r) { if (r.ok) { b.textContent = label + ' - sent ' + stamp(); } else { b.disabled = false; m.textContent = r.message || 'Try again.'; } }); };
  box.appendChild(b); box.appendChild(m);
}
function request(kind, d, into) {
  var wrap = el('div'), isCancel = kind === 'cancel';
  var b = el('button', isCancel ? 'Request to cancel' : 'Request a change', 'alt');
  var form = el('div'); form.hidden = true;
  form.appendChild(el('p', isCancel ? 'This sends your request to Hannah. Your stay is not cancelled until we confirm it in writing. The day we receive your request is the day used for your cancellation terms, and any refund follows the terms you agreed to when you booked.' : 'This sends your request to Hannah. Nothing changes until we confirm it in writing. New dates can change the price, and every stay stays 32 nights or longer.', 'card'));
  var s, e, g;
  if (!isCancel) { form.appendChild(el('label', 'New check-in')); s = el('input'); s.type = 'date'; form.appendChild(s); form.appendChild(el('label', 'New check-out')); e = el('input'); e.type = 'date'; form.appendChild(e); form.appendChild(el('label', 'Number of guests')); g = el('input'); g.type = 'number'; g.min = 1; g.max = 20; form.appendChild(g); }
  form.appendChild(el('label', 'Anything else Hannah should know')); var n = el('textarea'); n.rows = 3; n.maxLength = 900; form.appendChild(n);
  var go = el('button', 'Send request'); go.style.marginTop = '12px'; form.appendChild(go); var m = el('p', '', 'err'); form.appendChild(m);
  b.onclick = function () { form.hidden = !form.hidden; };
  go.onclick = function () {
    var body = {};
    if (isCancel) body.note = 'REQUEST TO CANCEL (sent from the app). ' + n.value;
    else { var c = {}; if (s.value && e.value) { c.start = s.value; c.end = e.value; } if (g.value) c.guests = +g.value; if (!Object.keys(c).length && !n.value.trim()) { m.textContent = 'Add the change you need.'; return; } if (Object.keys(c).length) body.change = c; body.note = n.value; }
    go.disabled = true;
    post(body).then(function (r) { if (r.ok) sent(wrap, isCancel ? 'cancel request' : 'change request'); else { go.disabled = false; m.textContent = r.message || 'Try again.'; } });
  };
  wrap.appendChild(b); wrap.appendChild(form); (into || box).appendChild(wrap);
}
function remind(d) {
  var N = P.LocalNotifications; if (!N) return;
  var b = el('button', 'Remind me about my stay', 'alt'), m = el('p', '', 'note');
  b.onclick = function () {
    N.requestPermissions().then(function (p) {
      if (p.display !== 'granted') { m.textContent = 'Notifications are off for this app. You can turn them on in your phone settings.'; return; }
      function at(day, h, id, title, body) { var t = new Date(day + 'T' + h + ':00'); if (t > new Date()) return { id: id, title: title, body: body, schedule: { at: t } }; }
      function before(day, k) { var t = new Date(day + 'T12:00:00'); t.setDate(t.getDate() - k); return t.toISOString().slice(0, 10); }
      var list = [at(before(d.start, 1), '09:00', 101, 'Arriving tomorrow', 'Open My stay for your check-in details.'), at(before(d.end, 1), '18:00', 102, 'Checkout tomorrow', 'Open My stay for the checkout list.')].filter(Boolean);
      N.schedule({ notifications: list }).then(function () { m.textContent = list.length ? 'Reminders set on this phone.' : 'Your dates have already passed.'; });
    });
  };
  box.appendChild(b); box.appendChild(m);
}
function checklist(d) {
  CHECK = checkItems(d);
  box.appendChild(el('h2', 'Checkout checklist'));
  var cards = el('div', '', 'card'); box.appendChild(cards);
  kv('checks').then(function (v) {
    var done = v ? JSON.parse(v) : [];
    function draw() {
      cards.textContent = '';
      CHECK.forEach(function (c, i) { var l = el('label', '', 'ck'); var x = el('input'); x.type = 'checkbox';  x.checked = done.indexOf(i) > -1; x.onchange = function () { done = x.checked ? done.concat(i) : done.filter(function (k) { return k !== i; }); kvSet('checks', JSON.stringify(done)); }; l.appendChild(x); l.appendChild(document.createTextNode(c)); cards.appendChild(l); });
      var all = el('button', 'All done', 'alt'); all.onclick = function () { done = CHECK.map(function (_, i) { return i; }); kvSet('checks', JSON.stringify(done)); draw(); }; cards.appendChild(all);
    }
    draw();
  });
}
function row(k, v) { if (!v) return null; var p = el('p', '', 'kv'); p.appendChild(el('strong', k)); p.appendChild(el('span', v)); return p; }
function party(wrap, l, d) {
  wrap.appendChild(el('h2', 'People staying with you'));
  var c = el('div', '', 'card'); wrap.appendChild(c);
  function draw(dd) {
    c.textContent = '';
    var P2 = dd.party || [];
    if (!P2.length) c.appendChild(el('p', dd.isBooker ? 'No one added yet. You can add people who are staying with you on this trip.' : 'The person who booked can add people to this stay.', 'note'));
    P2.forEach(function (p) {
      var r = el('div', '', 'row gst'); r.appendChild(avatar(p.name)); var t = el('div'); t.appendChild(el('b', p.name)); var sub = [p.email, p.phone].filter(Boolean).join(' \u00b7 '); if (sub) t.appendChild(el('span', sub, 'note')); r.appendChild(t);
      if (dd.isBooker) { var rm = el('button', 'Remove', 'alt'); rm.style.cssText = 'width:auto;padding:8px 14px'; rm.onclick = function () { if (!confirm('Remove ' + p.name + ' from this stay? They lose access at once.')) return; rm.disabled = true; acctCall('/api/account/guests', { id: l.id, action: 'remove', guestId: p.id }).then(function (r2) { if (r2.ok === false) { rm.disabled = false; alert(r2.message || 'Could not remove. Try again.'); return; } dd.party = r2.party || []; draw(dd); }); }; r.appendChild(rm); }
      c.appendChild(r);
    });
    if (dd.isBooker && dd.canAddGuests) { var ab = el('button', 'Add a person', 'alt'); ab.style.marginTop = '10px'; ab.onclick = function () { addPerson(l, dd, draw); }; c.appendChild(ab); }
    c.appendChild(el('p', 'Only people staying on this trip, 18 or older. Everyone on the stay sees its dates, address, entry codes, Wi-Fi and messages.', 'note'));
  }
  draw(d);
}
function addPerson(l, dd, redraw) {
  openSheet('Add a person to this stay', function (b) {
    function f(id, label, type) { var lb = el('label', label); lb.htmlFor = id; b.appendChild(lb); var i = document.createElement('input'); i.id = id; if (type) i.type = type; b.appendChild(i); return i; }
    var n = f('gn', 'First and last name'), em = f('ge', 'Email (or phone below)', 'email'), ph = f('gp', 'Phone', 'tel');
    var lab = el('label', '', 'ck'); lab.style.cssText = 'display:flex;gap:10px;align-items:flex-start;margin:12px 0'; var cb = document.createElement('input'); cb.type = 'checkbox'; cb.style.cssText = 'width:auto;margin-top:4px'; lab.appendChild(cb); var tx = el('span'); lab.appendChild(tx); b.appendChild(lab);
    function words() { var fn = (n.value.trim().split(' ')[0]) || 'This person'; tx.textContent = fn + ' is staying with me on this trip, is 18 or older, and is OK with me giving you their email. They\u2019ll see this stay\u2019s dates, address, entry codes and Wi-Fi, and its messages.'; }
    words(); n.oninput = words;
    var m = el('p', '', 'err'), s = el('button', 'Add person'); s.onclick = function () {
      if (!n.value.trim() || (!em.value.trim() && !ph.value.trim())) { m.textContent = 'Add a name and an email or phone.'; return; }
      if (!cb.checked) { m.textContent = 'Please tick the box to continue.'; return; }
      s.disabled = true; var body = { id: l.id, name: n.value.trim(), confirm: true }; if (em.value.trim()) body.email = em.value.trim(); if (ph.value.trim()) body.phone = ph.value.trim();
      acctCall('/api/account/guests', body).then(function (r) { if (r.ok === false) { s.disabled = false; m.textContent = r.message || 'Could not add. Try again.'; return; } dd.party = r.party || dd.party; dd.canAddGuests = r.canAddGuests !== undefined ? r.canAddGuests : dd.canAddGuests; closeSheet(); redraw(dd); });
    };
    b.appendChild(s); b.appendChild(m);
  });
}
function details(l) {
  var wrap = el('div'); box.appendChild(wrap);
  api('/api/stay-details?id=' + encodeURIComponent(l.id) + '&t=' + encodeURIComponent(l.t)).then(function (d) {
    if (window.onDetails) window.onDetails(d);
    if (!d || !d.ok) return;   // routes not live yet, or the stay is not accepted: show nothing
    var open = d.address || d.doorCode || d.wifiName || d.wifiPassword;
    wrap.appendChild(el('h2', 'Check-in details'));
    var c = el('div', '', 'card');
    var ci = firstTime(d.checkInSteps) || '3:00pm', co = firstTime(d.checkOutSteps) || '11:00am';
    var tr = el('div', '', 'times'); tr.style.cssText = 'display:flex;gap:10px;margin-bottom:10px';
    [['Check-in', ci], ['Checkout', co]].forEach(function (x) { var h = el('div'); h.style.cssText = 'flex:1;background:#fff;border-radius:14px;padding:10px;text-align:center'; var lb = el('span', x[0]); lb.style.cssText = 'display:block;font-size:13px'; var bb = el('b', x[1]); bb.style.cssText = 'display:block;font-size:18px'; h.appendChild(lb); h.appendChild(bb); tr.appendChild(h); });
    c.appendChild(tr);
    if (open) {
      [['Address', d.address], ['Door code', d.doorCode], ['Wi-Fi', d.wifiName], ['Wi-Fi password', d.wifiPassword]].forEach(function (x) { var r = row(x[0], x[1]); if (r) c.appendChild(r); });
      c.appendChild(el('p', "These are for your stay only. Please don't share the door code or the Wi-Fi password.", 'note'));
    } else c.appendChild(el('p', 'Your check-in details show here the day before you arrive.'));
    var HOUSE = d.houseNotes || [['Trash and recycling', 'Pickup is on Thursdays. The bins are to the left of the garage when you walk out the gate to the alley.'], ['Laundry', 'The laundry room is on the first floor, with two washers and two dryers.'], ['Extra paper products', 'To the left of the dryers, by the door leading to the backyard.']];
    var rows = [['Parking', d.parkingNote]];
    if (d.garageCode) rows.push(['Garage code', d.garageCode + ', then press the home button on the panel.']);
    rows.push(['Fire extinguisher', d.extinguisher]);
    rows.forEach(function (x) { var r = row(x[0], x[1]); if (r) c.appendChild(r); });
    HOUSE.forEach(function (x) { if (!x || !x[1]) return; var r = el('p', '', 'kv'); r.style.cssText = 'display:block'; var k = el('strong', x[0]); k.style.cssText = 'display:block;margin-bottom:2px'; var v = el('span', x[1]); v.style.cssText = 'display:block;text-align:left'; r.appendChild(k); r.appendChild(v); c.appendChild(r); });
    wrap.appendChild(c);
    var emb = document.getElementById('emb'); if (emb) wrap.appendChild(emb);
    if (ACCT) {
      if (d.isBooker && RQ && !RQ.firstChild) { request('change', RQD, RQ); request('cancel', RQD, RQ); }
      if (!d.isBooker && RQ) RQ.appendChild(el('p', 'Only the person who booked can change or cancel this stay.', 'note'));
      party(wrap, l, d);
    }
    kvSet('safety', JSON.stringify({ address: d.address || '', extinguisher: d.extinguisher || '' }));
    var t = d.terms && d.terms.words;
    wrap.appendChild(el('h2', 'Cancellation'));
    if (t) { var cc = el('div', '', 'card'); cc.appendChild(el('p', t.charAt(0).toUpperCase() + t.slice(1) + '.')); cc.appendChild(el('p', 'This is a short version. The full cancellation policy is the one that applies.', 'note')); wrap.appendChild(cc); }
  });
}
// shrink and re-save the photo as a plain JPEG so the place it was taken (GPS) is not sent
function clean(file) {
  return new Promise(function (res, rej) {
    var img = new Image(), u = URL.createObjectURL(file);
    img.onload = function () {
      var k = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u);
      res(cv.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.onerror = function () { rej(); }; img.src = u;
  });
}
function problem() {
  var wrap = el('div'), b = el('button', 'Report a problem', 'alt'), form = el('div'); form.hidden = true;
  form.appendChild(el('label', 'What is the problem?')); var n = el('textarea'); n.rows = 4; n.maxLength = 900; form.appendChild(n);
  form.appendChild(el('label', 'Add one photo (optional)')); var f = el('input'); f.type = 'file'; f.accept = 'image/*'; form.appendChild(f);
  form.appendChild(el('p', 'Your note and the one photo you choose are emailed to Hannah. The photo is re-saved without its location.', 'note'));
  var go = el('button', 'Send report'); form.appendChild(go); var m = el('p', '', 'err'); form.appendChild(m);
  b.onclick = function () { form.hidden = !form.hidden; };
  go.onclick = function () {
    if (!n.value.trim()) { m.textContent = 'Tell Hannah what is wrong.'; return; }
    go.disabled = true;
    var done = function (photo) {
      var body = { id: S.id, t: S.t, note: n.value }; if (photo) body.photo = { type: 'image/jpeg', data: photo };
      api('/api/stay-problem', body).then(function (r) { if (r.ok) { wrap.textContent = ''; wrap.appendChild(el('p', 'Sent. Hannah received your report on ' + stamp() + '.', 'ok')); } else { go.disabled = false; m.textContent = r.message || 'Try again.'; } });
    };
    if (f.files && f.files[0]) clean(f.files[0]).then(done, function () { go.disabled = false; m.textContent = 'That photo could not be read. Try another, or send without it.'; }); else done(null);
  };
  wrap.appendChild(b); wrap.appendChild(form); box.appendChild(wrap);
}
var ACCT = false, RQ = null, RQD = null;
function show(l, d) { kv('token').then(function (t) { ACCT = !!t && !DEMO; show0(l, d); }); }
function show0(l, d) {
  S = l; clear(); if (window.onStay) window.onStay(d); kvSet('trip', JSON.stringify({ first: String(d.name || '').split(' ')[0], apt: d.apt, start: d.start, end: d.end }));
  var hero = el('div', '', 'tile tall'); var him = document.createElement('img'); him.src = d.apt == '2' ? 'img/apt2.jpg' : 'img/apt1.jpg'; him.alt = ''; hero.appendChild(him);
  var ht = el('div', '', 't'); ht.appendChild(el('b', 'Apartment ' + d.apt)); ht.appendChild(el('span', us(d.start) + ' to ' + us(d.end) + (d.guests ? ' \u00b7 ' + d.guests + (d.guests == 1 ? ' guest' : ' guests') : '') + (d.pets ? ', pets' : '') + (d.garage ? ', garage' : ''))); hero.appendChild(ht); box.appendChild(hero);
  var days = Math.ceil((new Date(d.start.replace(/-/g, '/')) - new Date()) / 864e5); var cd = el('p', days > 1 ? days + ' days until check-in.' : days === 1 ? 'Check-in is tomorrow.' : days === 0 ? 'Check-in is today.' : 'Welcome home.', 'note'); cd.style.cssText = 'text-align:center;margin:10px 0 0;font-family:var(--display);font-size:18px'; box.appendChild(cd);
  details(l);
  var em = el('a', 'Emergency help', 'btn'); em.id = 'emb'; em.href = 'emergency.html'; em.style.background = 'var(--sw-red)'; em.style.color = '#fff'; box.appendChild(em);
  if (box2) box = box2;
  var a = el('a', 'Open my full stay page', 'btn'); a.href = '#'; a.onclick = function (ev) { ev.preventDefault(); openSite(ACCT ? '/account' : '/update.html?id=' + encodeURIComponent(l.id) + '&t=' + encodeURIComponent(l.t)); }; if (!DEMO) box.appendChild(a);
  remind(d);
  box.appendChild(el('h2', 'Let Hannah know'));
  quick("I've arrived", "I've arrived (sent from the app).", d); quick('Running late', 'Running late (sent from the app).', d);
  checklist(d);
  box.appendChild(el('h2', 'Change or cancel'));
  var rq = el('div'); box.appendChild(rq); RQ = rq; RQD = d; if (!ACCT) { request('change', d, rq); request('cancel', d, rq); }
  var pl = el('a', 'Read the full cancellation policy'); pl.href = '#'; pl.onclick = function (ev) { ev.preventDefault(); openSite('/cancellation.html'); }; box.appendChild(pl);
  box.appendChild(el('h2', 'Something wrong?')); problem();
  var f = el('button', 'Forget this stay on this phone', 'alt'); f.style.marginTop = '24px';
  f.onclick = function () { if (DEMO) { leaveDemo(); location.href = 'index.html'; return; } kvDel('stay'); kvDel('checks'); kvDel('safety'); kvDel('trip'); if (P.LocalNotifications) P.LocalNotifications.cancel({ notifications: [{ id: 101 }, { id: 102 }] }); S = null; entry('This stay has been removed from this phone.'); };
  if (!ACCT) box.appendChild(f);
}
kv('stay').then(function (v) {
  if (!v) return entry();
  var l = JSON.parse(v);
  api('/api/stay-update?id=' + encodeURIComponent(l.id) + '&t=' + encodeURIComponent(l.t)).then(function (d) { if (d.ok) show(l, d); else { kvDel('stay'); entry(d.message); } });
});
