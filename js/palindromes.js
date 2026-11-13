/*
 * "Sum of three palindromes" widget for the blog post of the same name.
 *
 * Uses js/sumof3palindromes.js (a port of code_stuff/sumof3palindromes.py),
 * which must load first.
 *
 * Markup: an element with [data-palindromes] holding a form with inputs
 * named base and number, plus [data-status], [data-result] and optional
 * [data-example] buttons (data-base, data-number).
 */
(function () {
  'use strict';

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // The answer as a column sum: a grid of cells (rows use display:
  // contents), with the same equation in a sentence for screen readers.
  function render(box, r) {
    box.textContent = '';
    var showDec = r.base !== 10;
    var P = r.palindromes;
    var said = r.number + (showDec ? ' in base ' + r.base : '') + ' = ' + P.join(' + ') +
      (showDec ? ' (in base 10: ' + r.decimal + ' = ' + r.decimals.join(' + ') + ')' : '');
    box.appendChild(el('p', 'visually-hidden', said));

    var scroll = el('div', 'palin__scroll');
    var sum = el('div', 'palin__sum' + (showDec ? ' palin__sum--dec' : ''));
    sum.setAttribute('aria-hidden', 'true');
    function row(cells, cls) {
      var tr = el('div', 'palin__row ' + cls);
      tr.appendChild(el('span', 'palin__op', cells[0]));
      tr.appendChild(el('span', 'palin__digits', cells[1]));
      if (showDec) tr.appendChild(el('span', 'palin__dec', cells[2]));
      sum.appendChild(tr);
    }
    if (showDec) row(['', 'base ' + r.base, 'base 10'], 'palin__row--head');
    row(['', P[0], r.decimals[0]], 'palin__row--p1');
    row(['+', P[1], r.decimals[1]], 'palin__row--p2');
    row(['+', P[2], r.decimals[2]], 'palin__row--p3');
    row(['', r.number, r.decimal], 'palin__row--total');
    scroll.appendChild(sum);
    box.appendChild(scroll);

    var how;
    if (P[1] === '0' && P[2] === '0') how = 'Already a palindrome, so the other two are 0.';
    else if (r.type && r.algorithms.length) how = 'Type ' + r.type + ', Algorithm ' + r.algorithms.join(' then ') + '.';
    else if (r.algorithms.length) how = 'Algorithm ' + r.algorithms.join(' then ') + '.';
    else how = 'A small case (at most six digits), handled directly.';
    box.appendChild(el('p', 'palin__how', how));
    box.hidden = false;
  }

  function setup(root) {
    var lib = window.SumOf3Palindromes;
    if (!lib) return;                       // keep the no-JS note
    var form = root.querySelector('form');
    var baseIn = form.elements.base, numIn = form.elements.number;
    var status = root.querySelector('[data-status]');
    var result = root.querySelector('[data-result]');
    var baseLabel = root.querySelector('[data-base-label]');

    function say(msg, isError) {
      status.textContent = msg || '';
      status.classList.toggle('palin__status--error', !!isError);
    }
    function syncLabel() { if (baseLabel) baseLabel.textContent = baseIn.value || '?'; }

    function run() {
      var r;
      try {
        r = lib.solve(baseIn.value, numIn.value);
      } catch (err) {
        // RangeError: bad input, with a message for the reader. Anything else is a bug.
        say(err instanceof RangeError ? err.message : 'Something went wrong: ' + err.message, true);
        result.hidden = true;               // don't leave an old answer under the error
        return;
      }
      say('');
      render(result, r);
    }

    baseIn.addEventListener('input', syncLabel);
    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });

    each(root.querySelectorAll('[data-example]'), function (b) {
      b.addEventListener('click', function () {
        baseIn.value = b.getAttribute('data-base');
        numIn.value = b.getAttribute('data-number');
        syncLabel();
        run();
      });
    });

    syncLabel();
    root.classList.add('is-ready');
    run();                                  // show the default example straight away
  }

  function init() { each(document.querySelectorAll('[data-palindromes]'), setup); }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
