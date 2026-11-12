/*
 * Site-wide enhancements. Everything here is optional polish:
 * without JS the page renders fully, just without motion.
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

  // ── Scroll reveal ───────────────────────────────────────────
  // Plain scroll check rather than IntersectionObserver: only
  // elements that start below the fold are ever hidden, and each is
  // shown as soon as its top enters the viewport, so content can
  // never get stuck invisible.
  function reveal(root) {
    var pending = [];
    var vh = window.innerHeight || document.documentElement.clientHeight;

    each(root.children, function (el) {
      if (el.hasAttribute('data-no-reveal')) return;
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

    var revealRoot = document.querySelector('[data-reveal]');
    if (revealRoot && !reduceMotion) reveal(revealRoot);
  });
})();
