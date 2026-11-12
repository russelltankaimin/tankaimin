/*
 * Hero art: breadth-first search on a random geometric graph.
 *
 * Vertices drift slowly; u ~ v whenever |u - v| < r, with r chosen
 * so the mean degree is about MEAN_DEGREE. Every few seconds a BFS
 * runs from a random root: vertices light up layer by layer
 * (cyan at the root -> magenta at the deepest layer) and the BFS
 * tree grows along the edges. Vertices outside the root's connected
 * component stay dim.
 *
 * Hover a vertex to highlight its neighbourhood N(v); click near a
 * vertex to run BFS from it.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('graph-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var hero = canvas.parentNode;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Tunables ────────────────────────────────────────────────
  var MEAN_DEGREE = 4.4;   // expected degree, sets the connection radius
  var SPEED = 0.012;       // drift speed in px per ms
  var LAYER_MS = 240;      // time per BFS layer
  var HOLD_MS = 1800;      // keep the finished search on screen
  var FADE_MS = 1400;      // fade-out duration
  var GAP_MS = 900;        // pause before the next automatic search
  var HOVER_PX = 22;       // hover pick radius
  var CLICK_PX = 70;       // click pick radius

  var CYAN = [0, 234, 255], MAGENTA = [255, 61, 220];
  var LIME = '125,255,106';

  var w = 0, h = 0, n = 0, r = 0;
  var xs, ys, ang, spd;
  var adj = [], edges = [], edgeD = [];
  var search = null;          // current BFS
  var nextAuto = 0;
  var pointer = null, hover = -1;
  var running = false, visible = true, raf = 0, lastT = 0;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function mix(t) {
    return Math.round(CYAN[0] + (MAGENTA[0] - CYAN[0]) * t) + ',' +
           Math.round(CYAN[1] + (MAGENTA[1] - CYAN[1]) * t) + ',' +
           Math.round(CYAN[2] + (MAGENTA[2] - CYAN[2]) * t);
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    if (dpr > 2) dpr = 2;
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    n = clamp(Math.round((w * h) / 9500), 36, 140);
    // E[deg] ~ n * pi * r^2 / area  =>  r = sqrt(k * area / (n * pi))
    r = Math.sqrt((MEAN_DEGREE * w * h) / (n * Math.PI));

    xs = new Float32Array(n); ys = new Float32Array(n);
    ang = new Float32Array(n); spd = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      xs[i] = Math.random() * w;
      ys[i] = Math.random() * h;
      ang[i] = Math.random() * Math.PI * 2;
      spd[i] = SPEED * (0.4 + Math.random() * 0.9);
    }
    search = null;
    buildEdges();
  }

  // Unit-disk edges via a uniform grid with cell size r.
  function buildEdges() {
    var cols = Math.floor(w / r) + 1, rows = Math.floor(h / r) + 1;
    var grid = new Array(cols * rows);
    var i, j, k;
    for (i = 0; i < n; i++) {
      var ci = clamp(Math.floor(xs[i] / r), 0, cols - 1);
      var cj = clamp(Math.floor(ys[i] / r), 0, rows - 1);
      k = cj * cols + ci;
      (grid[k] || (grid[k] = [])).push(i);
    }
    adj = new Array(n);
    for (i = 0; i < n; i++) adj[i] = [];
    edges = []; edgeD = [];
    var r2 = r * r;
    for (i = 0; i < n; i++) {
      var gx = clamp(Math.floor(xs[i] / r), 0, cols - 1);
      var gy = clamp(Math.floor(ys[i] / r), 0, rows - 1);
      for (var dy = -1; dy <= 1; dy++) {
        var yy = gy + dy;
        if (yy < 0 || yy >= rows) continue;
        for (var dx = -1; dx <= 1; dx++) {
          var xx = gx + dx;
          if (xx < 0 || xx >= cols) continue;
          var cell = grid[yy * cols + xx];
          if (!cell) continue;
          for (k = 0; k < cell.length; k++) {
            j = cell[k];
            if (j <= i) continue;
            var ex = xs[i] - xs[j], ey = ys[i] - ys[j];
            var d2 = ex * ex + ey * ey;
            if (d2 < r2) {
              adj[i].push(j); adj[j].push(i);
              edges.push(i, j); edgeD.push(Math.sqrt(d2) / r);
            }
          }
        }
      }
    }
  }

  function bfsFrom(root, start) {
    var dist = new Int16Array(n), parent = new Int16Array(n);
    for (var i = 0; i < n; i++) { dist[i] = -1; parent[i] = -1; }
    dist[root] = 0;
    var queue = [root], head = 0, maxD = 0;
    while (head < queue.length) {
      var u = queue[head++];
      var nb = adj[u];
      for (var k = 0; k < nb.length; k++) {
        var v = nb[k];
        if (dist[v] < 0) {
          dist[v] = dist[u] + 1;
          parent[v] = u;
          if (dist[v] > maxD) maxD = dist[v];
          queue.push(v);
        }
      }
    }
    return { root: root, dist: dist, parent: parent, maxD: maxD, size: queue.length, start: start };
  }

  // Is vertex i hidden behind the terminal window?
  function covered(i, box) {
    return box && xs[i] > box.left && xs[i] < box.right && ys[i] > box.top && ys[i] < box.bottom;
  }

  function termBox() {
    var term = hero.querySelector('.term');
    if (!term) return null;
    var c = canvas.getBoundingClientRect(), t = term.getBoundingClientRect();
    return { left: t.left - c.left, right: t.right - c.left, top: t.top - c.top, bottom: t.bottom - c.top };
  }

  // Prefer visible roots in a reasonably large component, so the
  // search starts where you can see it and has somewhere to go.
  function autoSearch(now) {
    var box = termBox();
    var best = null, bestScore = -1, want = Math.max(8, Math.round(n * 0.3));
    for (var t = 0; t < 16; t++) {
      var root = (Math.random() * n) | 0;
      var s = bfsFrom(root, now);
      var score = s.size * (covered(root, box) ? 0.2 : 1);
      if (score > bestScore) { best = s; bestScore = score; }
      if (score >= want) break;
    }
    search = best;
  }

  function move(dt) {
    for (var i = 0; i < n; i++) {
      ang[i] += (Math.random() - 0.5) * 0.08; // gentle Brownian turning
      xs[i] += Math.cos(ang[i]) * spd[i] * dt;
      ys[i] += Math.sin(ang[i]) * spd[i] * dt;
      if (xs[i] < 0) { xs[i] = 0; ang[i] = Math.PI - ang[i]; }
      else if (xs[i] > w) { xs[i] = w; ang[i] = Math.PI - ang[i]; }
      if (ys[i] < 0) { ys[i] = 0; ang[i] = -ang[i]; }
      else if (ys[i] > h) { ys[i] = h; ang[i] = -ang[i]; }
    }
  }

  function nearest(p, maxPx) {
    if (!p) return -1;
    var best = -1, bestD = maxPx * maxPx;
    for (var i = 0; i < n; i++) {
      var dx = xs[i] - p.x, dy = ys[i] - p.y, d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  // Search progress: elapsed time and overall opacity (1 -> 0 on fade).
  function searchState(now, frozen) {
    if (!search) return null;
    if (frozen) return { elapsed: Infinity, alpha: 1 };
    var elapsed = now - search.start;
    var waveEnd = (search.maxD + 1) * LAYER_MS;
    var alpha = 1;
    if (elapsed > waveEnd + HOLD_MS) alpha = 1 - (elapsed - waveEnd - HOLD_MS) / FADE_MS;
    if (alpha <= 0) { search = null; nextAuto = now + GAP_MS; return null; }
    return { elapsed: elapsed, alpha: alpha };
  }

  function draw(now, frozen) {
    ctx.clearRect(0, 0, w, h);
    var st = searchState(now, frozen);
    var i, a, b;

    // Base edges, bucketed by length: short edges a little brighter
    var bands = [[0, 0.5, 0.34], [0.5, 0.8, 0.22], [0.8, 1.01, 0.11]];
    ctx.lineWidth = 1;
    for (var bi = 0; bi < bands.length; bi++) {
      ctx.beginPath();
      for (i = 0; i < edgeD.length; i++) {
        if (edgeD[i] < bands[bi][0] || edgeD[i] >= bands[bi][1]) continue;
        a = edges[2 * i]; b = edges[2 * i + 1];
        ctx.moveTo(xs[a], ys[a]); ctx.lineTo(xs[b], ys[b]);
      }
      ctx.strokeStyle = 'rgba(0,234,255,' + bands[bi][2] + ')';
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'lighter';

    // BFS tree, growing from parent to child within each layer
    if (st) {
      var dist = search.dist, parent = search.parent, maxD = search.maxD || 1;
      ctx.lineWidth = 1.8;
      for (i = 0; i < n; i++) {
        if (dist[i] <= 0) continue;
        var t = clamp((st.elapsed - (dist[i] - 1) * LAYER_MS) / LAYER_MS, 0, 1);
        if (t <= 0) continue;
        var p = parent[i];
        var ex = xs[i] - xs[p], ey = ys[i] - ys[p];
        if (ex * ex + ey * ey > r * r * 2.6) continue; // drifted far apart
        ctx.beginPath();
        ctx.moveTo(xs[p], ys[p]);
        ctx.lineTo(xs[p] + ex * t, ys[p] + ey * t);
        ctx.strokeStyle = 'rgba(' + mix(dist[i] / maxD) + ',' + (0.85 * st.alpha).toFixed(3) + ')';
        ctx.stroke();
      }
    }

    // Hovered vertex: its neighbourhood N(v)
    if (hover >= 0) {
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      var nb = adj[hover];
      for (i = 0; i < nb.length; i++) {
        ctx.moveTo(xs[hover], ys[hover]); ctx.lineTo(xs[nb[i]], ys[nb[i]]);
      }
      ctx.strokeStyle = 'rgba(' + LIME + ',0.75)';
      ctx.stroke();
    }

    // Vertices; size grows a little with degree
    for (i = 0; i < n; i++) {
      var deg = adj[i].length;
      var rad = 1.5 + Math.min(deg, 8) * 0.22;
      var lit = st && search.dist[i] >= 0 && st.elapsed >= search.dist[i] * LAYER_MS;
      ctx.beginPath();
      if (lit) {
        var col = mix(search.dist[i] / (search.maxD || 1));
        ctx.fillStyle = 'rgba(' + col + ',' + (0.16 * st.alpha).toFixed(3) + ')';
        ctx.arc(xs[i], ys[i], rad * 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + col + ',' + (0.45 + 0.55 * st.alpha).toFixed(3) + ')';
      } else {
        ctx.fillStyle = 'rgba(150,185,215,0.62)';
      }
      ctx.arc(xs[i], ys[i], rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Root: pulsing ring
    if (st) {
      var rx = xs[search.root], ry = ys[search.root];
      var phase = frozen ? 0.4 : (st.elapsed % 1400) / 1400;
      ctx.beginPath();
      ctx.arc(rx, ry, 5 + phase * 16, 0, Math.PI * 2);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(0,234,255,' + ((1 - phase) * 0.8 * st.alpha).toFixed(3) + ')';
      ctx.stroke();
    }

    if (hover >= 0) {
      ctx.beginPath();
      ctx.arc(xs[hover], ys[hover], 6, 0, Math.PI * 2);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(' + LIME + ',0.95)';
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(t) {
    raf = 0;
    if (!running) return;
    var dt = lastT ? Math.min(t - lastT, 50) : 16;
    lastT = t;
    move(dt);
    buildEdges();
    hover = nearest(pointer, HOVER_PX);
    if (!search && t >= nextAuto) autoSearch(t);
    draw(t, false);
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion || !visible || document.hidden) return;
    running = true;
    lastT = 0;
    raf = window.requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  // ── Interaction ─────────────────────────────────────────────
  function toLocal(e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    return { x: x, y: y };
  }

  function overUi(e) {
    return e.target.closest && e.target.closest('.term, a, button');
  }

  if (!reduceMotion) {
    window.addEventListener('pointermove', function (e) {
      pointer = overUi(e) ? null : toLocal(e);
      hero.style.cursor = nearest(pointer, HOVER_PX) >= 0 ? 'pointer' : '';
    }, { passive: true });
    document.addEventListener('pointerleave', function () { pointer = null; });
    window.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') pointer = null; });

    hero.addEventListener('click', function (e) {
      if (overUi(e)) return;
      var v = nearest(toLocal(e), CLICK_PX);
      if (v >= 0) search = bfsFrom(v, window.performance.now());
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
      if (Math.abs(width - lastWidth) < 1) return;
      lastWidth = width;
      resize();
      if (reduceMotion) { autoSearch(0); draw(0, true); }
    }, 150);
  });

  lastWidth = canvas.getBoundingClientRect().width;
  resize();
  if (reduceMotion) {
    // Static: one completed search, no motion
    autoSearch(0);
    draw(0, true);
  } else {
    nextAuto = 0;
    start();
  }
})();
