// Real Apple map for the home screen. Falls back to the drawn sketch if anything fails.
(function () {
  var box = document.querySelector('.map'); if (!box) return;
  var started = false, house = null, map = null, failed = false;
  var STOPS = [
    ['Lawrence station', 'Lawrence Red Line station, Chicago, IL', '15 min', '#C8102E'],
    ['Damen station', 'Damen Brown Line station, Chicago, IL', '16 min', '#6B4A2B'],
    ['Metra', 'Ravenswood Metra station, Chicago, IL', '8 min', '#1B3358'],
    ['Mariano’s', 'Mariano’s, Clark Street, Chicago, IL', '8 min', '#2E7D32']
  ];
  function fail() { /* keep the sketch */ }
  function loadScript(cb) {
    if (window.mapkit) return cb();
    var s = document.createElement('script');
    s.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js'; s.crossOrigin = 'anonymous';
    s.onload = cb; s.onerror = fail; document.head.appendChild(s);
  }
  function getToken(done) {
    fetch(SITE + '/api/map-token', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ready && j.token) done(j.token); else fail(); }).catch(fail);
  }
  function draw() {
    var div = document.createElement('div'); div.id = 'rmap'; div.style.cssText = 'position:absolute;inset:0';
    var region = new mapkit.CoordinateRegion(new mapkit.Coordinate(41.9755, -87.6700), new mapkit.CoordinateSpan(0.03, 0.03));
    map = new mapkit.Map(div, { region: region, showsCompass: mapkit.FeatureVisibility.Hidden, showsZoomControl: false, showsMapTypeControl: false });
    var search = new mapkit.Search({ region: region });
    var geo = new mapkit.Geocoder({ region: region });
    var pending = STOPS.length + 1, adds = [];
    function fin() {
      if (--pending) return;
      if (!adds.length || failed) { try { map.destroy(); } catch (e) {} return; }
      map.addAnnotations(adds); map.showItems(adds, { padding: new mapkit.Padding(40, 30, 40, 30), animate: false });
      box.appendChild(div);
      var svg = box.querySelector('svg'), am = box.querySelector('.am');
      if (svg) svg.style.display = 'none'; if (am) am.style.display = 'none';
    }
    STOPS.forEach(function (s) {
      search.search(s[1], function (err, res) {
        try {
          var it = res && res.places && res.places[0];
          if (!err && it) adds.push(new mapkit.MarkerAnnotation(it.coordinate, { title: s[0], subtitle: s[2], color: s[3], glyphText: '•' }));
        } catch (e) {}
        fin();
      });
    });
    if (house) {
      geo.lookup(house + ', Chicago, IL', function (err, res) {
        try { var p = res && res.results && res.results[0]; if (!err && p) adds.push(new mapkit.MarkerAnnotation(p.coordinate, { title: 'Hermitage House', color: '#C8102E', glyphText: 'H' })); } catch (e) {}
        fin();
      });
    } else fin();
  }
  window.showRealMap = function (address) {
    if (started) return; started = true; house = address || null;
    loadScript(function () {
      try {
        mapkit.init({ authorizationCallback: function (done) { getToken(done); } });
        mapkit.addEventListener('error', function () { failed = true; var m = document.getElementById('rmap'); if (m) m.remove(); var svg = box.querySelector('svg'), am = box.querySelector('.am'); if (svg) svg.style.display = ''; if (am) am.style.display = ''; });
        draw();
      } catch (e) { fail(); }
    });
  };
})();
