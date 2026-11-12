/*
 * Graph figures for long pages.
 *
 * Splits the prose into sections at each h1/h2, and gives every
 * "## section" a small figure: a classic graph that animates one of
 * its properties when it scrolls into view (a Hamiltonian cycle, an
 * Eulerian circuit, a colouring, ...). The animation rests, fades,
 * and replays while the figure is on screen; clicking replays it.
 *
 * The page chooses and orders the graphs with front matter, e.g.
 *   graphs: [petersen, dodecahedron, k5]
 * otherwise they're used in the default order below.
 *
 * Must run before js/site.js (which reveals sections on scroll), so
 * head.html loads it first.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-graphs]');
  if (!root || !document.createElementNS) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var NS = 'http://www.w3.org/2000/svg';
  var SIZE = 200, PAD = 16;
  var HOLD_MS = 3200, RESET_MS = 1100;

  var BLUE = [118, 178, 232], PURPLE = [150, 128, 232];
  var PALETTE = [                      // vertex colour classes
    { fill: '#d3e8fb', stroke: '#6ea8dc' },
    { fill: '#e0d8fb', stroke: '#8f7be0' },
    { fill: '#f8dcea', stroke: '#d68ab3' }
  ];
  var ROSE = '#d68ab3';

  // ── Small helpers ───────────────────────────────────────────
  function mixRGB(t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return [0, 1, 2].map(function (k) { return Math.round(BLUE[k] + (PURPLE[k] - BLUE[k]) * t); });
  }
  function rgb(c, a) { return a == null ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + a + ')'; }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function ring(n, r, startDeg) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = (startDeg + 360 * i / n) * Math.PI / 180;
      out.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return out;
  }

  function el(name, attrs) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]);
    return node;
  }

  // Adjacency as lists of edge indices, so multigraphs work too.
  function incidence(g) {
    var inc = g.v.map(function () { return []; });
    g.e.forEach(function (e, i) { inc[e[0]].push(i); inc[e[1]].push(i); });
    return inc;
  }
  function other(e, v) { return e[0] === v ? e[1] : e[0]; }

  // ── The graphs ──────────────────────────────────────────────
  // make() returns { v: [[x, y]...], e: [[a, b, bend?]...], vr }
  // plan(g) returns the animation steps:
  //   { edge: i, from: v }        trace edge i starting at v
  //   { vertex: v, cls: k }       colour vertex v with PALETTE[k]
  //   { label: v, text: '3' }     write a label on v
  //   { ring: v }                 circle v
  //   { miss: i }                 mark edge i as left over
  var GRAPHS = {

    petersen: {
      name: 'Petersen graph',
      note: '3-regular with girth 5. Three colours suffice for its vertices &mdash; yet it has no Hamiltonian cycle.',
      hint: 'a proper 3-colouring',
      ms: 420,
      make: function () {
        var v = ring(5, 1, -90).concat(ring(5, 0.5, -90)), e = [];
        for (var i = 0; i < 5; i++) {
          e.push([i, (i + 1) % 5], [i, i + 5], [5 + i, 5 + (i + 2) % 5]);
        }
        return { v: v, e: e, vr: 6 };
      },
      plan: function (g) {
        var n = g.v.length, inc = incidence(g), col = [], order = shuffle(range(n));
        for (var i = 0; i < n; i++) col[i] = -1;
        var classes = shuffle([0, 1, 2]);
        (function solve(k) {
          if (k === n) return true;
          var v = order[k];
          for (var c = 0; c < 3; c++) {
            var ok = inc[v].every(function (ei) { return col[other(g.e[ei], v)] !== classes[c]; });
            if (!ok) continue;
            col[v] = classes[c];
            if (solve(k + 1)) return true;
            col[v] = -1;
          }
          return false;
        })(0);
        return order.map(function (v) { return { vertex: v, cls: col[v] }; });
      }
    },

    dodecahedron: {
      name: 'Dodecahedral graph',
      note: 'Hamilton&rsquo;s Icosian game (1857): visit all 20 vertices once and return home &mdash; a Hamiltonian cycle.',
      hint: 'a Hamiltonian cycle',
      ms: 260,
      make: function () {
        var a = ring(5, 1, -90), b = ring(5, 0.68, -90), c = ring(5, 0.54, -54), d = ring(5, 0.3, -54);
        var v = a.concat(b, c, d), e = [];
        for (var i = 0; i < 5; i++) {
          var j = (i + 1) % 5;
          e.push([i, j], [i, 5 + i], [5 + i, 10 + i], [10 + i, 5 + j], [10 + i, 15 + i], [15 + i, 15 + j]);
        }
        return { v: v, e: e, vr: 4.2 };
      },
      plan: function (g) { return cycleSteps(g, hamiltonCycle(g)); }
    },

    k5: {
      name: 'K<sub>5</sub>',
      note: 'Every vertex has even degree, so an Eulerian circuit crosses each edge exactly once.',
      hint: 'an Eulerian circuit',
      ms: 480,
      make: function () {
        var v = ring(5, 1, -90), e = [];
        for (var i = 0; i < 5; i++) for (var j = i + 1; j < 5; j++) e.push([i, j]);
        return { v: v, e: e, vr: 6 };
      },
      plan: function (g) { return eulerSteps(g); }
    },

    wilson: {
      name: 'A uniform spanning tree',
      note: 'Wilson&rsquo;s algorithm: loop-erased random walks, each stopping when it hits the tree, give every spanning tree equal chance.',
      hint: 'a new tree every time',
      ms: 150,
      make: function () {
        var N = 6, v = [], e = [];
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) v.push([x, y]);
        for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
          if (x + 1 < N) e.push([y * N + x, y * N + x + 1]);
          if (y + 1 < N) e.push([y * N + x, (y + 1) * N + x]);
        }
        return { v: v, e: e, vr: 3.4 };
      },
      plan: function (g) {
        var n = g.v.length, inc = incidence(g), inTree = [], next = [], steps = [];
        var rootV = (Math.random() * n) | 0;
        inTree[rootV] = true;
        steps.push({ vertex: rootV, cls: 1 });
        shuffle(range(n)).forEach(function (s) {
          var u = s;
          while (!inTree[u]) {                       // walk; later visits overwrite loops
            var ei = inc[u][(Math.random() * inc[u].length) | 0];
            next[u] = ei;
            u = other(g.e[ei], u);
          }
          var path = [];
          for (u = s; !inTree[u]; u = other(g.e[next[u]], u)) {
            inTree[u] = true;
            path.push({ edge: next[u], from: other(g.e[next[u]], u) });
          }
          steps = steps.concat(path.reverse());       // grow outward from the tree
        });
        return steps;
      }
    },

    heawood: {
      name: 'Heawood graph',
      note: 'The incidence graph of the Fano plane: 3-regular, girth 6, and bipartite &mdash; breadth-first search 2-colours it.',
      hint: 'BFS layers alternate colours',
      ms: 230,
      make: function () {
        var v = ring(14, 1, -90), e = [];
        for (var i = 0; i < 14; i++) {
          e.push([i, (i + 1) % 14]);
          if (i % 2 === 0) e.push([i, (i + 5) % 14]);
        }
        return { v: v, e: e, vr: 5 };
      },
      plan: function (g) {
        var inc = incidence(g), start = (Math.random() * g.v.length) | 0;
        var depth = [], queue = [start], steps = [{ vertex: start, cls: 0 }];
        depth[start] = 0;
        while (queue.length) {
          var u = queue.shift();
          inc[u].forEach(function (ei) {
            var w = other(g.e[ei], u);
            if (depth[w] != null) return;
            depth[w] = depth[u] + 1;
            queue.push(w);
            steps.push({ edge: ei, from: u }, { vertex: w, cls: depth[w] % 2 });
          });
        }
        return steps;
      }
    },

    konigsberg: {
      name: 'Bridges of K&ouml;nigsberg',
      note: 'Four land masses, seven bridges, and every vertex of odd degree &mdash; so no walk crosses each bridge once (Euler, 1736).',
      hint: 'the longest walk misses one bridge',
      ms: 520,
      make: function () {
        // north bank, south bank, Kneiphof island, east island
        var v = [[-0.15, -1], [-0.15, 1], [-0.5, 0], [0.8, 0]];
        var e = [[0, 2, 0.2], [0, 2, -0.2], [1, 2, 0.2], [1, 2, -0.2], [0, 3, 0.12], [1, 3, -0.12], [2, 3, 0]];
        return { v: v, e: e, vr: 8.5 };
      },
      plan: function (g) {
        var inc = incidence(g), used = [], best = null;
        function dfs(v, trail) {
          if (!best || trail.length > best.length) best = trail.slice();
          shuffle(inc[v].slice()).forEach(function (ei) {
            if (used[ei]) return;
            used[ei] = true;
            trail.push({ edge: ei, from: v });
            dfs(other(g.e[ei], v), trail);
            trail.pop();
            used[ei] = false;
          });
        }
        shuffle(range(g.v.length)).forEach(function (s) { dfs(s, []); });
        var hit = [];
        best.forEach(function (s) { hit[s.edge] = true; });
        var steps = best.slice();
        g.e.forEach(function (e, i) { if (!hit[i]) steps.push({ miss: i }); });
        inc.forEach(function (list, v) {
          steps.push({ label: v, text: String(list.length) }, { ring: v });
        });
        return steps;
      }
    },

    q4: {
      name: 'Hypercube Q<sub>4</sub>',
      note: 'Vertices are 4-bit strings, edges flip one bit. The reflected Gray code walks a Hamiltonian cycle through all 16.',
      hint: '0000 &rarr; 0001 &rarr; 0011 &rarr; &hellip;',
      ms: 300,
      make: function () {
        // project the 4 axes onto directions 45 degrees apart
        var dirs = [0, 1, 2, 3].map(function (k) {
          var t = (k * 45 - 67.5) * Math.PI / 180;
          return [Math.cos(t), Math.sin(t)];
        });
        var v = [], e = [];
        for (var m = 0; m < 16; m++) {
          var x = 0, y = 0;
          for (var b = 0; b < 4; b++) if (m & (1 << b)) { x += dirs[b][0]; y += dirs[b][1]; }
          v.push([x, y]);
        }
        for (m = 0; m < 16; m++) for (b = 0; b < 4; b++) if (m < (m ^ (1 << b))) e.push([m, m ^ (1 << b)]);
        return { v: v, e: e, vr: 4 };
      },
      plan: function (g) {
        var cyc = [];
        for (var i = 0; i < 16; i++) cyc.push(i ^ (i >> 1));
        var shift = (Math.random() * 16) | 0;
        cyc = cyc.slice(shift).concat(cyc.slice(0, shift));
        cyc.push(cyc[0]);
        return cycleSteps(g, cyc);
      }
    }
  };

  var DEFAULT_ORDER = ['petersen', 'dodecahedron', 'k5', 'wilson', 'heawood', 'konigsberg', 'q4'];

  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }

  function edgeIndex(g) {
    var map = {};
    g.e.forEach(function (e, i) { map[e[0] + ',' + e[1]] = i; map[e[1] + ',' + e[0]] = i; });
    return map;
  }

  function cycleSteps(g, cyc) {
    var idx = edgeIndex(g), steps = [];
    for (var i = 0; i + 1 < cyc.length; i++) steps.push({ edge: idx[cyc[i] + ',' + cyc[i + 1]], from: cyc[i] });
    return steps;
  }

  // Backtracking search for a Hamiltonian cycle (fine for 20 vertices).
  function hamiltonCycle(g) {
    var n = g.v.length, inc = incidence(g), seen = [], path = [];
    var start = (Math.random() * n) | 0;
    (function extend(u) {
      path.push(u); seen[u] = true;
      if (path.length === n) {
        if (inc[u].some(function (ei) { return other(g.e[ei], u) === start; })) return true;
      } else {
        var nb = shuffle(inc[u].map(function (ei) { return other(g.e[ei], u); }));
        for (var k = 0; k < nb.length; k++) if (!seen[nb[k]] && extend(nb[k])) return true;
      }
      path.pop(); seen[u] = false;
      return false;
    })(start);
    path.push(start);
    return path;
  }

  // Hierholzer's algorithm.
  function eulerSteps(g) {
    var inc = incidence(g).map(shuffle), used = [], stack = [{ v: 0, via: null }], out = [];
    while (stack.length) {
      var top = stack[stack.length - 1], v = top.v, list = inc[v];
      while (list.length && used[list[list.length - 1]]) list.pop();
      if (list.length) {
        var ei = list.pop();
        used[ei] = true;
        stack.push({ v: other(g.e[ei], v), via: ei });
      } else {
        stack.pop();
        if (top.via != null) out.push({ edge: top.via, from: top.v });
      }
    }
    // `out` is the circuit in reverse; flip it so each edge starts
    // where the previous one ended.
    return out.reverse().map(function (s) { return { edge: s.edge, from: other(g.e[s.edge], s.from) }; });
  }

  // ── Drawing ─────────────────────────────────────────────────
  function layout(g) {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    g.v.forEach(function (p) {
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    });
    var span = Math.max(maxX - minX, maxY - minY) || 1;
    var s = (SIZE - 2 * PAD) / span;
    var ox = (SIZE - (maxX - minX) * s) / 2, oy = (SIZE - (maxY - minY) * s) / 2;
    return g.v.map(function (p) { return [ox + (p[0] - minX) * s, oy + (p[1] - minY) * s]; });
  }

  // Path for edge e drawn from vertex `from`; returns [d, length].
  function edgeGeom(P, e, from) {
    var a = P[e[0]], b = P[e[1]];
    if (from === e[1]) { var t = a; a = b; b = t; }
    var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
    var bend = e[2] || 0;
    if (!bend) return ['M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1), len];
    if (from === e[1]) bend = -bend;       // keep the curve on the same side
    var cx = (a[0] + b[0]) / 2 - dy * bend * 2, cy = (a[1] + b[1]) / 2 + dx * bend * 2;
    var L = 0, px = a[0], py = a[1];
    for (var i = 1; i <= 20; i++) {         // approximate the curve's length
      var u = i / 20, qx = (1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * cx + u * u * b[0];
      var qy = (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * cy + u * u * b[1];
      L += Math.sqrt((qx - px) * (qx - px) + (qy - py) * (qy - py)); px = qx; py = qy;
    }
    return ['M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1), L];
  }

  function plainText(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent;
  }

  function buildFigure(id, number) {
    var spec = GRAPHS[id], g = spec.make(), P = layout(g);
    var fig = document.createElement('figure');
    fig.className = 'gfig';
    fig.setAttribute('tabindex', '0');

    var svg = el('svg', { 'class': 'gfig__svg', viewBox: '0 0 ' + SIZE + ' ' + SIZE, role: 'img',
                          'aria-label': plainText(spec.name + '. ' + spec.note) });
    var base = el('g', {}), hi = el('g', { 'class': 'g-hi-layer' }), marks = el('g', {}),
        verts = el('g', {}), labels = el('g', {});
    g.e.forEach(function (e) {
      base.appendChild(el('path', { 'class': 'g-edge', d: edgeGeom(P, e, e[0])[0] }));
    });
    var circles = P.map(function (p) {
      var c = el('circle', { 'class': 'g-vert', cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: g.vr });
      verts.appendChild(c);
      return c;
    });
    svg.appendChild(base); svg.appendChild(hi); svg.appendChild(marks);
    svg.appendChild(verts); svg.appendChild(labels);

    var cap = document.createElement('figcaption');
    cap.className = 'gfig__cap';
    cap.innerHTML =
      '<span class="gfig__no">fig. ' + number + '</span>' +
      '<span class="gfig__name">' + spec.name + '</span>' +
      '<span class="gfig__note">' + spec.note + '</span>' +
      '<span class="gfig__hint">' + spec.hint + ' &middot; click to replay</span>';

    fig.appendChild(svg);
    fig.appendChild(cap);

    var state = { fig: fig, spec: spec, g: g, P: P, hi: hi, marks: marks, labels: labels,
                  circles: circles, timers: [], playing: false, visible: false };
    fig.addEventListener('click', function () { play(state); });
    fig.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(state); }
    });
    return state;
  }

  function clearTimers(st) {
    st.timers.forEach(window.clearTimeout);
    st.timers = [];
  }

  function reset(st) {
    st.hi.style.opacity = '';
    [st.hi, st.marks, st.labels].forEach(function (layer) {
      while (layer.firstChild) layer.removeChild(layer.firstChild);
    });
    st.circles.forEach(function (c) { c.style.fill = ''; c.style.stroke = ''; });
  }

  function paintVertex(st, v, fill, stroke) {
    st.circles[v].style.fill = fill;
    st.circles[v].style.stroke = stroke;
  }

  function apply(st, s, i, total, instant) {
    var g = st.g, P = st.P;
    if (s.edge != null) {
      var col = mixRGB(total > 1 ? i / (total - 1) : 0);
      var geom = edgeGeom(P, g.e[s.edge], s.from);
      var path = el('path', { 'class': 'g-hi', d: geom[0], stroke: rgb(col) });
      st.hi.appendChild(path);
      var to = other(g.e[s.edge], s.from);
      if (!st.circles[s.from].style.stroke) paintVertex(st, s.from, rgb(col, 0.25), rgb(col));
      if (instant) {
        paintVertex(st, to, rgb(col, 0.25), rgb(col));
        return;
      }
      var len = geom[1] + 1, dur = Math.max(st.spec.ms * 1.5, 420);
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.getBoundingClientRect();           // commit the start state
      path.style.transition = 'stroke-dashoffset ' + dur + 'ms cubic-bezier(.3,.6,.3,1)';
      path.style.strokeDashoffset = '0';
      st.timers.push(window.setTimeout(function () {
        // tint on arrival, unless the plan has coloured it already
        if (!st.circles[to].style.stroke) paintVertex(st, to, rgb(col, 0.25), rgb(col));
      }, dur * 0.7));
    } else if (s.vertex != null) {
      paintVertex(st, s.vertex, PALETTE[s.cls].fill, PALETTE[s.cls].stroke);
    } else if (s.miss != null) {
      var mg = edgeGeom(P, g.e[s.miss], g.e[s.miss][0]);
      var miss = el('path', { 'class': 'g-hi', d: mg[0], stroke: ROSE, 'stroke-dasharray': '3 5' });
      miss.style.strokeWidth = '2';
      st.marks.appendChild(miss);
    } else if (s.label != null) {
      var p = P[s.label];
      var text = el('text', { 'class': 'g-label', x: p[0].toFixed(1), y: (p[1] + 0.5).toFixed(1) });
      text.textContent = s.text;
      st.labels.appendChild(text);
      if (+s.text % 2) paintVertex(st, s.label, PALETTE[2].fill, PALETTE[2].stroke);
    } else if (s.ring != null) {
      var q = P[s.ring];
      st.marks.appendChild(el('circle', { 'class': 'g-ring', cx: q[0].toFixed(1), cy: q[1].toFixed(1),
                                          r: st.g.vr + 4, stroke: ROSE, opacity: 0.6 }));
    }
  }

  function play(st) {
    clearTimers(st);
    reset(st);
    var steps = st.spec.plan(st.g);
    var edges = 0;
    steps.forEach(function (s) { s.n = edges; if (s.edge != null) edges++; });  // colour by edge order
    if (reduceMotion) {
      steps.forEach(function (s) { apply(st, s, s.n, edges, true); });
      return;
    }
    st.playing = true;
    steps.forEach(function (s, i) {
      st.timers.push(window.setTimeout(function () { apply(st, s, s.n, edges, false); }, 350 + i * st.spec.ms));
    });
    var end = 350 + steps.length * st.spec.ms + 900 + HOLD_MS;
    st.timers.push(window.setTimeout(function () {
      if (!st.visible) { st.playing = false; return; }   // replay when it's next on screen
      st.hi.style.opacity = '0';
      st.circles.forEach(function (c) { c.style.fill = ''; c.style.stroke = ''; });
      [st.marks, st.labels].forEach(function (l) { while (l.firstChild) l.removeChild(l.firstChild); });
      st.timers.push(window.setTimeout(function () { play(st); }, RESET_MS));
    }, end));
  }

  // ── Wrap sections and attach figures ────────────────────────
  var wanted = (root.getAttribute('data-graphs') || '').split(/\s+/).filter(function (id) { return GRAPHS[id]; });
  if (!wanted.length) wanted = DEFAULT_ORDER;

  var groups = [], current = null;
  Array.prototype.slice.call(root.children).forEach(function (node) {
    if (node.tagName === 'H1' || node.tagName === 'H2') {
      current = { head: node, rest: [] };
      groups.push(current);
    } else if (current) {
      current.rest.push(node);
    }
  });
  if (!groups.length) return;

  var figures = [], count = 0;
  groups.forEach(function (grp) {
    var section = document.createElement('div');
    section.className = 'g-section';
    root.insertBefore(section, grp.head);
    section.appendChild(grp.head);
    if (grp.head.tagName === 'H2') {
      var st = buildFigure(wanted[count % wanted.length], count + 1);
      count++;
      figures.push(st);
      section.appendChild(st.fig);
    }
    var body = document.createElement('div');
    body.className = 'g-section__body';
    grp.rest.forEach(function (node) { body.appendChild(node); });
    section.appendChild(body);
  });
  root.classList.add('has-graphs');

  if (reduceMotion) {
    figures.forEach(play);
    return;
  }

  // Play figures as they come into view (plain scroll check, like
  // the reveal in site.js, so nothing depends on observers firing).
  var queued = false;
  function check() {
    queued = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    figures.forEach(function (st) {
      var r = st.fig.getBoundingClientRect();
      st.visible = r.bottom > vh * 0.08 && r.top < vh * 0.88;
      if (st.visible && !st.playing) play(st);
    });
  }
  function onScroll() {
    if (!queued) { queued = true; window.requestAnimationFrame(check); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  check();
})();
