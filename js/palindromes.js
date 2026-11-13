/*
 * "Sum of three palindromes" widget for the blog post of the same name.
 *
 * Runs the real Python script (code_stuff/sumof3palindromes.py) in the
 * browser with Pyodide. Nothing is downloaded until the reader first
 * touches the form; after that each answer is instant.
 *
 * Markup: an element with [data-palindromes] and data-src (URL of the
 * .py file) holding a form with inputs named base and number, plus
 * [data-status], [data-result] and optional [data-example] buttons
 * (data-base, data-number).
 */
(function () {
  'use strict';

  var PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

  var GLUE = [
    'import json, sumof3palindromes as s3p',
    'def web_solve(base, text):',
    '    try:',
    '        base = int(str(base).strip())',
    '    except ValueError:',
    '        return json.dumps({"ok": False, "error": "The base must be a whole number."})',
    '    try:',
    '        out = s3p.solve(base, text)',
    '    except ValueError as e:',
    '        return json.dumps({"ok": False, "error": str(e)})',
    '    out["ok"] = True',
    '    return json.dumps(out)'
  ].join('\n');

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }

  // One Python runtime for the whole page, started on first use.
  var ready = null;
  function python(srcURL) {
    if (!ready) {
      ready = loadScript(PYODIDE + 'pyodide.js')
        .then(function () {
          return Promise.all([
            window.loadPyodide({ indexURL: PYODIDE }),
            fetch(srcURL).then(function (r) {
              if (!r.ok) throw new Error('Could not fetch the Python script (' + r.status + ')');
              return r.text();
            })
          ]);
        })
        .then(function (both) {
          var py = both[0];
          py.FS.writeFile('sumof3palindromes.py', both[1]);
          py.runPython(GLUE);
          return py.globals.get('web_solve');
        });
      ready.catch(function () { ready = null; });   // allow a retry
    }
    return ready;
  }

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
    if (r.palindromes[1] === '0' && r.palindromes[2] === '0') how = 'Already a palindrome, so the other two are 0.';
    else if (r.type && r.algorithms.length) how = 'Type ' + r.type + ', Algorithm ' + r.algorithms.join(' then ') + '.';
    else if (r.algorithms.length) how = 'Algorithm ' + r.algorithms.join(' then ') + '.';
    else how = 'A small case (at most six digits), handled directly.';
    box.appendChild(el('p', 'palin__how', how));
    box.hidden = false;
  }

  function setup(root) {
    var form = root.querySelector('form');
    var baseIn = form.elements.base, numIn = form.elements.number;
    var status = root.querySelector('[data-status]');
    var result = root.querySelector('[data-result]');
    var baseLabel = root.querySelector('[data-base-label]');
    var src = root.getAttribute('data-src');
    var busy = false;

    function say(msg, isError) {
      status.textContent = msg || '';
      status.classList.toggle('palin__status--error', !!isError);
    }
    function warm() {
      if (ready) return;
      say('Loading Python in your browser (a few MB, first time only)…');
      python(src).then(function () { if (!busy) say(''); },
                       function (e) { say(e.message + '. Check your connection and try again.', true); });
    }
    function syncLabel() { if (baseLabel) baseLabel.textContent = baseIn.value || '?'; }

    form.addEventListener('focusin', warm);
    baseIn.addEventListener('input', syncLabel);
    syncLabel();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      busy = true;
      if (!ready) say('Loading Python in your browser (a few MB, first time only)…');
      python(src).then(function (solve) {
        var r = JSON.parse(solve(baseIn.value, numIn.value));
        if (!r.ok) { say(r.error, true); return; }
        say('');
        render(result, r);
      }).catch(function (err) {
        say((err && err.message ? err.message.split('\n').filter(Boolean).pop() : 'Something went wrong') + '.', true);
      }).then(function () { busy = false; });
    });

    each(root.querySelectorAll('[data-example]'), function (b) {
      b.addEventListener('click', function () {
        baseIn.value = b.getAttribute('data-base');
        numIn.value = b.getAttribute('data-number');
        syncLabel();
        if (form.requestSubmit) form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { cancelable: true }));
      });
    });

    root.classList.add('is-ready');
  }

  function init() { each(document.querySelectorAll('[data-palindromes]'), setup); }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
