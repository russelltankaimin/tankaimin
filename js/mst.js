/*
 * Hero art: a Euclidean minimum spanning tree, built by Kruskal.
 *
 * Points are scattered (a jittered grid, so they're even but not
 * regular). Candidate edges are taken shortest first; an edge is
 * kept when it joins two different components (union-find) and
 * skipped, with a brief faint flicker, when it would close a cycle.
 * Edges are coloured by when they were added: early, short edges
 * are light blue and the late, long "bridges" between clusters are
 * lilac. When the tree is complete it rests, fades, and a new one
 * grows.
 *
 * Clicking adds a vertex: the tree is recomputed, edges that leave
 * the tree fade out and new ones grow in.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('mst-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var hero = canvas.parentNode;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Tunables ────────────────────────────────────────────────
  var BUILD_MS = 15000;    // time to add all n-1 tree edges
  var GROW_MS = 900;       // how long one edge takes to draw
  var FLICKER_MS = 650;    // rejected-edge flicker
  var HOLD_MS = 7000;      // rest on the finished tree
  var FADE_MS = 2600;      // fade out before the next tree
  var CELL = 76;           // average spacing between points (px)
  var WOBBLE = 1.6;        // px of gentle drift around each point

  var BLUE = [118, 178, 232], PURPLE = [150, 128, 232];

  var w = 0, h = 0;
  var px = [], py = [], phase = [];
  var events = [];       // Kruskal events, sorted by time
  var shown = {};        // edge key -> { a, b, t0, col }
  var fading = [];       // edges leaving the tree
  var vcol = [];         // colour of each vertex once joined
  var built = 0;         // time the last tree edge appears
  var cycleStart = 0, fadeStart = 0;
  var running = false, visible = true, raf = 0;

  function mix(t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.round(BLUE[0] + (PURPLE[0] - BLUE[0]) * t) + ',' +
           Math.round(BLUE[1] + (PURPLE[1] - BLUE[1]) * t) + ',' +
           Math.round(BLUE[2] + (PURPLE[2] - BLUE[2]) * t);
  }
  function key(a, b) { return a < b ? a * 65536 + b : b * 65536 + a; }
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3); }

  function sizeCanvas() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function scatter() {
    px = []; py = []; phase = [];
    var cell = w < 640 ? CELL * 0.85 : CELL;
    var cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1;
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        if (Math.random() < 0.18) continue;       // a few gaps make clusters
        addPoint((i - 0.25 + Math.random() * 0.9) * cell,
                 (j - 0.25 + Math.random() * 0.9) * cell);
      }
    }
  }

  function addPoint(x, y) {
    px.push(x); py.push(y);
    phase.push(Math.random() * Math.PI * 2);
    vcol.push(null);
  }

  // Candidate edges: every pair closer than `reach`, found via a grid.
  function candidates(reach) {
    var n = px.length, list = [];
    var cols = Math.floor(w / reach) + 2, rows = Math.floor(h / reach) + 2;
    var grid = {};
    function cellOf(i) {
      return (Math.floor(py[i] / reach) + 1) * cols + Math.floor(px[i] / reach) + 1;
    }
    for (var i = 0; i < n; i++) {
      var c = cellOf(i);
      (grid[c] || (grid[c] = [])).push(i);
    }
    var r2 = reach * reach;
    for (i = 0; i < n; i++) {
      var ci = cellOf(i);
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          var cell = grid[ci + dy * cols + dx];
          if (!cell) continue;
          for (var k = 0; k < cell.length; k++) {
            var j = cell[k];
            if (j <= i) continue;
            var ex = px[i] - px[j], ey = py[i] - py[j], d2 = ex * ex + ey * ey;
            if (d2 < r2) list.push({ a: i, b: j, d: d2 });
          }
        }
      }
    }
    list.sort(function (p, q) { return p.d - q.d; });
    return list;
  }

  // Kruskal with union-find (path halving + union by size).
  function kruskal(list, n) {
    var parent = new Int32Array(n), size = new Int32Array(n);
    for (var i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
    function find(x) {
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    }
    var out = [];
    for (i = 0; i < list.length; i++) {
      var e = list[i], ra = find(e.a), rb = find(e.b);
      if (ra === rb) { out.push({ a: e.a, b: e.b, ok: false }); continue; }
      if (size[ra] < size[rb]) { var t = ra; ra = rb; rb = t; }
      parent[rb] = ra; size[ra] += size[rb];
      out.push({ a: e.a, b: e.b, ok: true });
    }
    return out;
  }

  function reach() { return (w < 640 ? CELL * 0.85 : CELL) * 2.6; }

  // Lay the Kruskal events out in time: tree edges evenly spaced,
  // rejected edges in between according to their rank.
  function schedule(list, now, skipShown) {
    var accepted = 0, i;
    for (i = 0; i < list.length; i++) if (list[i].ok) accepted++;
    var pending = 0;
    for (i = 0; i < list.length; i++) {
      if (list[i].ok && !(skipShown && shown[key(list[i].a, list[i].b)])) pending++;
    }
    var dt = skipShown ? Math.min(120, BUILD_MS / Math.max(pending, 1)) : BUILD_MS / Math.max(accepted, 1);
    var k = 0, rank = 0, out = [];
    for (i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.ok) {
        var already = skipShown && shown[key(e.a, e.b)];
        e.rank = rank / Math.max(accepted - 1, 1);
        rank++;
        if (already) { already.rank = e.rank; continue; }
        e.t = now + k * dt; k++;
        out.push(e);
      } else if (!skipShown) {
        e.t = now + (k - 0.5) * dt;
        if (e.t >= now) out.push(e);
      }
    }
    built = now + Math.max(k - 1, 0) * dt + GROW_MS;
    return out;
  }

  function newTree(now) {
    shown = {}; fading = []; vcol = [];
    scatter();
    events = schedule(kruskal(candidates(reach()), px.length), now + 400, false);
    cycleStart = now; fadeStart = 0;
  }

  // Add a vertex and move to the new MST: keep shared edges, fade
  // the ones that drop out, grow the new ones.
  function insertVertex(x, y, now) {
    // Settle anything still scheduled so the diff is against what
    // the visitor actually sees.
    events = events.filter(function (e) { return e.t <= now; });
    addPoint(x, y);
    var list = kruskal(candidates(reach()), px.length);
    var keep = {};
    list.forEach(function (e) { if (e.ok) keep[key(e.a, e.b)] = true; });
    Object.keys(shown).forEach(function (k) {
      if (!keep[k]) { var s = shown[k]; fading.push({ a: s.a, b: s.b, col: s.col, t0: now }); delete shown[k]; }
    });
    events = schedule(list, now, true);
    fadeStart = 0;
  }

  function pos(i, now) {
    var p = phase[i];
    return [px[i] + Math.cos(now * 0.00043 + p) * WOBBLE,
            py[i] + Math.sin(now * 0.00037 + p * 1.7) * WOBBLE];
  }

  function step(now) {
    // Fire due events
    while (events.length && events[0].t <= now) {
      var e = events.shift();
      if (e.ok) {
        var col = mix(e.rank);
        shown[key(e.a, e.b)] = { a: e.a, b: e.b, t0: e.t, col: col, rank: e.rank };
        if (!vcol[e.a]) vcol[e.a] = col;
        if (!vcol[e.b]) vcol[e.b] = col;
      } else {
        fading.push({ a: e.a, b: e.b, t0: e.t, flicker: true });
      }
    }
    fading = fading.filter(function (f) { return now - f.t0 < (f.flicker ? FLICKER_MS : 1200); });

    if (!events.length && !fadeStart && now > built + HOLD_MS) fadeStart = now;
    if (fadeStart && now > fadeStart + FADE_MS) newTree(now);
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    var n = px.length, i, P = new Array(n);
    for (i = 0; i < n; i++) P[i] = pos(i, now);

    var global = fadeStart ? 1 - (now - fadeStart) / FADE_MS : 1;
    if (global < 0) global = 0;
    ctx.lineCap = 'round';

    // Rejected edges flicker; removed tree edges fade out
    for (i = 0; i < fading.length; i++) {
      var f = fading[i], a = P[f.a], b = P[f.b];
      var t = (now - f.t0) / (f.flicker ? FLICKER_MS : 1200);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      if (f.flicker) {
        ctx.setLineDash([2, 4]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(150,140,200,' + (0.28 * Math.sin(Math.PI * t) * global).toFixed(3) + ')';
      } else {
        ctx.setLineDash([]);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = 'rgba(' + f.col + ',' + (0.8 * (1 - t)).toFixed(3) + ')';
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Tree edges, each drawn outward from its first endpoint
    ctx.lineWidth = 1.8;
    var keys = Object.keys(shown);
    for (i = 0; i < keys.length; i++) {
      var s = shown[keys[i]];
      var g = ease((now - s.t0) / GROW_MS);
      if (g <= 0) continue;
      var A = P[s.a], B = P[s.b];
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(A[0] + (B[0] - A[0]) * g, A[1] + (B[1] - A[1]) * g);
      ctx.strokeStyle = 'rgba(' + s.col + ',' + (0.85 * global).toFixed(3) + ')';
      ctx.stroke();
    }

    // Vertices: faint until joined to the tree
    for (i = 0; i < n; i++) {
      ctx.beginPath();
      if (vcol[i]) {
        ctx.fillStyle = 'rgba(' + vcol[i] + ',' + (0.95 * global + 0.05).toFixed(3) + ')';
        ctx.arc(P[i][0], P[i][1], 2.6, 0, Math.PI * 2);
      } else {
        ctx.fillStyle = 'rgba(140,130,190,' + (0.38 * (fadeStart ? global : 1)).toFixed(3) + ')';
        ctx.arc(P[i][0], P[i][1], 2, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    step(now);
    draw(now);
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion || !visible || document.hidden) return;
    running = true;
    raf = window.requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  // Static picture: the finished tree, all at once.
  function drawStatic() {
    newTree(-1e9);
    step(0);
    built = 0;
    draw(0);
  }

  // ── Interaction ─────────────────────────────────────────────
  if (!reduceMotion) {
    hero.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.term, a, button')) return;
      var rect = canvas.getBoundingClientRect();
      insertVertex(e.clientX - rect.left, e.clientY - rect.top, window.performance.now());
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(canvas);
  }

  var resizeTimer = 0, lastWidth = 0;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      var width = canvas.getBoundingClientRect().width;
      if (Math.abs(width - lastWidth) < 1) return;   // ignore mobile URL-bar height changes
      lastWidth = width;
      sizeCanvas();
      if (reduceMotion) drawStatic(); else newTree(window.performance.now());
    }, 150);
  });

  lastWidth = canvas.getBoundingClientRect().width;
  sizeCanvas();
  if (reduceMotion) {
    drawStatic();
  } else {
    newTree(window.performance.now());
    start();
  }
})();
