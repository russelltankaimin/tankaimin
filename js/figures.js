/*
 * Background figures for long pages.
 *
 * Large, soft drawings of mathematical objects fill both margins of
 * the page, staggered down the left and right sides: graphs (Petersen,
 * Cayley, max-flow min-cut, ...), geometry and topology (Klein bottle,
 * Kakeya needle, Hopf fibration, ...) and some AI (attention, gradient
 * descent, alpha-beta pruning, ...). Each animates one of its
 * properties when it scrolls into view, rests, fades, and replays.
 *
 * Which figures appear: the page's front matter list comes first, e.g.
 *   graphs: [petersen, klein, attention]
 * and every other figure follows in a random order, so each visit
 * shows a different selection.
 *
 * Must run before js/site.js (which reveals content on scroll), so
 * head.html loads it first.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-graphs]');
  if (!root || !document.createElementNS) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var NS = 'http://www.w3.org/2000/svg';
  var SIZE = 200, PAD = 12;
  var START_MS = 350, HOLD_MS = 4200, RESET_MS = 1400;
  var VR_SCALE = 0.72;               // vertex radius relative to the specs below

  var BLUE = [92, 158, 222], PURPLE = [124, 100, 218], ROSE = [206, 116, 166], INK = [112, 104, 160];
  var PALETTE = [                      // vertex colour classes
    { fill: '#c7e0f7', stroke: '#5c9ede' },
    { fill: '#d6ccf7', stroke: '#7c64da' },
    { fill: '#f4cfe2', stroke: '#ce74a6' }
  ];

  var TAU = Math.PI * 2;

  // -- Small helpers -------------------------------------------
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
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function gauss() { return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random()); }

  function ring(n, r, startDeg) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = (startDeg + 360 * i / n) * Math.PI / 180;
      out.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return out;
  }

  // Points fn(t) for t from a to b in n steps.
  function sample(fn, a, b, n) {
    var out = [];
    for (var i = 0; i <= n; i++) out.push(fn(a + (b - a) * i / n));
    return out;
  }
  function circlePts(cx, cy, r, n) {
    return sample(function (t) { return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; }, 0, TAU, n || 64);
  }

  // Split a polyline into n consecutive pieces (sharing endpoints).
  function chunks(pts, n) {
    var out = [], per = (pts.length - 1) / n;
    for (var i = 0; i < n; i++) {
      out.push(pts.slice(Math.round(i * per), Math.round((i + 1) * per) + 1));
    }
    return out;
  }

  // Orthographic view of a 3D point [x, y, z] with y up: turn by
  // `yaw` about the vertical, tilt by `pitch` towards the viewer.
  // Returns [screen x, screen y (down), depth towards the viewer].
  function viewY(yaw, pitch) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    return function (p) {
      var x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy;
      return [x1, -(p[1] * cp - z1 * sp), p[1] * sp + z1 * cp];
    };
  }
  function zUp(p) { return [p[0], p[2], p[1]]; }   // (x, y, z) with z up -> y up
  function flat(p) { return [p[0], p[1]]; }

  // Parts of a projected 3D curve that face the viewer.
  function frontPieces(pts3, view) {
    var out = [], cur = [];
    pts3.forEach(function (p) {
      var q = view(p);
      if (q[2] >= -0.02) cur.push(flat(q));
      else if (cur.length) { if (cur.length > 1) out.push(cur); cur = []; }
    });
    if (cur.length > 1) out.push(cur);
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
    return out.reverse().map(function (s) { return { edge: s.edge, from: other(g.e[s.edge], s.from) }; });
  }

  // A geodesic of the Poincare disk between boundary angles a and b.
  function geodesic(a, b) {
    var m = (a + b) / 2, d = Math.abs(b - a) / 2;
    var cx = Math.cos(m) / Math.cos(d), cy = Math.sin(m) / Math.cos(d), r = Math.tan(d);
    var A = Math.atan2(Math.sin(a) - cy, Math.cos(a) - cx), B = Math.atan2(Math.sin(b) - cy, Math.cos(b) - cx);
    var diff = B - A;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    return sample(function (t) { return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; }, A, A + diff, 48);
  }

  // -- The figures ---------------------------------------------
  // make() returns the scene:
  //   v: [[x, y]...]        vertices        e: [[a, b, bend?]...]  edges
  //   vr                    vertex radius   curves: [[[x, y]...]...] faint lines
  //   vlabels: [[v, text]]  elabels: [[edge, text]]
  //   pts / bounds          extra points (or a box) to fit in view
  //   hideEdges / hideVerts don't draw these in the resting picture
  // plan(g) returns the animation steps:
  //   { edge: i, from: v }        trace edge i starting at v
  //   { curve: pts } / { pieces: [pts...] }   draw a polyline (arrow: true for a head)
  //   { vertex: v, cls: k }       colour vertex v with PALETTE[k]
  //   { dot: [x, y], r }          a filled point
  //   { text: [x, y], str }       a label at a point
  //   { label: v, text }          a label on vertex v
  //   { ring: v }                 circle vertex v
  //   { miss: i }                 mark edge i, dashed
  // Steps may also set col ([r, g, b]), w (width), op (opacity),
  // dur (drawing time), wait (time to the next step) and linear.
  var FIGS = {

    // ---------------------------------------------------- graphs
    petersen: {
      name: 'Petersen graph',
      hint: 'a proper 3-colouring',
      note: '3-regular with girth 5. Three colours suffice for its vertices &mdash; yet it has no Hamiltonian cycle.',
      ms: 420,
      make: function () {
        var v = ring(5, 1, -90).concat(ring(5, 0.5, -90)), e = [];
        for (var i = 0; i < 5; i++) e.push([i, (i + 1) % 5], [i, i + 5], [5 + i, 5 + (i + 2) % 5]);
        return { v: v, e: e, vr: 6 };
      },
      plan: function (g) {
        var n = g.v.length, inc = incidence(g), col = [], order = shuffle(range(n)), classes = shuffle([0, 1, 2]);
        for (var i = 0; i < n; i++) col[i] = -1;
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
      hint: 'a Hamiltonian cycle',
      note: 'Hamilton&rsquo;s Icosian game (1857): visit all 20 vertices once and return home.',
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
      hint: 'an Eulerian circuit',
      note: 'Every vertex has even degree, so a circuit can cross each edge exactly once.',
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
      hint: 'a new tree every time',
      note: 'Wilson&rsquo;s algorithm: loop-erased random walks, each stopping when it hits the tree, give every spanning tree an equal chance.',
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
      hint: 'breadth-first layers alternate colours',
      note: 'The incidence graph of the Fano plane: 3-regular, girth 6, and bipartite.',
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
      hint: 'the longest walk misses one bridge',
      note: 'Four land masses, seven bridges, every vertex of odd degree &mdash; so no walk crosses each bridge once (Euler, 1736).',
      ms: 520,
      make: function () {
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
          steps.push({ label: v, text: String(list.length) }, { vertex: v, cls: 2, wait: 0 }, { ring: v });
        });
        return steps;
      }
    },

    q4: {
      name: 'Hypercube Q<sub>4</sub>',
      hint: 'a Gray-code Hamiltonian cycle',
      note: 'Vertices are 4-bit strings and edges flip one bit; the reflected Gray code visits all 16 in a cycle.',
      ms: 300,
      make: function () {
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
    },

    cayley: {
      name: 'Cayley graph of the free group F<sub>2</sub>',
      hint: 'words grow one letter at a time',
      note: 'Every reduced word in a, b and their inverses is a vertex; edges multiply by a generator. A 4-regular tree, drawn with each generation half the size.',
      ms: 36,
      make: function () {
        var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];   // a, b, a^-1, b^-1
        var v = [[0, 0]], e = [], gen = [], queue = [{ id: 0, last: -1, depth: 0 }];
        while (queue.length) {
          var q = queue.shift();
          if (q.depth === 4) continue;
          var len = Math.pow(0.5, q.depth);
          for (var k = 0; k < 4; k++) {
            if (q.last >= 0 && k === (q.last + 2) % 4) continue;   // never undo the last letter
            var p = v[q.id], id = v.length;
            v.push([p[0] + dirs[k][0] * len, p[1] + dirs[k][1] * len]);
            e.push([q.id, id]);
            gen.push(k % 2);
            queue.push({ id: id, last: k, depth: q.depth + 1 });
          }
        }
        return { v: v, e: e, vr: 2, gen: gen };
      },
      plan: function (g) {
        return g.e.map(function (e, i) { return { edge: i, from: e[0], col: g.gen[i] ? PURPLE : BLUE }; });
      }
    },

    bipartite: {
      name: 'Bipartite matching',
      hint: 'a maximum matching and a minimum cover',
      note: 'Augmenting paths find a largest matching (bold). By K&#337;nig&rsquo;s theorem it is exactly as large as the smallest set of vertices touching every edge (circled).',
      ms: 380,
      make: function () {
        var n = 5, v = [], e = [];
        for (var i = 0; i < n; i++) v.push([0, i * 0.8]);
        for (i = 0; i < n; i++) v.push([2, i * 0.8]);
        for (i = 0; i < n; i++) {
          shuffle(range(n)).slice(0, 1 + ((Math.random() * 3) | 0)).forEach(function (j) { e.push([i, n + j]); });
        }
        return { v: v, e: e, vr: 6, n: n };
      },
      plan: function (g) {
        var n = g.n, inc = incidence(g), matchR = {}, matchL = {}, steps = [], u;
        for (u = 0; u < 2 * n; u++) steps.push({ vertex: u, cls: u < n ? 0 : 1, wait: 70 });
        function kuhn(x, seen) {
          for (var k = 0; k < inc[x].length; k++) {
            var ei = inc[x][k], w = other(g.e[ei], x);
            if (seen[w]) continue;
            seen[w] = true;
            if (matchR[w] == null || kuhn(other(g.e[matchR[w]], w), seen)) { matchR[w] = ei; return true; }
          }
          return false;
        }
        for (u = 0; u < n; u++) kuhn(u, {});
        Object.keys(matchR).forEach(function (w) { matchL[other(g.e[matchR[w]], +w)] = matchR[w]; });
        shuffle(Object.keys(matchR)).forEach(function (w) {
          steps.push({ edge: matchR[w], from: other(g.e[matchR[w]], +w), w: 3.2 });
        });
        // Koenig: vertices reachable from unmatched left vertices by alternating paths
        var Z = {}, stack = [];
        for (u = 0; u < n; u++) if (matchL[u] == null) { Z[u] = true; stack.push(u); }
        while (stack.length) {
          var x = stack.pop();
          if (x < n) {
            inc[x].forEach(function (ei) {
              if (ei === matchL[x]) return;
              var y = other(g.e[ei], x);
              if (!Z[y]) { Z[y] = true; stack.push(y); }
            });
          } else if (matchR[x] != null) {
            var y2 = other(g.e[matchR[x]], x);
            if (!Z[y2]) { Z[y2] = true; stack.push(y2); }
          }
        }
        for (u = 0; u < 2 * n; u++) if ((u < n && !Z[u]) || (u >= n && Z[u])) steps.push({ ring: u });
        return steps;
      }
    },

    maxflow: {
      name: 'Max-flow min-cut',
      hint: 'augmenting paths, then the cut',
      note: 'Push flow from s to t along shortest augmenting paths until none remain. The saturated edges across the cut (dashed) carry exactly the maximum flow.',
      ms: 360,
      make: function () {
        var v = [[0, 1], [1, 0], [1, 2], [2, 0], [2, 2], [3, 1]];
        var e = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [3, 5], [4, 5]];
        var cap = [3, 2, 1, 2, 3, 1, 2, 3];
        return { v: v, e: e, vr: 8, cap: cap, pts: [[1.5, 2.55]],
                 vlabels: [[0, 's'], [5, 't']],
                 elabels: e.map(function (x, i) { return [i, String(cap[i])]; }) };
      },
      plan: function (g) {
        var n = g.v.length, flow = g.e.map(function () { return 0; }), steps = [], k = 0, prev;
        var colours = [BLUE, PURPLE, INK];
        for (;;) {
          prev = []; prev[0] = { from: -1 };
          var q = [0];
          while (q.length && !prev[n - 1]) {
            var u = q.shift();
            g.e.forEach(function (ed, i) {
              if (ed[0] === u && !prev[ed[1]] && flow[i] < g.cap[i]) { prev[ed[1]] = { e: i, fwd: true, from: u }; q.push(ed[1]); }
              if (ed[1] === u && !prev[ed[0]] && flow[i] > 0) { prev[ed[0]] = { e: i, fwd: false, from: u }; q.push(ed[0]); }
            });
          }
          if (!prev[n - 1]) break;
          var path = [], x = n - 1, b = Infinity;
          while (x !== 0) {
            var p = prev[x];
            path.unshift(p);
            b = Math.min(b, p.fwd ? g.cap[p.e] - flow[p.e] : flow[p.e]);
            x = p.from;
          }
          path.forEach(function (p) {
            flow[p.e] += p.fwd ? b : -b;
            steps.push({ edge: p.e, from: p.from, col: colours[k % 3], w: 1.4 + b * 0.6 });
          });
          steps[steps.length - 1].wait = 900;
          k++;
        }
        var value = 0;
        g.e.forEach(function (ed, i) {
          if (ed[0] === 0) value += flow[i];
          if (prev[ed[0]] && !prev[ed[1]]) steps.push({ miss: i, wait: 200 });
        });
        steps.push({ text: [1.5, 2.55], str: 'max flow = min cut = ' + value, size: 8 });
        return steps;
      }
    },

    seriesParallel: {
      name: 'A series&ndash;parallel graph',
      hint: 'built from series and parallel joins',
      note: 'Start from single edges and repeatedly join graphs end to end or side by side. These are exactly the graphs with no K<sub>4</sub> minor, and many hard problems become easy on them.',
      ms: 280,
      make: function () {
        var v = [[0, 0.6], [2, 0.6]], e = [];
        function build(s, t, x0, x1, y0, y1, depth, type) {
          if (depth === 0 || (depth < 3 && Math.random() < 0.22)) {
            var mid = (y0 + y1) / 2, line = (v[s][1] + v[t][1]) / 2;
            e.push([s, t, (mid - line) / (v[t][0] - v[s][0])]);
            return;
          }
          var k = Math.random() < 0.3 ? 3 : 2, i;
          if (type === 'P') {
            for (i = 0; i < k; i++) {
              build(s, t, x0, x1, y0 + (y1 - y0) * i / k, y0 + (y1 - y0) * (i + 1) / k, depth - 1, 'S');
            }
          } else {
            var ids = [s];
            for (i = 1; i < k; i++) { ids.push(v.length); v.push([x0 + (x1 - x0) * i / k, (y0 + y1) / 2]); }
            ids.push(t);
            for (i = 0; i < k; i++) {
              build(ids[i], ids[i + 1], x0 + (x1 - x0) * i / k, x0 + (x1 - x0) * (i + 1) / k, y0, y1, depth - 1, 'P');
            }
          }
        }
        build(0, 1, 0, 2, 0, 1.2, 3, 'P');
        return { v: v, e: e, vr: 4.5 };
      },
      plan: function (g) { return g.e.map(function (e, i) { return { edge: i, from: e[0] }; }); }
    },

    ramsey: {
      name: 'Ramsey number R(3, 3) = 6',
      hint: 'two colours, no one-colour triangle',
      note: 'The edges of K<sub>5</sub> split into two colours with no single-coloured triangle. With six vertices it is impossible: among any six people, three are mutual friends or mutual strangers.',
      ms: 380,
      make: function () {
        var v = ring(5, 1, -90), e = [];
        for (var i = 0; i < 5; i++) for (var j = i + 1; j < 5; j++) e.push([i, j]);
        return { v: v, e: e, vr: 6 };
      },
      plan: function (g) {
        return shuffle(range(g.e.length)).map(function (i) {
          var d = g.e[i][1] - g.e[i][0];
          return { edge: i, from: g.e[i][0], col: d === 1 || d === 4 ? BLUE : PURPLE, w: 2.2 };
        });
      }
    },

    // ------------------------------------- geometry and topology
    klein: {
      name: 'Klein bottle',
      hint: 'a surface with no inside',
      note: 'Join the ends of a tube with a flip and you get a closed surface with no inside or outside. In three dimensions it has to pass through itself.',
      ms: 140,
      make: function () {
        function K(u, w) {      // the classic "bottle" immersion, u in [0, pi], w in [0, 2pi]
          var cu = Math.cos(u), su = Math.sin(u), cw = Math.cos(w), sw = Math.sin(w);
          var c2 = cu * cu, c3 = c2 * cu, c4 = c2 * c2, c5 = c4 * cu, c6 = c4 * c2, c7 = c6 * cu;
          return [
            -2 / 15 * cu * (3 * cw - 30 * su + 90 * c4 * su - 60 * c6 * su + 5 * cu * cw * su),
            -1 / 15 * su * (3 * cw - 3 * c2 * cw - 48 * c4 * cw + 48 * c6 * cw - 60 * su + 5 * cu * cw * su -
                            5 * c3 * cw * su - 80 * c5 * cw * su + 80 * c7 * cw * su),
            2 / 15 * (3 + 5 * cu * su) * sw
          ];
        }
        var view = viewY(0.5, 0.35), rings = [], lines = [], i;
        for (i = 0; i <= 22; i++) {
          var u = Math.PI * i / 22;
          rings.push(sample(function (w) { return flat(view(K(u, w))); }, 0, TAU, 40));
        }
        for (i = 0; i < 12; i++) {
          var w0 = TAU * i / 12;
          lines.push(sample(function (u) { return flat(view(K(u, w0))); }, 0, Math.PI, 90));
        }
        return { curves: rings.concat(lines), rings: rings, lines: lines };
      },
      plan: function (g) {
        return g.rings.map(function (c) { return { curve: c, w: 1.2 }; })
          .concat(g.lines.map(function (c) { return { curve: c, w: 1.2, col: PURPLE }; }));
      }
    },

    trefoil: {
      name: 'Trefoil knot',
      hint: 'the (2, 3) torus knot',
      note: 'Wind twice around the hole of a torus while circling its tube three times: the simplest knot that can&rsquo;t be untied.',
      ms: 150,
      make: function () {
        var R = 1, r = 0.42, view = viewY(0.3, 0.95), curves = [], i;
        function T(phi, th) { return zUp([(R + r * Math.cos(th)) * Math.cos(phi), (R + r * Math.cos(th)) * Math.sin(phi), r * Math.sin(th)]); }
        for (i = 0; i < 24; i++) {
          var phi = TAU * i / 24;
          curves.push(sample(function (th) { return flat(view(T(phi, th))); }, 0, TAU, 28));
        }
        for (i = 0; i < 6; i++) {
          var th0 = TAU * i / 6;
          curves.push(sample(function (p) { return flat(view(T(p, th0))); }, 0, TAU, 72));
        }
        var knot = sample(function (t) { return flat(view(T(2 * t, 3 * t))); }, 0, TAU, 360);
        return { curves: curves, knot: knot };
      },
      plan: function (g) {
        return chunks(g.knot, 30).map(function (c) { return { curve: c, w: 2.4, dur: 180, linear: true }; });
      }
    },

    mobius: {
      name: 'M&ouml;bius strip',
      hint: 'one side, one edge',
      note: 'Follow the edge of the strip and you travel round twice before you are home: it has a single side and a single boundary circle.',
      ms: 140,
      make: function () {
        var W = 0.42, view = viewY(0.5, 0.8), curves = [];
        function M(t, s) { return zUp([(1 + s * Math.cos(t / 2)) * Math.cos(t), (1 + s * Math.cos(t / 2)) * Math.sin(t), s * Math.sin(t / 2)]); }
        for (var i = 0; i < 40; i++) {
          var t0 = TAU * i / 40;
          curves.push([flat(view(M(t0, -W))), flat(view(M(t0, W)))]);
        }
        curves.push(sample(function (t) { return flat(view(M(t, 0))); }, 0, TAU, 90));
        var edge = sample(function (t) { return flat(view(M(t, W))); }, 0, 2 * TAU, 400);
        return { curves: curves, edge: edge };
      },
      plan: function (g) {
        return chunks(g.edge, 32).map(function (c) { return { curve: c, w: 2.2, dur: 170, linear: true }; });
      }
    },

    kakeya: {
      name: 'Kakeya needle problem',
      hint: 'a needle turning inside a deltoid',
      note: 'A unit needle can turn all the way round inside a deltoid. Besicovitch showed the area needed can be made as small as you like.',
      ms: 160,
      make: function () {
        var deltoid = sample(function (t) { return [2 * Math.cos(t) + Math.cos(2 * t), 2 * Math.sin(t) - Math.sin(2 * t)]; }, 0, TAU, 180);
        return { curves: [deltoid] };
      },
      plan: function () {
        var steps = [], N = 36;
        for (var k = 0; k < N; k++) {
          var t = TAU * k / N, c = Math.cos(t), s = Math.sin(t), dx = 2 * Math.cos(t / 2), dy = -2 * Math.sin(t / 2);
          steps.push({ curve: [[c - dx, s - dy], [c + dx, s + dy]], w: 1.3, op: 0.85 });
        }
        return steps;
      }
    },

    elliptic: {
      name: 'Elliptic curve group law',
      hint: 'adding two points',
      note: 'On y<sup>2</sup> = x<sup>3</sup> &minus; x + 1, the line through P and Q meets the curve once more; reflecting that point gives P + Q.',
      ms: 520,
      make: function () {
        var x0 = -1.324718, f = function (x) { return Math.sqrt(Math.max(0, x * x * x - x + 1)); };
        var curve = sample(function (s) { var x = x0 + (2 - x0) * s * s; return [x, -f(x)]; }, 1, 0, 90)
          .concat(sample(function (s) { var x = x0 + (2 - x0) * s * s; return [x, f(x)]; }, 0, 1, 90));
        return { curves: [[[-1.7, 0], [2.3, 0]], [[0, -2.9], [0, 2.9]], curve], curve: curve };
      },
      plan: function (g) {
        // y is flipped for the screen: P = (-1, 1) is drawn at (-1, -1)
        return [
          { curve: g.curve, col: INK, w: 1.8, dur: 1500, wait: 1300 },
          { dot: [-1, -1], col: BLUE, r: 3.2 }, { text: [-1, -1], str: 'P', dx: -7, dy: -7 },
          { dot: [0, -1], col: BLUE, r: 3.2 }, { text: [0, -1], str: 'Q', dx: 5, dy: -7 },
          { curve: [[-1.6, -1], [1.7, -1]], col: BLUE, w: 1.3 },
          { dot: [1, -1], col: ROSE, r: 3 },
          { curve: [[1, -1], [1, 1]], col: ROSE, w: 1.3, dash: true },
          { dot: [1, 1], col: PURPLE, r: 3.4 }, { text: [1, 1], str: 'P + Q', dx: 16, dy: 0 }
        ];
      }
    },

    fano: {
      name: 'Fano plane',
      hint: 'seven points, seven lines',
      note: 'The smallest projective plane: every two points lie on one line and every two lines meet in one point. One of its lines has to be drawn as a circle.',
      ms: 420,
      make: function () {
        var v = [[0, -1], [-0.866, 0.5], [0.866, 0.5], [0, 0], [-0.433, -0.25], [0, 0.5], [0.433, -0.25]];
        var L = [[0, 4, 1], [1, 5, 2], [2, 6, 0], [0, 3, 5], [1, 3, 6], [2, 3, 4]];
        var lines = L.map(function (l) { return [v[l[0]], v[l[2]]]; });
        var circle = circlePts(0, 0, 0.5, 72);
        return { v: v, vr: 6, curves: lines.concat([circle]), lines: lines, circle: circle };
      },
      plan: function (g) {
        var steps = g.lines.map(function (l) { return { curve: l, w: 2 }; });
        steps.push({ curve: g.circle, col: ROSE, w: 2, dur: 1000 });
        return steps;
      }
    },

    hopf: {
      name: 'Hopf fibration',
      hint: 'circles over a sphere',
      note: 'The 3-sphere is a family of circles, one over each point of the 2-sphere, and any two of them link exactly once. Shown here by stereographic projection.',
      ms: 260,
      make: function () {
        var view = viewY(0.2, 1.3), fibres = [];
        // fibres over one circle of latitude: linked circles on a torus
        [Math.PI / 4].forEach(function (a) {
          for (var k = 0; k < 16; k++) {
            var phi = TAU * k / 16;
            fibres.push(sample(function (t) {
              var x1 = Math.cos(a) * Math.cos(t + phi), x2 = Math.cos(a) * Math.sin(t + phi);
              var x3 = Math.sin(a) * Math.cos(t), x4 = Math.sin(a) * Math.sin(t), d = 1 - x1;
              return flat(view([x3 / d, x2 / d, x4 / d]));
            }, 0, TAU, 72));
          }
        });
        return { curves: fibres, fibres: fibres };
      },
      plan: function (g) {
        return g.fibres.map(function (c) { return { curve: c, w: 1.6 }; });
      }
    },

    borromean: {
      name: 'Borromean rings',
      hint: 'linked, yet pairwise unlinked',
      note: 'Three rings hold together, but no two of them are linked: cut any one and the other two fall apart.',
      ms: 1100,
      make: function () {
        var C = [[0, -0.6], [-0.52, 0.3], [0.52, 0.3]], R = 1, GAP = 0.17, gaps = [[], [], []];
        // ring i passes over ring (i + 1) mod 3 at both crossings
        for (var i = 0; i < 3; i++) {
          var j = (i + 1) % 3, A = C[i], B = C[j];
          var dx = B[0] - A[0], dy = B[1] - A[1], d = Math.sqrt(dx * dx + dy * dy);
          var h = Math.sqrt(R * R - d * d / 4), mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
          [1, -1].forEach(function (sgn) {
            var px = mx - sgn * h * dy / d, py = my + sgn * h * dx / d;
            gaps[j].push(Math.atan2(py - B[1], px - B[0]));
          });
        }
        var rings = C.map(function (c, i) {
          var pieces = [], cur = [];
          for (var k = 0; k <= 180; k++) {
            var t = TAU * k / 180;
            var hidden = gaps[i].some(function (gA) {
              var diff = Math.abs(((t - gA) % TAU + TAU) % TAU);
              return Math.min(diff, TAU - diff) < GAP;
            });
            if (hidden) { if (cur.length > 1) pieces.push(cur); cur = []; }
            else cur.push([c[0] + R * Math.cos(t), c[1] + R * Math.sin(t)]);
          }
          if (cur.length > 1) {
            if (pieces.length && pieces[0][0][0] === c[0] + R) pieces[0] = cur.concat(pieces[0]);
            else pieces.push(cur);
          }
          return pieces;
        });
        return { curves: [].concat(rings[0], rings[1], rings[2]), rings: rings };
      },
      plan: function (g) {
        var cols = [BLUE, PURPLE, ROSE];
        return g.rings.map(function (p, i) { return { pieces: p, col: cols[i], w: 3, dur: 1300 }; });
      }
    },

    transport: {
      name: 'Parallel transport on a sphere',
      hint: 'an arrow carried round a triangle',
      note: 'Carry an arrow round a geodesic triangle without ever turning it: it returns rotated by the enclosed area. That is curvature, by Gauss&ndash;Bonnet.',
      ms: 260,
      make: function () {
        var view = viewY(-0.75, 0.42), curves = [circlePts(0, 0, 1, 96)];
        function P(p) { return view(zUp(p)); }
        [-0.5, 0, 0.5].forEach(function (z) {
          var r = Math.sqrt(1 - z * z);
          frontPieces(sample(function (t) { return zUp([r * Math.cos(t), r * Math.sin(t), z]); }, 0, TAU, 96), view)
            .forEach(function (c) { curves.push(c); });
        });
        for (var k = 0; k < 6; k++) {
          var lon = Math.PI * k / 6;
          frontPieces(sample(function (t) { return zUp([Math.cos(lon) * Math.sin(t), Math.sin(lon) * Math.sin(t), Math.cos(t)]); }, 0, TAU, 96), view)
            .forEach(function (c) { curves.push(c); });
        }
        var legs = [
          { at: function (s) { return [Math.sin(s), 0, Math.cos(s)]; }, vec: function (s) { return [Math.cos(s), 0, -Math.sin(s)]; } },
          { at: function (s) { return [Math.cos(s), Math.sin(s), 0]; }, vec: function () { return [0, 0, -1]; } },
          { at: function (s) { return [0, Math.cos(s), Math.sin(s)]; }, vec: function (s) { return [0, Math.sin(s), -Math.cos(s)]; } }
        ];
        return { curves: curves, legs: legs, P: P, v: [P([0, 0, 1]), P([1, 0, 0]), P([0, 1, 0])].map(flat), vr: 3.5, hideEdges: true };
      },
      plan: function (g) {
        var steps = [], Q = Math.PI / 2;
        function arrow(p, vec, col) {
          var a = flat(g.P(p)), b = flat(g.P([p[0] + 0.3 * vec[0], p[1] + 0.3 * vec[1], p[2] + 0.3 * vec[2]]));
          return { curve: [a, b], arrow: true, col: col, w: 1.6 };
        }
        steps.push(arrow([0, 0, 1], g.legs[0].vec(0), BLUE));
        g.legs.forEach(function (leg, i) {
          steps.push({ curve: sample(function (s) { return flat(g.P(leg.at(s))); }, 0, Q, 40), col: PURPLE, w: 1.8, dur: 900 });
          [1, 2, 3].forEach(function (j) {
            var s = Q * j / 3;
            steps.push(arrow(leg.at(s), leg.vec(s), i === 2 && j === 3 ? ROSE : BLUE));
          });
        });
        return steps;
      }
    },

    evolute: {
      name: 'Curvature and the evolute',
      hint: 'osculating circles',
      note: 'Each circle hugs the ellipse as closely as possible at one point. Their centres trace the evolute (rose), where the curvature is born.',
      ms: 380,
      make: function () {
        var a = 1.4, b = 1, chosen = [], pts = [];
        for (var k = 0; k < 28; k++) {
          var t = TAU * k / 28, s = Math.sin(t), c = Math.cos(t);
          var rho = Math.pow(a * a * s * s + b * b * c * c, 1.5) / (a * b);
          if (rho > 1.15) continue;
          var cx = (a * a - b * b) / a * c * c * c, cy = (b * b - a * a) / b * s * s * s;
          chosen.push({ p: [a * c, b * s], c: [cx, cy], r: rho });
          pts.push([cx - rho, cy - rho], [cx + rho, cy + rho]);
        }
        var ellipse = sample(function (t) { return [a * Math.cos(t), b * Math.sin(t)]; }, 0, TAU, 120);
        var evo = sample(function (t) { return [(a * a - b * b) / a * Math.pow(Math.cos(t), 3), (b * b - a * a) / b * Math.pow(Math.sin(t), 3)]; }, 0, TAU, 160);
        return { curves: [ellipse], chosen: chosen, evo: evo, pts: pts };
      },
      plan: function (g) {
        var steps = [];
        shuffle(g.chosen.slice()).forEach(function (o) {
          steps.push({ dot: o.p, r: 2.2, wait: 120 });
          steps.push({ curve: circlePts(o.c[0], o.c[1], o.r, 64), w: 1.1, op: 0.75 });
        });
        steps.push({ curve: g.evo, col: ROSE, w: 1.8, dur: 1600 });
        return steps;
      }
    },

    poincare: {
      name: 'Poincar&eacute; disk',
      hint: 'hyperbolic parallels',
      note: 'In the hyperbolic plane, lines are arcs meeting the boundary at right angles, and through a point off a line (rose) pass infinitely many lines that never meet it.',
      ms: 300,
      make: function () {
        var curves = [circlePts(0, 0, 1, 120)], d = Math.PI / 180;
        [[0, 120], [120, 240], [240, 360], [0, 60], [60, 120], [120, 180], [180, 240], [240, 300], [300, 360]]
          .forEach(function (p) { curves.push(geodesic(p[0] * d, p[1] * d)); });
        return { curves: curves, bounds: [-1, -1, 1, 1] };
      },
      plan: function () {
        var steps = [{ curve: geodesic(35 * Math.PI / 180, 145 * Math.PI / 180), col: ROSE, w: 2.2, dur: 900 }];
        var p = [0, -0.35], yc = (p[1] + 1 / p[1]) / 2;
        steps.push({ dot: p, col: INK, r: 3 });
        steps.push({ curve: [[0, -1], [0, 1]], w: 1.5 });
        [-3, -1.6, -0.9, -0.45, 0.45, 0.9, 1.6, 3].forEach(function (cx) {
          var r = Math.sqrt(cx * cx + (yc - p[1]) * (yc - p[1]));
          var pts = circlePts(cx, yc, r, 360);
          // keep the run inside the disk that passes through p
          var inside = pts.map(function (q) { return q[0] * q[0] + q[1] * q[1] < 1; });
          var start = inside.indexOf(false);
          var run = [], best = [];
          for (var i = 0; i < pts.length; i++) {
            var k = (start + i) % pts.length;
            if (inside[k]) run.push(pts[k]);
            else { if (run.length > best.length) best = run; run = []; }
          }
          if (run.length > best.length) best = run;
          steps.push({ curve: best, w: 1.5 });
        });
        return steps;
      }
    },

    apollonian: {
      name: 'Apollonian gasket',
      hint: 'circles in every gap',
      note: 'Fill each gap between three touching circles with a fourth (Descartes&rsquo; circle theorem). Starting from curvatures &minus;1, 2, 2, 3, every curvature is a whole number.',
      ms: 16,
      make: function () {
        var c0 = { k: -1, x: 0, y: 0 }, c1 = { k: 2, x: 0.5, y: 0 }, c2 = { k: 2, x: -0.5, y: 0 }, c3 = { k: 3, x: 0, y: 2 / 3 };
        var circles = [c1, c2, c3], queue = [[c0, c1, c2, c3, -1]];
        while (queue.length && circles.length < 420) {
          var q = queue.shift();
          for (var i = 0; i < 4; i++) {
            if (i === q[4]) continue;
            var o = [0, 1, 2, 3].filter(function (j) { return j !== i; });
            var k = 2 * (q[o[0]].k + q[o[1]].k + q[o[2]].k) - q[i].k;
            if (k > 150) continue;
            var x = (2 * (q[o[0]].k * q[o[0]].x + q[o[1]].k * q[o[1]].x + q[o[2]].k * q[o[2]].x) - q[i].k * q[i].x) / k;
            var y = (2 * (q[o[0]].k * q[o[0]].y + q[o[1]].k * q[o[1]].y + q[o[2]].k * q[o[2]].y) - q[i].k * q[i].y) / k;
            var c = { k: k, x: x, y: y };
            circles.push(c);
            var nq = q.slice(0, 4); nq[i] = c; nq.push(i);
            queue.push(nq);
          }
        }
        circles.sort(function (a, b) { return a.k - b.k; });
        return { curves: [circlePts(0, 0, 1, 120)], circles: circles, bounds: [-1, -1, 1, 1] };
      },
      plan: function (g) {
        return g.circles.map(function (c) {
          var r = 1 / c.k;
          return { curve: circlePts(c.x, c.y, r, Math.max(16, Math.round(70 * Math.sqrt(r)))), w: 1.1, dur: 500 };
        });
      }
    },

    persistence: {
      name: 'Persistent homology',
      hint: 'a loop is born',
      note: 'Grow balls around noisy samples and join points whose balls touch. A loop appears and persists &mdash; the circle hidden in the data, found by topology.',
      ms: 70,
      make: function () {
        var N = 18, v = [], e = [], eps = 0.72;
        for (var i = 0; i < N; i++) {
          var t = TAU * i / N + (Math.random() - 0.5) * 0.12, r = 1 + (Math.random() - 0.5) * 0.2;
          v.push([r * Math.cos(t), r * Math.sin(t)]);
        }
        for (i = 0; i < N; i++) for (var j = i + 1; j < N; j++) {
          var dx = v[i][0] - v[j][0], dy = v[i][1] - v[j][1], d = Math.sqrt(dx * dx + dy * dy);
          if (d < eps) e.push([i, j, 0, d]);
        }
        e.sort(function (a, b) { return a[3] - b[3]; });
        e = e.map(function (x) { return [x[0], x[1]]; });
        var balls = v.map(function (p) { return circlePts(p[0], p[1], eps / 2, 40); });
        return { v: v, e: e, vr: 3.4, curves: balls, hideEdges: true };
      },
      plan: function (g) {
        var steps = g.e.map(function (e, i) { return { edge: i, from: e[0] }; });
        steps.push({ text: [0, 0], str: '\u03b2\u2081 = 1', size: 13, col: PURPLE, italic: true });
        return steps;
      }
    },

    // --------------------------------------------- AI and dynamics
    network: {
      name: 'A neural network',
      hint: 'forward pass, then backpropagation',
      note: 'A layered graph: activations flow left to right, then gradients flow back by the chain rule (rose) to tell every weight how to change.',
      ms: 40,
      make: function () {
        var sizes = [3, 5, 5, 2], v = [], e = [], layers = [];
        sizes.forEach(function (n, l) {
          var ids = [];
          for (var i = 0; i < n; i++) { ids.push(v.length); v.push([l * 1.1, (i - (n - 1) / 2) * 0.5]); }
          layers.push(ids);
        });
        for (var l = 0; l + 1 < layers.length; l++) {
          layers[l].forEach(function (a) { layers[l + 1].forEach(function (b) { e.push([a, b]); }); });
        }
        return { v: v, e: e, vr: 6, layers: layers };
      },
      plan: function (g) {
        var steps = [];
        g.e.forEach(function (e, i) { steps.push({ edge: i, from: e[0], w: 1.3 }); });
        steps[steps.length - 1].wait = 900;
        for (var i = g.e.length - 1; i >= 0; i--) steps.push({ edge: i, from: g.e[i][1], col: ROSE, w: 1, op: 0.8, wait: 26 });
        return steps;
      }
    },

    attention: {
      name: 'Self-attention',
      hint: 'every token looks at every other',
      note: 'In a transformer, each token (top) gathers information from all tokens (bottom), weighting each by a softmax of query&ndash;key similarity.',
      ms: 40,
      make: function () {
        var n = 7, v = [];
        for (var i = 0; i < n; i++) v.push([i * 0.42, 0]);
        for (i = 0; i < n; i++) v.push([i * 0.42, 1.5]);
        return { v: v, vr: 5, n: n };
      },
      plan: function (g) {
        var n = g.n, steps = [];
        shuffle(range(n)).forEach(function (i) {
          var logits = range(n).map(function (j) { return -((i - j) * (i - j)) / 3 + gauss() * 1.1; });
          var mx = Math.max.apply(null, logits), ex = logits.map(function (z) { return Math.exp(z - mx); });
          var sum = ex.reduce(function (a, b) { return a + b; }, 0);
          steps.push({ vertex: i, cls: 1, wait: 0 });
          ex.forEach(function (z, j) {
            var wgt = z / sum, a = g.v[i], b = g.v[n + j];
            var bez = sample(function (t) {
              var u = 1 - t;
              return [u * u * u * a[0] + 3 * u * u * t * a[0] + 3 * u * t * t * b[0] + t * t * t * b[0],
                      u * u * u * a[1] + 3 * u * u * t * 0.75 + 3 * u * t * t * 0.75 + t * t * t * b[1]];
            }, 0, 1, 24);
            steps.push({ curve: bez, col: mixRGB(i / (n - 1)), w: 0.4 + 4 * wgt, op: (0.2 + 0.8 * wgt).toFixed(2), dur: 600 });
          });
          steps[steps.length - 1].wait = 380;
        });
        return steps;
      }
    },

    descent: {
      name: 'Gradient descent',
      hint: 'plain versus momentum',
      note: 'In a narrow valley, plain gradient descent zig-zags from wall to wall (blue); adding momentum smooths the path to the minimum (purple).',
      ms: 90,
      make: function () {
        var th = 0.5, a = 2.2, b = 0.6, C = Math.cos(th), S = Math.sin(th), curves = [];
        [0.04, 0.16, 0.38, 0.7, 1.1, 1.6].forEach(function (c) {
          curves.push(sample(function (t) {
            var u = a * Math.sqrt(c) * Math.cos(t), w = b * Math.sqrt(c) * Math.sin(t);
            return [u * C - w * S, u * S + w * C];
          }, 0, TAU, 90));
        });
        function grad(p) {
          var u = p[0] * C + p[1] * S, w = -p[0] * S + p[1] * C, gu = 2 * u / (a * a), gw = 2 * w / (b * b);
          return [gu * C - gw * S, gu * S + gw * C];
        }
        var start = [-1.9 * C - 0.5 * S, -1.9 * S + 0.5 * C];
        var gd = [start.slice()], p = start.slice(), i, gr;
        for (i = 0; i < 30; i++) { gr = grad(p); p = [p[0] - 0.3 * gr[0], p[1] - 0.3 * gr[1]]; gd.push(p); }
        var mom = [start.slice()], vel = [0, 0];
        p = start.slice();
        for (i = 0; i < 40; i++) {
          gr = grad(p);
          vel = [0.75 * vel[0] - 0.12 * gr[0], 0.75 * vel[1] - 0.12 * gr[1]];
          p = [p[0] + vel[0], p[1] + vel[1]];
          mom.push(p);
        }
        return { curves: curves, gd: gd, mom: mom };
      },
      plan: function (g) {
        var steps = [{ dot: [0, 0], col: ROSE, r: 2.6 }];
        for (var i = 0; i + 1 < g.gd.length; i++) steps.push({ curve: [g.gd[i], g.gd[i + 1]], col: BLUE, w: 1.5, dur: 110, linear: true });
        steps[steps.length - 1].wait = 700;
        for (i = 0; i + 1 < g.mom.length; i++) steps.push({ curve: [g.mom[i], g.mom[i + 1]], col: PURPLE, w: 1.8, dur: 100, linear: true });
        return steps;
      }
    },

    alphabeta: {
      name: 'Alpha&ndash;beta pruning',
      hint: 'minimax, skipping what can&rsquo;t matter',
      note: 'Searching a game tree, the maximiser and minimiser alternate. Branches that cannot change the decision are pruned (dashed) without being looked at.',
      ms: 340,
      make: function () {
        var leaves = [3, 5, 6, 9, 1, 2, 0, -1], v = [], e = [];
        for (var i = 0; i < 15; i++) {
          var depth = Math.floor(Math.log(i + 1) / Math.LN2), idx = i - (Math.pow(2, depth) - 1), w = Math.pow(2, 3 - depth);
          v.push([(idx + 0.5) * w * 0.5, depth * 0.95]);
          if (i > 0) e.push([(i - 1) >> 1, i]);
        }
        return { v: v, e: e, vr: 8, leaves: leaves,
                 vlabels: leaves.map(function (x, k) { return [7 + k, String(x)]; }) };
      },
      plan: function (g) {
        var steps = [], idx = edgeIndex(g);
        function prune(node) {
          steps.push({ miss: idx[((node - 1) >> 1) + ',' + node], wait: 120 });
          if (node < 7) { prune(2 * node + 1); prune(2 * node + 2); }
        }
        (function ab(node, alpha, beta, maxing) {
          if (node >= 7) return g.leaves[node - 7];
          var best = maxing ? -Infinity : Infinity, kids = [2 * node + 1, 2 * node + 2];
          for (var k = 0; k < 2; k++) {
            steps.push({ edge: idx[node + ',' + kids[k]], from: node });
            var val = ab(kids[k], alpha, beta, !maxing);
            best = maxing ? Math.max(best, val) : Math.min(best, val);
            if (maxing) alpha = Math.max(alpha, best); else beta = Math.min(beta, best);
            if (alpha >= beta) { for (var r = k + 1; r < 2; r++) prune(kids[r]); break; }
          }
          steps.push({ label: node, text: String(best) });
          return best;
        })(0, -Infinity, Infinity, true);
        return steps;
      }
    },

    brownian: {
      name: 'Brownian motion',
      hint: 'a new path every time',
      note: 'The limit of a random walk with ever smaller steps: continuous everywhere, smooth nowhere, and in the plane it comes back arbitrarily close to every point.',
      ms: 150,
      make: function () { return { bounds: [0, 0, 1, 1] }; },
      plan: function () {
        var p = [0, 0], pts = [[0, 0]], i;
        for (i = 0; i < 1400; i++) { p = [p[0] + gauss(), p[1] + gauss()]; pts.push(p); }
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        pts.forEach(function (q) { minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); });
        var s = 1 / Math.max(maxX - minX, maxY - minY), ox = (1 - (maxX - minX) * s) / 2, oy = (1 - (maxY - minY) * s) / 2;
        pts = pts.map(function (q) { return [ox + (q[0] - minX) * s, oy + (q[1] - minY) * s]; });
        return chunks(pts, 36).map(function (c) { return { curve: c, w: 1, dur: 170, linear: true }; });
      }
    },

    lorenz: {
      name: 'Lorenz attractor',
      hint: 'deterministic chaos',
      note: 'Three simple differential equations, and a trajectory that never repeats or settles down: a strange attractor, sensitive to the slightest change in where it starts.',
      ms: 160,
      make: function () {
        var x = 1, y = 1, z = 1, dt = 0.005, pts = [];
        for (var i = 0; i < 7000; i++) {
          var dx = 10 * (y - x), dy = x * (28 - z) - y, dz = x * y - 8 / 3 * z;
          x += dx * dt; y += dy * dt; z += dz * dt;
          if (i > 300 && i % 3 === 0) pts.push([x, -z]);
        }
        return { traj: pts, pts: pts };
      },
      plan: function (g) {
        return chunks(g.traj, 40).map(function (c) { return { curve: c, w: 0.9, dur: 190, linear: true }; });
      }
    }
  };

  // -- Drawing -------------------------------------------------
  // Fit everything in the scene into the SIZE x SIZE view box.
  function fit(g) {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    function add(p) {
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    }
    if (g.bounds) { add([g.bounds[0], g.bounds[1]]); add([g.bounds[2], g.bounds[3]]); }
    else {
      (g.v || []).forEach(add);
      (g.curves || []).forEach(function (c) { c.forEach(add); });
      (g.pts || []).forEach(add);
    }
    var span = Math.max(maxX - minX, maxY - minY) || 1;
    var s = (SIZE - 2 * PAD) / span;
    var ox = (SIZE - (maxX - minX) * s) / 2, oy = (SIZE - (maxY - minY) * s) / 2;
    return function (p) { return [ox + (p[0] - minX) * s, oy + (p[1] - minY) * s]; };
  }

  function fmt(p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }

  // Path for edge e drawn from vertex `from`; returns [d, length].
  function edgeGeom(P, e, from) {
    var a = P[e[0]], b = P[e[1]];
    if (from === e[1]) { var t = a; a = b; b = t; }
    var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
    var bend = e[2] || 0;
    if (!bend) return ['M' + fmt(a) + 'L' + fmt(b), len];
    if (from === e[1]) bend = -bend;       // keep the curve on the same side
    var cx = (a[0] + b[0]) / 2 - dy * bend * 2, cy = (a[1] + b[1]) / 2 + dx * bend * 2;
    var L = 0, px = a[0], py = a[1];
    for (var i = 1; i <= 20; i++) {
      var u = i / 20, qx = (1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * cx + u * u * b[0];
      var qy = (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * cy + u * u * b[1];
      L += Math.sqrt((qx - px) * (qx - px) + (qy - py) * (qy - py)); px = qx; py = qy;
    }
    return ['M' + fmt(a) + 'Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + fmt(b), L];
  }

  // Path through already-mapped polylines; returns [d, length].
  function polyGeom(pieces) {
    var d = '', L = 0;
    pieces.forEach(function (pts) {
      for (var i = 0; i < pts.length; i++) {
        d += (i ? 'L' : 'M') + fmt(pts[i]);
        if (i) L += Math.sqrt(Math.pow(pts[i][0] - pts[i - 1][0], 2) + Math.pow(pts[i][1] - pts[i - 1][1], 2));
      }
    });
    return [d, L];
  }

  function arrowHead(pts) {
    var b = pts[pts.length - 1], a = pts[pts.length - 2];
    var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= l; dy /= l;
    return [[b[0] - dx * 5 - dy * 3, b[1] - dy * 5 + dx * 3], b, [b[0] - dx * 5 + dy * 3, b[1] - dy * 5 - dx * 3]];
  }

  function plainText(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent;
  }

  function addText(layer, p, str, opts) {
    opts = opts || {};
    var t = el('text', { 'class': 'g-label', x: (p[0] + (opts.dx || 0)).toFixed(1), y: (p[1] + (opts.dy || 0) + 0.5).toFixed(1) });
    t.textContent = str;
    if (opts.size) t.style.fontSize = opts.size + 'px';
    if (opts.col) t.style.fill = rgb(opts.col);
    if (opts.italic) t.style.fontStyle = 'italic';
    if (opts.dim) t.style.fill = 'var(--text-dim)';
    layer.appendChild(t);
    return t;
  }

  function buildFigure(id, number) {
    var spec = FIGS[id], g = spec.make();
    g.v = g.v || []; g.e = g.e || [];
    var T = fit(g), P = g.v.map(T);
    var fig = document.createElement('figure');
    fig.className = 'gbg';

    var svg = el('svg', { 'class': 'gbg__svg', viewBox: '0 0 ' + SIZE + ' ' + SIZE, role: 'img',
                          'aria-label': plainText(spec.name + '. ' + spec.note) });
    var base = el('g', {}), hi = el('g', { 'class': 'g-hi-layer' }), marks = el('g', {}),
        verts = el('g', {}), statics = el('g', {}), labels = el('g', {});
    (g.curves || []).forEach(function (c) {
      base.appendChild(el('path', { 'class': 'g-edge', d: polyGeom([c.map(T)])[0] }));
    });
    if (!g.hideEdges) {
      g.e.forEach(function (e) { base.appendChild(el('path', { 'class': 'g-edge', d: edgeGeom(P, e, e[0])[0] })); });
    }
    var circles = g.hideVerts ? [] : P.map(function (p) {
      var c = el('circle', { 'class': 'g-vert', cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: (g.vr || 4) * VR_SCALE });
      verts.appendChild(c);
      return c;
    });
    (g.vlabels || []).forEach(function (l) { addText(statics, P[l[0]], l[1]); });
    (g.elabels || []).forEach(function (l) {
      var e = g.e[l[0]], a = P[e[0]], b = P[e[1]], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      addText(statics, [(a[0] + b[0]) / 2 - dy / len * 7, (a[1] + b[1]) / 2 + dx / len * 7], l[1], { dim: true });
    });
    [base, hi, marks, verts, statics, labels].forEach(function (layer) { svg.appendChild(layer); });

    var cap = document.createElement('figcaption');
    cap.className = 'gbg__cap';
    cap.setAttribute('aria-hidden', 'true');   // the svg's label already says this
    cap.innerHTML =
      '<span class="gbg__name"><em>Fig. ' + number + '</em> &middot; ' + spec.name + '</span>' +
      '<span class="gbg__note">' + spec.hint.charAt(0).toUpperCase() + spec.hint.slice(1) + '. ' + spec.note + '</span>';

    fig.appendChild(svg);
    fig.appendChild(cap);

    return { fig: fig, spec: spec, g: g, T: T, P: P, hi: hi, marks: marks, labels: labels,
             circles: circles, timers: [], playing: false, visible: false };
  }

  function clearTimers(st) {
    st.timers.forEach(window.clearTimeout);
    st.timers = [];
  }

  function clearLayers(st) {
    [st.marks, st.labels].forEach(function (l) { while (l.firstChild) l.removeChild(l.firstChild); });
    st.circles.forEach(function (c) { c.style.fill = ''; c.style.stroke = ''; });
  }

  function reset(st) {
    st.hi.style.opacity = '';
    while (st.hi.firstChild) st.hi.removeChild(st.hi.firstChild);
    clearLayers(st);
  }

  function paintVertex(st, v, fill, stroke) {
    if (!st.circles[v]) return;
    st.circles[v].style.fill = fill;
    st.circles[v].style.stroke = stroke;
  }

  // Draw a path in, by animating its dash offset.
  function drawIn(st, path, len, dur, linear, instant) {
    if (instant) return;
    len += 1;
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.getBoundingClientRect();           // commit the start state
    path.style.transition = 'stroke-dashoffset ' + dur + 'ms ' + (linear ? 'linear' : 'cubic-bezier(.3,.6,.3,1)');
    path.style.strokeDashoffset = '0';
  }

  function fadeIn(node, instant) {
    if (instant) return;
    node.style.opacity = '0';
    node.getBoundingClientRect();
    node.style.transition = 'opacity .5s ease';
    node.style.opacity = '';
  }

  function stroke(path, s, col) {
    path.setAttribute('stroke', rgb(col));
    if (s.w) path.style.strokeWidth = s.w;
    if (s.op) path.setAttribute('opacity', s.op);
  }

  function apply(st, s, n, total, instant) {
    var g = st.g, P = st.P, T = st.T;
    var col = s.col || mixRGB(total > 1 ? n / (total - 1) : 0);
    var dur = s.dur || Math.max(st.spec.ms * 1.5, 420);
    if (s.edge != null) {
      var geom = edgeGeom(P, g.e[s.edge], s.from);
      var path = el('path', { 'class': 'g-hi', d: geom[0] });
      stroke(path, s, col);
      st.hi.appendChild(path);
      var to = other(g.e[s.edge], s.from);
      if (st.circles[s.from] && !st.circles[s.from].style.stroke) paintVertex(st, s.from, rgb(col, 0.25), rgb(col));
      if (instant) { if (st.circles[to] && !st.circles[to].style.stroke) paintVertex(st, to, rgb(col, 0.25), rgb(col)); return; }
      drawIn(st, path, geom[1], dur, s.linear, false);
      st.timers.push(window.setTimeout(function () {
        // tint on arrival, unless the plan has coloured it already
        if (st.circles[to] && !st.circles[to].style.stroke) paintVertex(st, to, rgb(col, 0.25), rgb(col));
      }, dur * 0.7));
    } else if (s.curve || s.pieces) {
      var pieces = (s.pieces || [s.curve]).map(function (c) { return c.map(T); });
      if (s.arrow) pieces.push(arrowHead(pieces[pieces.length - 1]));
      var pg = polyGeom(pieces);
      var cp = el('path', { 'class': 'g-hi', d: pg[0] });
      stroke(cp, s, col);
      st.hi.appendChild(cp);
      if (s.dash) { cp.setAttribute('stroke-dasharray', '3 4'); fadeIn(cp, instant); }
      else drawIn(st, cp, pg[1], dur, s.linear, instant);
    } else if (s.vertex != null) {
      paintVertex(st, s.vertex, PALETTE[s.cls].fill, PALETTE[s.cls].stroke);
    } else if (s.dot) {
      var q = T(s.dot);
      var dot = el('circle', { cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: s.r || 2.5, fill: rgb(col), stroke: '#fff', 'stroke-width': 0.8 });
      st.marks.appendChild(dot);
      fadeIn(dot, instant);
    } else if (s.text) {
      fadeIn(addText(st.labels, T(s.text), s.str, { dx: s.dx, dy: s.dy, size: s.size, col: s.col || INK, italic: s.italic }), instant);
    } else if (s.miss != null) {
      var mg = edgeGeom(P, g.e[s.miss], g.e[s.miss][0]);
      var miss = el('path', { 'class': 'g-hi', d: mg[0], stroke: rgb(ROSE), 'stroke-dasharray': '3 4' });
      miss.style.strokeWidth = '1.4';
      st.marks.appendChild(miss);
      fadeIn(miss, instant);
    } else if (s.label != null) {
      fadeIn(addText(st.labels, P[s.label], s.text), instant);
    } else if (s.ring != null) {
      var rp = P[s.ring];
      var ringEl = el('circle', { 'class': 'g-ring', cx: rp[0].toFixed(1), cy: rp[1].toFixed(1),
                                  r: (g.vr || 4) * VR_SCALE + 3, stroke: rgb(ROSE), opacity: 0.7 });
      st.marks.appendChild(ringEl);
      fadeIn(ringEl, instant);
    }
  }

  function play(st) {
    clearTimers(st);
    reset(st);
    var steps = st.spec.plan(st.g), lines = 0;
    steps.forEach(function (s) { s.n = lines; if (s.edge != null || s.curve || s.pieces) lines++; });  // colour by order
    if (reduceMotion) {
      steps.forEach(function (s) { apply(st, s, s.n, lines, true); });
      return;
    }
    st.playing = true;
    var t = START_MS;
    steps.forEach(function (s) {
      st.timers.push(window.setTimeout(function () { apply(st, s, s.n, lines, false); }, t));
      t += s.wait != null ? s.wait : st.spec.ms;
    });
    st.timers.push(window.setTimeout(function () {
      if (!st.visible) { st.playing = false; return; }   // replay when it's next on screen
      st.hi.style.opacity = '0';
      clearLayers(st);
      st.timers.push(window.setTimeout(function () { play(st); }, RESET_MS));
    }, t + 900 + HOLD_MS));
  }

  function stop(st) {
    clearTimers(st);
    reset(st);
    st.playing = false;
  }

  // -- Place figures down both margins -------------------------
  var wanted = (root.getAttribute('data-graphs') || '').split(/\s+/).filter(function (id) { return FIGS[id]; });
  var rest = shuffle(Object.keys(FIGS).filter(function (id) { return wanted.indexOf(id) < 0; }));
  var pool = wanted.concat(rest);

  var layer = document.createElement('div');
  layer.className = 'gbg-layer';
  layer.setAttribute('data-no-reveal', '');
  root.insertBefore(layer, root.firstChild);
  root.classList.add('has-graphs');

  var figures = [];

  function figureAt(i) {
    if (!figures[i]) {
      figures[i] = buildFigure(pool[i % pool.length], i + 1);
      layer.appendChild(figures[i].fig);
      if (reduceMotion) play(figures[i]);
    }
    return figures[i];
  }

  // Wide screens: a column of figures down each margin, the left one
  // offset by half a step so the two sides interleave. Each figure is
  // sized to fit its margin with a clear gap to the text, so it never
  // overlaps the words. If the margins can't fit a MIN_PX figure:
  // faint watermarks behind the text, alternating sides.
  // A figure is only placed if all of it - caption included - ends
  // above the bottom of the content, so none can run into the footer.
  var CAPTION_PX = 150;     // generous allowance for a wrapped caption
  var BOTTOM_SLACK = 24;    // may reach this far into the page's bottom padding
  var EDGE = 32;            // figure's outer edge sits this far in from the viewport edge
  var GAP = 28;             // minimum clear space between a figure and the text
  var MIN_PX = 200, MAX_PX = 440;
  function arrange() {
    var vw = document.documentElement.clientWidth;
    var W = root.clientWidth, H = root.offsetHeight;
    // Width available in each margin without touching the text column
    var fit = Math.min(MAX_PX, Math.floor((vw - W) / 2 - EDGE - GAP));
    var margins = vw >= 1024 && fit >= MIN_PX;
    layer.classList.toggle('gbg-layer--margins', margins);
    var slots = [];
    if (margins) {
      var step = fit + 200, limit = H + BOTTOM_SLACK;
      for (var y = 0; y + fit + CAPTION_PX <= limit; y += step) slots.push({ side: 'right', top: y, px: fit, op: '' });
      for (y = step / 2; y + fit + CAPTION_PX <= limit; y += step) slots.push({ side: 'left', top: y, px: fit, op: '' });
      slots.sort(function (a, b) { return a.top - b.top; });
    } else {
      // Margins too narrow: faint watermarks behind the text instead
      var px = Math.min(vw * 0.85, 360);
      for (var k = 0, yy = 0; yy + px <= H + BOTTOM_SLACK; k++, yy += px + 260) {
        slots.push({ side: k % 2 ? 'left' : 'right', top: yy, px: px, op: '' });
      }
    }
    slots.forEach(function (slot, i) {
      var st = figureAt(i);
      st.fig.className = 'gbg gbg--' + slot.side;
      st.fig.style.top = Math.round(slot.top) + 'px';
      st.fig.style.width = Math.round(slot.px) + 'px';
      st.fig.style.opacity = slot.op;
      st.fig.style.display = '';
      st.hidden = false;
    });
    for (var j = slots.length; j < figures.length; j++) {
      figures[j].fig.style.display = 'none';
      figures[j].hidden = true;
      stop(figures[j]);
    }
  }

  arrange();
  window.addEventListener('load', arrange);   // web fonts can change heights
  var arrangeTimer = 0, lastW = document.documentElement.clientWidth;
  window.addEventListener('resize', function () {
    window.clearTimeout(arrangeTimer);
    arrangeTimer = window.setTimeout(function () {
      var w = document.documentElement.clientWidth;
      if (w === lastW) return;              // ignore mobile URL-bar height changes
      lastW = w;
      arrange();
      onScroll();
    }, 150);
  });

  if (reduceMotion) return;

  // Play figures as they come into view (plain scroll check, like
  // the reveal in site.js, so nothing depends on observers firing).
  var queued = false;
  function check() {
    queued = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    figures.forEach(function (st) {
      if (st.hidden) { st.visible = false; return; }
      var r = st.fig.getBoundingClientRect();
      st.visible = r.bottom > vh * 0.08 && r.top < vh * 0.9;
      if (st.visible && !st.playing) play(st);
    });
  }
  function onScroll() {
    if (!queued) { queued = true; window.requestAnimationFrame(check); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  check();
})();
