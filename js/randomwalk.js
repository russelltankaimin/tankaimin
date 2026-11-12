/*
 * Hero art: simple symmetric random walks on the lattice Z².
 *
 * Each walker takes a unit step N/E/S/W with probability 1/4.
 * Near the pointer the walk gets a drift: the step towards the
 * pointer becomes more likely (a biased random walk). Clicking
 * releases a burst of new walkers from that lattice point.
 *
 * Trails are redrawn from history each frame (bucketed by age
 * into a few alpha bands), so there is no smearing residue.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('randomwalk-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var hero = canvas.parentNode;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Tunables ────────────────────────────────────────────────
  var SPACING = 12;         // lattice spacing in CSS px
  var TRAIL = 70;           // steps of history kept per walker
  var BANDS = 7;            // alpha buckets for trail fading
  var STEP_MS = 55;         // time between steps
  var DRIFT_RADIUS = 240;   // px of pointer influence
  var DRIFT_MAX = 0.85;     // max bias at the pointer (0..1)
  var BURST = 7;            // walkers released per click
  var MAX_EXTRA = 40;       // cap on click-spawned walkers alive at once

  // [rgb, weight] — cyan dominant, magenta, a little lime
  var PALETTE = [['0,234,255', 0.55], ['255,61,220', 0.32], ['125,255,106', 0.13]];
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  var w = 0, h = 0, cols = 0, rows = 0;
  var baseCount = 0;
  var walkers = [];
  var pointer = null;
  var running = false, visible = true, raf = 0, lastStep = 0;

  function pickColor() {
    var r = Math.random(), acc = 0;
    for (var i = 0; i < PALETTE.length; i++) {
      acc += PALETTE[i][1];
      if (r <= acc) return i;
    }
    return 0;
  }

  function makeWalker(gx, gy, extra) {
    if (gx === undefined) {
      gx = Math.floor(Math.random() * (cols + 1));
      gy = Math.floor(Math.random() * (rows + 1));
    }
    return {
      xs: [gx], ys: [gy],
      color: pickColor(),
      life: 250 + Math.floor(Math.random() * 700),
      age: 0,
      dead: 0,        // >0 while the trail is fading out
      extra: !!extra  // click-spawned; not respawned
    };
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    if (dpr > 2) dpr = 2;
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(w / SPACING);
    rows = Math.ceil(h / SPACING);
    var n = Math.round((w * h) / 15000);
    baseCount = n < 22 ? 22 : n > 80 ? 80 : n;

    walkers = [];
    for (var i = 0; i < baseCount; i++) {
      var wk = makeWalker();
      wk.age = Math.floor(Math.random() * wk.life * 0.6); // stagger deaths
      walkers.push(wk);
    }
    // Pre-run so the first frame already has texture
    for (var s = 0; s < TRAIL; s++) step();
    draw();
  }

  // Choose a direction, biased towards the pointer when nearby.
  function chooseDir(wk) {
    var last = wk.xs.length - 1;
    var px = wk.xs[last] * SPACING, py = wk.ys[last] * SPACING;
    var k = 0, ux = 0, uy = 0;
    if (pointer) {
      var dx = pointer.x - px, dy = pointer.y - py;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1 && d < DRIFT_RADIUS) {
        k = DRIFT_MAX * (1 - d / DRIFT_RADIUS);
        ux = dx / d; uy = dy / d;
      }
    }
    if (k === 0) return DIRS[(Math.random() * 4) | 0];
    // weight_i = 1 + k * <dir_i, u>; the four weights sum to 4
    var r = Math.random() * 4, acc = 0;
    for (var i = 0; i < 4; i++) {
      acc += 1 + k * (DIRS[i][0] * ux + DIRS[i][1] * uy);
      if (r <= acc) return DIRS[i];
    }
    return DIRS[3];
  }

  function step() {
    var extras = 0;
    for (var i = walkers.length - 1; i >= 0; i--) {
      var wk = walkers[i];
      if (wk.dead > 0) {
        wk.dead += 1;
        wk.xs.shift(); wk.ys.shift();
        if (wk.xs.length < 2) {
          if (wk.extra) walkers.splice(i, 1);
          else walkers[i] = makeWalker();
        }
        continue;
      }
      if (wk.extra) extras += 1;
      var dir = chooseDir(wk);
      var last = wk.xs.length - 1;
      var nx = wk.xs[last] + dir[0], ny = wk.ys[last] + dir[1];
      wk.xs.push(nx); wk.ys.push(ny);
      if (wk.xs.length > TRAIL) { wk.xs.shift(); wk.ys.shift(); }
      wk.age += 1;
      if (wk.age > wk.life || nx < -1 || ny < -1 || nx > cols + 1 || ny > rows + 1) wk.dead = 1;
    }
    return extras;
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.25;
    ctx.lineCap = 'square';

    for (var c = 0; c < PALETTE.length; c++) {
      var rgb = PALETTE[c][0];
      for (var b = 0; b < BANDS; b++) {
        ctx.beginPath();
        var any = false;
        for (var i = 0; i < walkers.length; i++) {
          var wk = walkers[i];
          if (wk.color !== c) continue;
          var xs = wk.xs, ys = wk.ys, L = xs.length;
          for (var j = 1; j < L; j++) {
            // age 0 = newest segment; dying walkers age as a whole
            var age = (L - 1 - j) + wk.dead;
            var band = BANDS - 1 - Math.floor((age / TRAIL) * BANDS);
            if (band !== b) continue;
            ctx.moveTo(xs[j - 1] * SPACING, ys[j - 1] * SPACING);
            ctx.lineTo(xs[j] * SPACING, ys[j] * SPACING);
            any = true;
          }
        }
        if (any) {
          ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.07 + 0.78 * ((b + 1) / BANDS)).toFixed(3) + ')';
          ctx.stroke();
        }
      }
    }

    // Glowing heads on live walkers
    for (var k = 0; k < walkers.length; k++) {
      var hw = walkers[k];
      if (hw.dead > 0) continue;
      var hx = hw.xs[hw.xs.length - 1] * SPACING, hy = hw.ys[hw.ys.length - 1] * SPACING;
      var col = PALETTE[hw.color][0];
      ctx.fillStyle = 'rgba(' + col + ',0.16)';
      ctx.fillRect(hx - 5, hy - 5, 10, 10);
      ctx.fillStyle = 'rgba(' + col + ',1)';
      ctx.fillRect(hx - 1.5, hy - 1.5, 3, 3);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(t) {
    raf = 0;
    if (!running) return;
    if (t - lastStep >= STEP_MS) {
      lastStep = t;
      step();
      draw();
    }
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

  // ── Interaction ─────────────────────────────────────────────
  function toLocal(e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    return { x: x, y: y };
  }

  if (!reduceMotion) {
    window.addEventListener('pointermove', function (e) { pointer = toLocal(e); }, { passive: true });
    document.addEventListener('pointerleave', function () { pointer = null; });
    window.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') pointer = null; });

    hero.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.term, a, button')) return;
      var p = toLocal(e);
      if (!p) return;
      var extras = 0;
      for (var i = 0; i < walkers.length; i++) if (walkers[i].extra && !walkers[i].dead) extras++;
      var gx = Math.round(p.x / SPACING), gy = Math.round(p.y / SPACING);
      for (var n = 0; n < BURST && extras < MAX_EXTRA; n++, extras++) {
        walkers.push(makeWalker(gx, gy, true));
      }
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
      // Ignore height-only changes (mobile URL bar showing/hiding)
      var width = canvas.getBoundingClientRect().width;
      if (Math.abs(width - lastWidth) < 1) return;
      lastWidth = width;
      resize();
    }, 150);
  });

  lastWidth = canvas.getBoundingClientRect().width;
  resize();
  start();
})();
