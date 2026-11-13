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

  // ── Blog: filter posts by tag ───────────────────────────────
  // The page carries the paginated list and, hidden, every post with
  // its tags in data-tags. Choosing a tag (?tag=slug) hides the
  // paginated list and shows the matching posts from the full one.
  function tagFilter() {
    var bar = document.querySelector('[data-tag-filter]');
    var results = document.querySelector('[data-tag-results]');
    if (!bar || !results) return;
    var paged = document.querySelector('[data-paged]');
    var chips = bar.querySelectorAll('[data-tag]');
    var rows = results.children;

    function hasTag(row, tag) {
      return (' ' + (row.getAttribute('data-tags') || '') + ' ').indexOf(' ' + tag + ' ') >= 0;
    }
    function fromURL() {
      var m = /[?&]tag=([^&#]*)/.exec(window.location.search);
      if (!m) return '';
      try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return ''; }
    }

    each(chips, function (chip) {
      var tag = chip.getAttribute('data-tag'), n = 0;
      if (!tag) return;
      each(rows, function (row) { if (hasTag(row, tag)) n++; });
      var count = document.createElement('span');
      count.className = 'tag-chip__count';
      count.textContent = n;
      chip.appendChild(count);
    });

    function apply(tag) {
      var known = false;
      each(chips, function (chip) { if (chip.getAttribute('data-tag') === tag) known = true; });
      if (!known) tag = '';                 // unknown tag: show everything
      each(chips, function (chip) {
        if (chip.getAttribute('data-tag') === tag) chip.setAttribute('aria-current', 'true');
        else chip.removeAttribute('aria-current');
      });
      if (paged) paged.hidden = !!tag;
      results.hidden = !tag;
      each(rows, function (row) { row.hidden = !tag || !hasTag(row, tag); });
    }

    bar.addEventListener('click', function (e) {
      var chip = e.target.closest && e.target.closest('[data-tag]');
      if (!chip || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (chip.pathname !== window.location.pathname) return;   // e.g. from page 2: just follow the link
      e.preventDefault();
      if (chip.href !== window.location.href) window.history.pushState(null, '', chip.href);
      apply(chip.getAttribute('data-tag'));
    });
    window.addEventListener('popstate', function () { apply(fromURL()); });

    bar.hidden = false;
    apply(fromURL());
  }

  ready(function () {
    fillCurrentPath();
    tagFilter();

    var revealRoot = document.querySelector('[data-reveal]');
    if (revealRoot && !reduceMotion) reveal(revealRoot);
  });
})();
