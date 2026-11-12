/*
 * Site-wide enhancements. Everything here is optional polish:
 * without JS the page renders fully, just without motion.
 *  - terminal typewriter on the home hero (once per session)
 *  - scroll-reveal for home sections
 *  - 404 page shows the path the visitor asked for
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // ── 404: echo the requested path ────────────────────────────
  function fillCurrentPath() {
    var path = window.location.pathname;
    try { path = decodeURI(path); } catch (e) { /* keep raw */ }
    each(document.querySelectorAll('[data-current-path]'), function (el) {
      el.textContent = path;
    });
  }

  // ── Typewriter ──────────────────────────────────────────────
  var SEEN_KEY = 'tw-seen:' + window.location.pathname;

  function alreadySeen() {
    try { return window.sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { window.sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ }
  }

  // Wrap a command line's text so it can be revealed char by char
  // while the untyped part still occupies its space (no layout shift).
  function prepareCommand(line) {
    var jobs = [];
    each(Array.prototype.slice.call(line.childNodes), function (node) {
      if (node.nodeType !== 3 || !node.nodeValue.trim()) return;
      var typed = document.createElement('span');
      var rest = document.createElement('span');
      rest.className = 'typed-rest';
      rest.textContent = node.nodeValue;
      line.replaceChild(rest, node);
      line.insertBefore(typed, rest);
      jobs.push({ full: node.nodeValue, typed: typed, rest: rest, pos: 0 });
    });
    return jobs;
  }

  function finishJob(job) {
    var text = document.createTextNode(job.full);
    if (job.typed.parentNode) job.typed.parentNode.replaceChild(text, job.typed);
    if (job.rest.parentNode) job.rest.parentNode.removeChild(job.rest);
  }

  function typewriter(root) {
    var lines = Array.prototype.slice.call(root.querySelectorAll('.term__line'));
    if (!lines.length) return;

    var steps = lines.map(function (line, i) {
      var isCmd = line.classList.contains('term__line--cmd');
      if (i > 0) line.classList.add('is-pending');
      return { line: line, jobs: isCmd ? prepareCommand(line) : [] };
    });

    var index = 0;
    var timer = null;
    var skipped = false;

    function skip() {
      if (skipped) return;
      skipped = true;
      window.clearTimeout(timer);
      steps.forEach(function (s) {
        s.line.classList.remove('is-pending');
        s.jobs.forEach(finishJob);
      });
      root.removeEventListener('click', skip);
      document.removeEventListener('keydown', skip);
    }

    function typeJobs(jobs, done) {
      var j = 0;
      (function tick() {
        if (skipped) return;
        var job = jobs[j];
        if (!job) { timer = window.setTimeout(done, 280); return; }
        job.pos += 1;
        job.typed.textContent = job.full.slice(0, job.pos);
        job.rest.textContent = job.full.slice(job.pos);
        if (job.pos >= job.full.length) { finishJob(job); j += 1; }
        timer = window.setTimeout(tick, 40 + Math.random() * 60);
      })();
    }

    function next() {
      if (skipped) return;
      var step = steps[index];
      index += 1;
      if (!step) { skip(); return; }
      step.line.classList.remove('is-pending');
      if (step.jobs.length) typeJobs(step.jobs, next);
      else timer = window.setTimeout(next, 140);
    }

    root.addEventListener('click', skip);
    document.addEventListener('keydown', skip);
    timer = window.setTimeout(next, 450);
    markSeen();
  }

  // ── Scroll reveal ───────────────────────────────────────────
  // Plain scroll check rather than IntersectionObserver: only
  // elements that start below the fold are ever hidden, and each is
  // shown as soon as its top enters the viewport, so content can
  // never get stuck invisible.
  function reveal(root) {
    var pending = [];
    var vh = window.innerHeight || document.documentElement.clientHeight;

    each(root.children, function (el) {
      if (el.getBoundingClientRect().top > vh) {
        el.classList.add('reveal');
        pending.push(el);
      }
    });
    if (!pending.length) return;

    var queued = false;
    function check() {
      queued = false;
      var limit = (window.innerHeight || document.documentElement.clientHeight) * 0.94;
      pending = pending.filter(function (el) {
        if (el.getBoundingClientRect().top < limit) {
          el.classList.add('is-visible');
          return false;
        }
        return true;
      });
      if (!pending.length) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    }
    function onScroll() {
      if (!queued) { queued = true; window.requestAnimationFrame(check); }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    check();
  }

  ready(function () {
    fillCurrentPath();

    var term = document.querySelector('[data-typewriter]');
    if (term && !reduceMotion && !alreadySeen()) typewriter(term);

    var revealRoot = document.querySelector('[data-reveal]');
    if (revealRoot && !reduceMotion) reveal(revealRoot);
  });
})();
