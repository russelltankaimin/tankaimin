/*
 * Every positive integer is a sum of three palindromes.
 *
 * A line-by-line JavaScript port of code_stuff/sumof3palindromes.py,
 * which implements the algorithm of Cilleruelo, Luca and Baxter,
 * "Every positive integer is a sum of three palindromes" (Math. Comp.
 * 2018, arXiv:1602.06208), for any base g >= 5. Function names and
 * structure follow the Python so the two can be compared side by side;
 * the Python is the reference, and the two are tested against each other.
 *
 * Numbers are arrays of digits, most significant first.
 *
 *   SumOf3Palindromes.solve(16, "DEADBEEF").palindromes
 *     -> ["D111111D", "D44144D", "589985"]
 *
 * Python semantics kept by hand: d() is Python's % (never negative),
 * fdiv() is Python's // (rounds down), and slices are copies.
 */
(function (root) {
  'use strict';

  var DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var MIN_BASE = 5, MAX_BASE = 36;

  // What the last run did: the type of the number and the algorithms used
  var trace = { type: null, algorithms: [] };
  function note(kind, value) {
    if (kind === 'type') { if (trace.type === null) trace.type = value; }
    else trace.algorithms.push(value);
  }

  // -- Python helpers ---------------------------------------------
  function d(num, base) { return ((num % base) + base) % base; }
  function fdiv(a, b) { return Math.floor(a / b); }
  function rev(a) { return a.slice().reverse(); }
  function last(a) { return a[a.length - 1]; }
  function repeat(v, n) { var out = []; for (var i = 0; i < n; i++) out.push(v); return out; }

  // base_convert + hex_int_to_lst: the digits of n (no digits for 0, as in the Python)
  function baseConvert(n, base) {
    var out = [];
    while (n > 0) { out.push(n % base); n = Math.floor(n / base); }
    return out.reverse();
  }

  // The small-case solver for a number of this many digits
  function smallSum(m, base) {
    switch (m.length) {
      case 1: return oneDigitSum(m, base);
      case 2: return twoDigitSum(m, base);
      case 3: return threeDigitSum(m, base);
      case 4: return fourDigitSum(m, base);
      case 5: return fiveDigitSum(m, base);
      case 6: return sixDigitSum(m, base);
      default: throw new Error('smallSum: ' + m.length + ' digits');
    }
  }

  // -- Small cases (at most six digits) ---------------------------
  function oneDigitSum(num) { return [num, [0], [0]]; }

  function twoDigitSum(num, base) {
    num = rev(num);
    if (num[1] <= num[0]) return [[num[1], num[1]], [num[0] - num[1]], [0]];
    if (num[1] > num[0] + 1) return [[num[1] - 1, num[1] - 1], [base + num[0] - num[1] + 1], [0]];
    if (num[0] === 0) return [[base - 1], [1], [0]];
    return [[num[0], num[0]], [base - 1], [1]];
  }

  function threeDigitSum(num, base) {
    num = rev(num);
    if (num[2] <= num[0]) return [[num[2], num[1], num[2]], [num[0] - num[2]], [0]];
    if (num[1] !== 0) return [[num[2], num[1] - 1, num[2]], [base + num[0] - num[2]], [0]];
    if (d(num[2] - num[0] - 1, base) !== 0) return [[num[2] - 1, base - 1, num[2] - 1], [base + num[0] - num[2] + 1], [0]];
    if (num[2] >= 3) return [[num[2] - 2, base - 1, num[2] - 2], [1, 1, 1], [0]];
    if (num[2] === 2) return [[1, 0, 1], [base - 1, base - 1], [1]];
    return [[base - 1, base - 1], [1], [0]];
  }

  function fourDigitSum(num, base) {
    var r = rev(num), d0 = r[0], d1 = r[1], d2 = r[2], d3 = r[3];
    var b3 = base * base * base;
    var n = num[0] * b3 + num[1] * base * base + num[2] * base + num[3];
    if (n >= d3 * b3 + d3) {
      var m = n - d3 * b3 - d3, dp = d(m, base);
      if (m === 2 * base * base + 1) {
        if (d3 === 1) return [[1, 1, 1, 1], [base - 2, base - 2], [3]];
        if (d3 === base - 1) return [[base - 1, 1, 1, base - 1], [base - 2, base - 2], [3]];
        return [[d3 - 1, base - 1, base - 1, d3 - 1], [2, 1, 2], [0]];
      }
      if (1 <= dp && dp <= base - 2 && m === (dp + 1) * base + dp) {
        if (d3 + dp === d0 && d3 === 1) return [[base - 1, base - 1, base - 1], [dp + 1, dp + 1], [1]];
        return [[d3 - 1, base - 2, base - 2, d3 - 1], [1, 3, 1], [dp, dp]];
      }
      if (d2 === 0 && d1 === 0 && d0 <= d3 - 1 && d3 !== 1) return [[d3 - 1, base - 1, base - 1, d3 - 1], [base + d0 - d3], [1]];
      if (d0 === 0 && d1 === 0 && d2 === 0 && d3 === 1) return [[base - 1, base - 1, base - 1], [1], [0]];
      var extra = smallSum(baseConvert(m, base), base);
      return [[d3, 0, 0, d3], extra[0], extra[1]];
    }
    if (d0 <= d3 - 1 && d3 !== 1) return [[d3 - 1, base - 1, base - 1, d3 - 1], [base + d0 - d3], [1]];
    return [[base - 1, base - 1, base - 1], [1], [0]];
  }

  function fiveDigitSum(num, base) {
    if (num[0] !== 1) {
      var t = checkType(num, base);
      return algorithm1(num, t[1], base, t[0]);
    }
    var r = rev(num), d0 = r[0], d1 = r[1], d2 = r[2], d3 = r[3], d4 = r[4];
    var b2 = base * base, b3 = b2 * base, b4 = b3 * base;
    var i1 = (b4 + 1) + d3 * (base + b3);
    var deci = d0 + d1 * base + d2 * b2 + d3 * b3 + d4 * b4;
    var m = deci - i1, dp = d(m, base);
    var i2 = (b4 + 1) + (d3 - 1) * (base + b3) + (base - 1) * b2;
    var m2 = deci - i2, dpp = d(m2, base);
    var tho = 2 * b2 + 1, extra;
    if ((deci >= i1 && m !== tho) && (dp === 0 || dp === base - 1 || m !== (dp + 1) * base + dp)) {
      extra = smallSum(baseConvert(m, base), base);
      return [[1, d3, 0, d3, 1], extra[0], extra[1]];
    } else if (deci >= i1 && m === tho) {
      return [[1, d3, 1, d3, 1], [1, 0, 1]];
    } else if (deci >= i1 && m === (dp + 1) * base + dp && 1 <= dp && dp <= base - 2 && d3 !== 0) {
      if (dp + 1 + d3 <= base - 1 || d3 + 1 + dp === base + d1) return [[1, d3 - 1, 1, d3 - 1, 1], [base - 1, dp + 1, base - 1], [dp + 1]];
      return undefined;
    } else if (deci >= i1 && m === (dp + 1) * base + dp && 1 <= dp && dp <= base - 2 && d3 === 0) {
      return [repeat(base - 1, 4), [dp + 1, dp + 1], [1]];
    } else if (deci < i1 && d3 === 0) {
      return [repeat(base - 1, 4), [1], [0]];
    } else if ((deci < i1 && d3 !== 0 && m2 !== tho) && (dp === 0 || dp === base - 1 || m2 !== (dpp + 1) * base + dpp)) {
      extra = smallSum(baseConvert(m2, base), base);
      return [[1, d3 - 1, base - 1, d3 - 1, 1], extra[0], extra[1]];
    }
    return [[1, d3 - 1, base - 2, d3 - 1, 1], [1, dp + 1, 1], [dp - 1]];
  }

  function sixDigitSum(num, base) {
    var r = rev(num), d0 = r[0], d1 = r[1], d2 = r[2], d3 = r[3], d4 = r[4], d5 = r[5];
    var x, y, z, c;
    if (d5 !== 1) {
      num = rev(num);
      var m = 3;
      var cfg = checkType([d5, d4, d3, d2, d1, d0], base)[1];
      c = [0];
      x = [0].concat(cfg[0]); y = [0].concat(cfg[1]); z = [0].concat(cfg[2]);
      c.push(fdiv(x[1] + y[1] + z[1], base));
      x.push(z[1] <= num[2 * m - 3] - 1 ? d(num[2 * m - 2] - y[1], base) : d(num[2 * m - 2] - y[1] - 1, base));
      y.push(d(num[2 * m - 3] - z[1] - 1, base));
      z.push(d(num[1] - x[2] - y[2] - c[1], base));
      c.push(fdiv(x[2] + y[2] + z[2] + c[1] - num[1], base));
      x.push(0);
      y.push(d(num[m - 1] - z[m - 1] - c[m - 1], base));
      c.push(fdiv(x[m] + y[m] + z[m - 1] + c[m - 1] - num[m - 1], base));
      var P = function () {
        return [[x[1], x[2], x[3], x[3], x[2], x[1]], [y[1], y[2], y[3], y[2], y[1]], [z[1], z[2], z[2], z[1]]];
      };
      if (c[m] === 1) return P();
      if (c[m] === 0) {
        if (y[m] !== 0) { x[m] = 1; y[m] -= 1; return P(); }
        if (y[m - 1] !== 0) { x[m] = 1; y[m] = base - 2; y[m - 1] -= 1; z[m - 1] += 1; return P(); }
        if (z[m - 1] !== 0) { y[m] = 1; y[m - 1] = 1; z[m - 1] -= 1; return P(); }
        if (x[2] !== 0) { x[2] -= 1; x[3] = base - 1; y[2] = 1; y[3] = 1; return P(); }
        if (x[1] === 1) return [[2, 0, 0, 0, 0, 2], [1, 1], [base - 4]];
        if (x[1] !== 1 && y[1] !== base - 1) return [[x[1] - 1, base - 1, 0, 0, base - 1, x[1] - 1], [y[1] + 1, 0, base - 2, 0, y[1] + 1], [z[1], 1, 1, z[1]]];
        if (x[1] !== base - 1 && z[1] === base - 1 && y[1] === base - 1) return [[x[1] + 1, 0, 0, 0, 0, x[1] + 1], [1, 1], [base - 4]];
        return undefined;
      }
      if (c[m] === 2) { x[m] = 1; y[m - 1] -= 1; y[m] = base - 2; z[m - 1] = 0; return P(); }
      return undefined;
    }

    // d5 == 1
    var b = base, x1, x2, x3, y1, y2, y3, z1, z2, c1, c2, c3, c4, yd, xd, mu, extra, s;
    var n = d0 + d1 * b + d2 * b * b + d3 * b * b * b + d4 * b * b * b * b + d5 * b * b * b * b * b;
    var b4 = b * b * b * b, b5 = b4 * b;
    if (d(d0 - d4 + 1, b) !== 0 && d(d0 - d4 + 2, b) !== 0) {
      x1 = fdiv(b + d4 - 1, 2); y1 = b + d4 - 1 - x1; z1 = d(d0 - d4 + 1, b); c1 = fdiv(x1 + y1 + z1 - d0, b);
      x2 = fdiv(b + d3 - 1, 2); y2 = b + d3 - 1 - x2; z2 = d(d1 - x2 - y2 - c1, b); c2 = fdiv(x2 + y2 + z2 + c1 - d1, b);
      x3 = fdiv(b + d2 - c2 - z1, 2); y3 = b + d2 - c2 - z1 - x3;
      return [[x1, x2, x3, x2, x1], [y1, y2, y3, y2, y1], [z1, z2, z1]];
    } else if (d(d0 - d4 + 2, b) === 0 && d2 !== 0) {
      x1 = fdiv(b + d4 - 1, 2); y1 = b + d4 - 1 - x1; z1 = b - 1; c1 = fdiv(x1 + y1 + z1 - d0, b);
      x2 = fdiv(b + d3 - 1, 2); y2 = b + d3 - 1 - x2; z2 = d(d1 - x2 - y2 - c1, b); c2 = fdiv(x2 + y2 + z2 + c1 - d1, b);
      x3 = fdiv(1 + d2 - c2, 2); y3 = 1 + d2 - c2 - x3;
      return [[x1, x2, x3, x2, x1], [y1, y2, y3, y2, y1], [z1, z2, z1]];
    } else if (d(d0 - d4 + 2, b) === 0 && d2 === 0) {
      if (d4 === 0 || d4 === 1) {
        x2 = fdiv(d3, 2); y2 = d3 - x2; z2 = d(d1 - x2 - y2 - 1, b); c2 = fdiv(x2 + y2 + z2 + 1 - d1, b);
        x3 = fdiv(b - c2 - z2, 2); y3 = b - c2 - z2 - x3;
        var top = d4 === 0 ? b - 2 : b - 1;
        return [[top, x2, x3, x2, top], [1, y2, y3, y2, 1], [b - 1, z2, z2, b - 1]];
      } else if (d4 === 2) {
        x2 = fdiv(d3, 2); y2 = d3 - x2; z2 = d(d1 - x2 - y2 - 2, b); c2 = fdiv(x2 + y2 + z2 + 2 - d1, b);
        if (c2 !== 2) {
          x3 = fdiv(b - c2 - z2, 2); y3 = b - c2 - z2 - x3;
          return [[b - 1, x2, x3, x2, b - 1], [2, y2, y3, y2, 2], [b - 1, z2, z2, b - 1]];
        }
        return [[1, 2, b - 2, b - 2, 2, 1], [1, b - 3, 1], [b - 2]];
      } else {   // d4 >= 3
        c4 = fdiv(d(d3 - 1, b) + 1 - d3, b);
        z1 = d(d1 - d3 - 1 + c4, b);
        c2 = fdiv(2 - c4 + d(d3 - 1, b) + z1 - d1, b);
        return [[1, 1 - c4, 0, 0, 1 - c4, 1], [d4 - 1, d(d3 - 1, b), 2 - c2, d(d3 - 1, b), d4 - 1], [b - 2, z1, b - 2]];
      }
    } else if (d(d0 - d4 + 1, b) === 0 && d3 !== 0) {
      if (d4 !== b - 1) {
        x1 = fdiv(b + d4, 2); y1 = b + d4 - x1; z1 = b - 1; c1 = fdiv(x1 + y1 + z1 - d0, b);
        x2 = fdiv(d3 - 1, 2); y2 = d3 - 1 - x2; z2 = d(d1 - x2 - y2 - c1, b); c2 = fdiv(x2 + y2 + z2 + c1 - d1, b);
        x3 = fdiv(1 + d2 - c2, 2); y3 = 1 + d2 - c2 - x3;
        return [[x1, x2, x3, x2, x1], [y1, y2, y3, y2, y1], [z1, z2, z1]];
      }
      yd = d(d1 - 4, b) === b - 1 ? 3 : d(d1 - 4, b) === b - 2 ? 2 : 1;
      xd = d3 < yd ? d3 + b - yd : d3 - yd;
      c1 = fdiv(3 + yd + d(d1 - 3 - yd, b) - d1, b);
      mu = 0;
      c2 = fdiv(xd + d(d2 - xd - 1 - c1 + mu, b) + c1 + 1 - d2, b);
      if (c2 > 1) { c2 = 1; mu = 1; }
      c3 = fdiv(xd + yd - d3, b);
      return [[1, 3 - c3, xd - mu, xd - mu, 3 - c3, 1],
              [b - 4, yd - c2 + mu, d(d2 - xd - 1 - c1 + mu, b), yd - c2 + mu, b - 4],
              [1, d(d1 - 3 - yd, b) + c2 - mu + c3, 1]];
    } else if (d(d0 - d4 + 1, b) === 0 && d3 === 0) {
      if (d4 === 0) {
        if (d2 !== 0 || (d1 !== 0 && d1 !== b - 1)) {
          s = n - 1 - b5;
          extra = smallSum(baseConvert(s, b), b);
          return [[1, 0, 0, 0, 0, 1], extra[0], extra[1]];
        }
        if (d1 === 0) return [[1, 0, 0, 0, 0, 1], [b - 2], [0]];
        return [[b - 1, 0, 1, 0, b - 1], [b - 1, b - 2, b - 2, b - 1], [1, 0, 1]];   // d1 == b-1
      } else if (d4 === 1) {
        if (d2 >= 2 || (d2 === 1 && d1 >= 2)) {
          s = n - 1 - b - b4 - b5;
          extra = smallSum(baseConvert(s, b), b);
          return [[1, 1, 0, 0, 1, 1], extra[0], extra[1]];
        }
        if (d2 === 1 && d1 === 0) return [[1, 0, b - 1, b - 1, 0, 1], [1, b - 1, 1], [b - 2]];
        if (d2 === 1 && d1 === 1) return [[1, 1, 0, 0, 1, 1], [b - 1, b - 1], [0]];
        if (d2 === 0 && d1 >= 2) return [[1, 1, 0, 0, 1, 1], [d1 - 2, d1 - 2], [b - d1 + 1]];
        if (d2 === 0 && d1 === 1) return [[1, 0, 0, 0, 0, 1], [1, 0, 0, 0, 1], [b - 2]];
        if (d2 === 0 && d1 === 0) return [[1, 0, 0, 0, 0, 1], [b - 1, b - 1, b - 1, b - 1], [0]];
        return undefined;
      } else if (d4 === 2) {
        if (d2 >= 2 || (d2 === 1 && d1 >= 2)) {
          s = n - 1 - 2 * b - 2 * b4 - b5;
          extra = smallSum(baseConvert(s, b), b);
          return [[1, 2, 0, 0, 2, 1], extra[0], extra[1]];
        }
        if (d2 === 1 && d1 === 0) return [[1, 1, b - 1, b - 1, 1, 1], [1, b - 2, 1], [b - 1]];
        if (d2 === 1 && d1 === 1) return [[1, 1, b - 1, b - 1, 1, 1], [1, b - 1, 1], [b - 1]];
        if (d2 === 0 && d1 === 3) return [[1, 2, 0, 0, 2, 1], [b - 1], [1]];
        if (d2 === 0 && d1 > 3) return [[1, 2, 0, 0, 2, 1], [d1 - 3, d1 - 3], [b - d1 + 3]];
        if (d2 === 0 && d1 === 2) return [[1, 1, b - 1, b - 1, 1, 1], [1, 0, 1], [b - 1]];
        if (d2 === 0 && d1 === 1) return [[1, 0, 0, 0, 0, 1], [2, 0, 0, 0, 2], [b - 2]];
        if (d2 === 0 && d1 === 0) return [[1, 1, b - 1, b - 1, 1, 1], [b - 2, b - 2], [2]];
        return undefined;
      } else if (d4 === 3) {
        yd = d(d1 - 2, b) === 0 ? 3 : d(d1 - 2, b) === b - 1 ? 2 : 1;
        c1 = fdiv(2 + yd + d(d1 - 1 - yd, b) - d1, b);
        c2 = fdiv(b - yd - 1 + d(d2 + yd + 2, b) + b - 1 - d2, b);
        return [[1, 0, b - yd - 1 - c1, b - yd - 1 - c1, 0, 1],
                [2, yd - c2 + 1 + c1, d(d2 + yd + 2, b), yd - c2 + 1 + c1, 2],
                [b - 1, d(d1 - 1 - yd, b) + c2 - 1 - c1, b - 1]];
      } else {   // d4 >= 4
        yd = d(d1 - 2, b) === 0 ? 3 : d(d1 - 2, b) === b - 1 ? 2 : 1;
        c1 = fdiv(1 + yd + d(d1 - yd - 1, b) - d1, b);
        c2 = fdiv(b - yd + 1 + d(d2 + yd - 1, b) - d2, b);
        return [[1, 2, b - yd - c1, b - yd - c1, 2, 1],
                [d4 - 3, yd - c2 + c1, d(d2 + yd - 1, b), yd - c2 + c1, d4 - 3],
                [1, d(d1 - 2 - yd, b) + c2 - c1, 1]];
      }
    }
    return undefined;
  }

  // -- Seven or more digits ---------------------------------------
  function mainAlgorithm(number, base) {
    var odd = number.length % 2 !== 0;
    var t = checkType(number, base), types = t[0], config = t[1], special = t[2];
    if (/^A[1-4]$/.test(types)) {
      if (odd) return algorithm1(number, config, base, types);
      return special ? algorithm5(number, config, base) : algorithm2(number, config, base, types);
    }
    if (types === 'A5' || types === 'A6') {
      if (!odd) return algorithm1(number, config, base, types);
      return special ? algorithm5(number, config, base) : algorithm2(number, config, base, types);
    }
    if (/^B[1-7]$/.test(types)) {
      if (odd) return algorithm3(number, config, base);
      return special ? algorithm5(number, config, base) : algorithm4(number, config, base);
    }
    throw new Error('Indeterminate type');
  }

  function bigSub(digits, s, base) {
    for (var i = 0; i < digits.length; i++) {
      digits[i] -= s[i];
      while (digits[i] < 0) { digits[i] += base; digits[i + 1] -= 1; }
    }
    return digits;
  }

  // The type (A1-A6, B1-B7) and the starting digits of the palindromes
  function checkType(num, base) {
    var l = num.length, m = l >> 1, testNum = rev(num);
    var special = testNum[m] === 0 || testNum[m - 1] === 0;
    var n0 = num[0], n1 = num[1], n2 = num[2], nl = last(num);
    function out(type, p1, p2, p3, oddSpecial) {
      note('type', type);
      return [type, [p1, p2, p3], special && (l % 2 === (oddSpecial ? 1 : 0))];
    }
    var lowN1 = n1 === 0 || n1 === 1 || n1 === 2;
    if (d(nl - n0 - n1 + 1, base) !== 0 && !lowN1) return out('A1', [n0], [n1 - 1], [d(nl - n0 - n1 + 1, base)]);
    if (d(nl - n0 - n1 + 1, base) === 0 && !lowN1) return out('A2', [n0], [n1 - 2], [1]);
    if (d(nl - n0 + 2, base) !== 0 && lowN1 && n0 !== 1) return out('A3', [n0 - 1], [base - 1], [d(nl - n0 + 2, base)]);
    if (d(nl - n0 + 2, base) === 0 && lowN1 && n0 !== 1) return out('A4', [n0 - 1], [base - 2], [1]);
    if (d(nl - n2, base) !== 0 && n2 <= 3 && n1 === 0 && n0 === 1) return out('A5', [base - 1], [n2 + 1], [d(nl - n2, base)], true);
    if (d(nl - n2, base) === 0 && n2 <= 2 && n1 === 0 && n0 === 1) return out('A6', [base - 1], [n2 + 2], [base - 1], true);
    if (d(nl - n2, base) !== 0 && n2 >= 4 && n1 <= 2 && n0 === 1) return out('B1', [1, n1], [n2 - 1], [d(nl - n2, base)]);
    if (d(nl - n2, base) === 0 && n2 >= 3 && n1 <= 2 && n0 === 1) return out('B2', [1, n1], [n2 - 2], [1]);
    if (nl === 0 && (n2 === 0 || n2 === 1) && (n1 === 2 || n1 === 1) && n0 === 1) return out('B3', [1, n1 - 1], [base - 2], [1]);
    if (nl === 0 && (n2 === 2 || n2 === 3) && (n1 === 2 || n1 === 1) && n0 === 1) return out('B4', [1, n1], [1], [base - 2]);
    if (nl !== 0 && (n2 === 0 || n2 === 1 || n2 === 2) && (n1 === 1 || n1 === 2) && n0 === 1) return out('B5', [1, n1 - 1], [base - 1], [nl]);
    if (d(nl - 3, base) !== 0 && n2 === 3 && (n1 === 1 || n1 === 2) && n0 === 1) return out('B6', [1, n1], [2], [d(nl - 3, base)]);
    if (nl === 3 && n2 === 3 && (n1 === 1 || n1 === 2) && n0 === 1) return out('B7', [1, n1], [1], [1]);
    return [null, 0, false];
  }

  // Algorithm I: type A, p1 of odd length
  function algorithm1(number, config, base, types) {
    note('algorithm', 'I');
    if (types === 'A5' || types === 'A6') number = number.slice(1);
    var revNum = rev(number), m = number.length >> 1, i;
    var x = [0].concat(config[0]), y = [0].concat(config[1]), z = [0].concat(config[2]);
    var c = [0, fdiv(x[1] + y[1] + z[1], base)];
    x.push(z[1] <= revNum[2 * m - 2] - 1 ? d(revNum[2 * m - 1] - y[1], base) : d(revNum[2 * m - 1] - y[1] - 1, base));
    y.push(d(revNum[2 * m - 2] - z[1] - 1, base));
    z.push(d(revNum[1] - x[2] - y[2] - c[1], base));
    c.push(fdiv(x[2] + y[2] + z[2] + c[1] - revNum[1], base));
    for (i = 3; i <= m; i++) {
      x.push(z[i - 1] <= revNum[2 * m - i] - 1 ? 1 : 0);
      y.push(d(revNum[2 * m - i] - z[i - 1] - 1, base));
      z.push(d(revNum[i - 1] - x[i] - y[i] - c[i - 1], base));
      c.push(fdiv(x[i] + y[i] + z[i] + c[i - 1] - revNum[i - 1], base));
    }
    x.push(0);
    if (c[m] === 0) {
      x[m + 1] = 1;
    } else if (c[m] === 2) {
      if (z[m] !== base - 1) { y[m] -= 1; z[m] += 1; }
      else { x[m + 1] = 1; y[m] -= 1; z[m] = 0; }
    }
    x = x.slice(1); y = y.slice(1); z = z.slice(1);
    y = y.concat(rev(y));
    x = x.concat(rev(x).slice(1));
    z = z.concat(rev(z).slice(1));
    return [x, y, z];
  }

  // Algorithm II: type A, p1 of even length
  function algorithm2(number, config, base, types) {
    note('algorithm', 'II');
    if (types === 'A5' || types === 'A6') number = number.slice(1);
    var num = rev(number), m = num.length >> 1, i;
    var x = [0].concat(config[0]), y = [0].concat(config[1]), z = [0].concat(config[2]);
    var c = [0, fdiv(x[1] + y[1] + z[1], base)];
    x.push(z[1] <= num[2 * m - 3] - 1 ? d(num[2 * m - 2] - y[1], base) : d(num[2 * m - 2] - y[1] - 1, base));
    y.push(d(num[2 * m - 3] - z[1] - 1, base));
    z.push(d(num[1] - x[2] - y[2] - c[1], base));
    c.push(fdiv(x[2] + y[2] + z[2] + c[1] - num[1], base));
    for (i = 3; i < m; i++) {
      x.push(z[i - 1] <= num[2 * m - i - 1] - 1 ? 1 : 0);
      y.push(d(num[2 * m - i - 1] - z[i - 1] - 1, base));
      z.push(d(num[i - 1] - x[i] - y[i] - c[i - 1], base));
      c.push(fdiv(x[i] + y[i] + z[i] + c[i - 1] - num[i - 1], base));
    }
    x.push(0);
    y.push(d(num[m - 1] - z[m - 1] - c[m - 1], base));
    c.push(fdiv(x[m] + y[m] + z[m - 1] + c[m - 1] - num[m - 1], base));
    if (c[m] === 0) {
      if (y[m] !== 0) { x[m] = 1; y[m] -= 1; }
      else if (y[m - 1] !== 0) { x[m] = 1; y[m] = base - 2; y[m - 1] -= 1; z[m - 1] += 1; }
      else if (z[m - 1] !== 0) { y[m] = 1; y[m - 1] = 1; z[m - 1] -= 1; }
      else { x[m - 1] -= 1; x[m] = 1; y[m] = base - 4; y[m - 1] = base - 1; z[m - 1] = 2; }
    } else if (c[m] === 2) {
      x[m] = 1; y[m - 1] -= 1; y[m] = base - 2; z[m - 1] = 0;
    }
    x = x.slice(1); y = y.slice(1); z = z.slice(1);
    x = x.concat(rev(x)); z = z.concat(rev(z));
    y = y.concat(rev(y).slice(1));
    return [x, y, z];
  }

  // Algorithm III: type B, odd length
  function algorithm3(number, config, base) {
    note('algorithm', 'III');
    var num = rev(number), m = num.length >> 1, i;
    var x = config[0], y = [0].concat(config[1]), z = [0].concat(config[2]);
    var c = [0, fdiv(1 + y[1] + z[1], base)];
    x.push(z[1] <= num[2 * m - 3] - 1 ? d(num[2 * m - 2] - y[1], base) : d(num[2 * m - 2] - y[1] - 1, base));
    y.push(d(num[2 * m - 3] - z[1] - 1, base));
    z.push(d(num[1] - x[1] - y[2] - c[1], base));
    c.push(fdiv(x[1] + y[2] + z[2] + c[1] - num[1], base));
    for (i = 3; i < m; i++) {
      x.push(z[i - 1] <= num[2 * m - i - 1] - 1 ? 1 : 0);
      y.push(d(num[2 * m - i - 1] - z[i - 1] - 1, base));
      z.push(d(num[i - 1] - x[i - 1] - y[i] - c[i - 1], base));
      c.push(fdiv(x[i - 1] + y[i] + z[i] + c[i - 1] - num[i - 1], base));
    }
    x.push(0);
    y.push(d(num[m - 1] - z[m - 1] - x[m - 1] - c[m - 1], base));
    c.push(fdiv(x[m - 1] + y[m] + z[m - 1] + c[m - 1] - num[m - 1], base));
    if (c[m] === 0) {
      x[m] = 1;
    } else if (c[m] === 2) {
      if (y[m - 1] !== 0) {
        if (z[m - 1] !== base - 1) { y[m - 1] -= 1; y[m] -= 1; z[m - 1] += 1; }
        else { x[m] = 1; y[m - 1] -= 1; z[m - 1] = 0; }
      } else {
        if (z[m - 1] !== base - 1) { x[m - 1] -= 1; y[m - 1] = base - 1; y[m] -= 1; z[m - 1] += 1; }
        else { x[m - 1] -= 1; x[m] = 1; y[m - 1] = base - 1; z[m - 1] = 0; }
      }
    }
    y = y.slice(1); z = z.slice(1);
    x = x.concat(rev(x).slice(1));
    z = z.concat(rev(z));
    y = y.concat(rev(y).slice(1));
    return [x, y, z];
  }

  // Algorithm IV: type B, even length (the long adjustment step)
  function algorithm4(number, config, base) {
    note('algorithm', 'IV');
    var b = base, num = rev(number), m = num.length >> 1, i;
    var x = config[0], y = [0].concat(config[1]), z = [0].concat(config[2]);
    var c = [0, fdiv(1 + y[1] + z[1], b)];
    x.push(z[1] <= num[2 * m - 4] - 1 ? d(num[2 * m - 3] - y[1], b) : d(num[2 * m - 3] - y[1] - 1, b));
    y.push(d(num[2 * m - 4] - z[1] - 1, b));
    z.push(d(num[1] - x[1] - y[2] - c[1], b));
    c.push(fdiv(x[1] + y[2] + z[2] + c[1] - num[1], b));
    for (i = 3; i < m - 1; i++) {
      x.push(z[i - 1] <= num[2 * m - i - 2] - 1 ? 1 : 0);
      y.push(d(num[2 * m - i - 2] - z[i - 1] - 1, b));
      z.push(d(num[i - 1] - x[i - 1] - y[i] - c[i - 1], b));
      c.push(fdiv(x[i - 1] + y[i] + z[i] + c[i - 1] - num[i - 1], b));
    }
    x.push(z[m - 2] <= num[m - 1] - 1 ? 1 : 0);
    y.push(d(num[m - 1] - z[m - 2] - 1, b));
    z.push(d(num[m - 2] - x[m - 2] - y[m - 1] - c[m - 2], b));
    c.push(fdiv(x[m - 2] + y[m - 1] + z[m - 1] + c[m - 2] - num[m - 2], b));

    var j = m - 1, k = m - 2;   // the middle column and the one beside it
    var s = x[j] + c[j];
    if (s === 1) {
      // IV.1: nothing to do
    } else if (s === 0 && y[j] !== b - 1) {            // IV.2
      if (z[j] !== 0) {
        y[j] += 1; z[j] -= 1;
      } else if (y[k] !== 0) {
        if (y[j] !== 1 && z[k] !== b - 1) { x[j] = 1; y[k] -= 1; y[j] -= 1; z[k] += 1; z[j] += 1; }
        else if (y[j] !== 1 && z[k] === b - 1) { x[j] = 2; y[k] -= 1; y[j] -= 2; z[k] = 0; z[j] = 3; }
        else if (y[j] === 1) { x[j] = 1; y[k] -= 1; y[j] = b - 1; z[k] = 0; z[j] = 3; }
      } else {
        if (z[k] !== b - 1) { x[k] -= 1; x[j] = 1; y[k] = b - 1; y[j] -= 1; z[k] += 1; z[j] = 1; }
        else if (y[j] !== 1) { x[k] -= 1; x[j] = 2; y[k] = b - 1; y[j] -= 2; z[k] = 0; z[j] = 3; }
        else { x[k] -= 1; x[j] = 1; y[k] = b - 1; y[j] = b - 1; z[k] = 0; z[j] = 3; }
      }
    } else if (s === 0 && y[j] === b - 1) {            // IV.3
      x[j] = 1; y[k] -= 1; y[j] = b - 2; z[k] += 1; z[j] = 1;
    } else if (s === 2 && x[j] === 0 && c[j] === 2) {  // IV.4
      if (z[j] !== b - 1) {
        y[j] -= 1; z[j] += 1;
      } else if (z[k] !== b - 1) {
        if (y[k] !== 0) { x[j] = 1; y[k] -= 1; y[j] -= 2; z[k] += 1; z[j] = 1; }
        else { x[k] -= 1; x[j] = 1; y[k] = b - 1; y[j] -= 2; z[k] += 1; z[j] = 1; }
      } else {
        // IV.4.iii: the case split is on y[m-1] (not y[m-2]) being g-1 or g-2
        if (y[j] < b - 2) {
          if (y[k] !== b - 1) { x[k] -= 1; x[j] = b - 2; y[k] += 1; y[j] += 2; z[j] = b - 2; z[k] = b - 2; }
          else { x[j] = b - 2; y[k] = 0; y[j] += 2; z[j] = b - 2; z[k] = b - 2; }
        } else {
          if (y[k] >= 1) { x[j] = 2; y[k] -= 1; y[j] -= 3; z[k] = 0; z[j] = 3; }
          else { x[k] -= 1; x[j] = 2; y[k] = b - 1; y[j] -= 3; z[k] = 0; z[j] = 3; }
        }
      }
    } else if (s === 2 && x[j] === 1 && c[j] === 1) {  // IV.5
      if (z[j] !== b - 1 && y[j] !== 0) {
        y[j] -= 1; z[j] += 1;
      } else if (z[j] !== b - 1 && y[j] === 0) {
        x[j] = 0; y[j] = b - 1; z[j] += 1;
      } else if (z[j] === b - 1 && z[k] !== 0) {
        if (y[k] !== b - 1) { x[j] = 0; y[k] += 1; y[j] += 1; z[k] -= 1; z[j] = b - 2; }
        else if (y[j] > 1) { x[j] = 2; y[k] = b - 2; y[j] -= 2; z[k] += 1; z[j] = 1; }
        else if (y[j] === 0) { y[k] = b - 2; y[j] = b - 2; z[k] += 1; z[j] = 1; }
        else if (y[j] === 1) { y[k] = b - 2; y[j] = b - 1; z[k] += 1; z[j] = 1; }
      } else if (z[j] === b - 1 && z[k] === 0 && y[k] !== 0) {
        if (y[j] > 1) { x[j] = 2; y[k] -= 1; y[j] -= 2; z[k] = 1; z[j] = 1; }
        else if (y[j] === 0) { y[k] -= 1; y[j] = b - 2; z[k] = 1; z[j] = 1; }
        else if (y[j] === 1) { y[k] -= 1; y[j] = b - 1; z[k] = 1; z[j] = 1; }
      } else if (z[j] === b - 1 && z[k] === 0 && y[k] === 0) {
        if (y[j] > 1) { x[k] -= 1; x[j] = 2; y[k] = b - 1; y[j] -= 2; z[k] = 1; z[j] = 1; }
        else if (y[j] === 0) { x[k] -= 1; y[k] = b - 1; y[j] = b - 2; z[k] = 1; z[j] = 1; }
        else if (y[j] === 1) { x[k] -= 1; y[k] = b - 1; y[j] = b - 1; z[k] = 1; z[j] = 1; }
      }
    } else if (s === 3) {
      y[j] -= 1; z[j] = 0;
    }
    y = y.slice(1); z = z.slice(1);
    x = x.concat(rev(x)); y = y.concat(rev(y));
    z = z.concat(rev(z).slice(1));
    return [x, y, z];
  }

  // Algorithm V: special numbers (a 0 next to the middle). Subtract 1
  // (or 2) from the two middle digits, solve that, then add it back
  // into the middle of the first palindrome.
  function algorithm5(number, config, base) {
    note('algorithm', 'V');
    var length = number.length, m = length >> 1;
    var s = repeat(0, length);
    s[m] = 1; s[m - 1] = 1;
    var digits = bigSub(rev(number), s, base);
    if (last(digits) === 0) digits = digits.slice(0, -1);
    if (digits[m - 1] === 0 || digits[m] === 0) {
      s[m] = 2; s[m - 1] = 2;
      digits = bigSub(rev(number), s, base);
      if (last(digits) === 0) digits = digits.slice(0, -1);
    }
    var res = rev(digits);
    var tType = checkType(res, base)[0];
    length = res.length;
    var p1Length = (tType === 'A5' || tType === 'A6') ? length - 1 : length;
    var result;
    if (length === 6) {
      result = sixDigitSum(res, base);
    } else if (p1Length % 2 === 0) {
      result = mainAlgorithm(res, base);
    } else {
      var z1 = d(last(res) - res[2], base);
      var cfg = z1 !== 0 ? [[1, res[1]], [res[2] - 1], [z1]] : [[1, res[1]], [res[2] - 2], [1]];
      result = algorithm4(res, cfg, base);
    }
    result[0][m] += s[m];
    result[0][m - 1] += s[m - 1];
    return result;
  }

  // -- Using it ---------------------------------------------------
  function toDigits(n, base) {
    if (n === 0) return [0];
    return baseConvert(n, base);
  }
  function digitsToText(ds) {
    var s = '';
    for (var i = 0; i < ds.length; i++) s += DIGITS.charAt(ds[i]);
    return s;
  }
  function toBigInt(ds, base) {
    var B = BigInt(base), n = BigInt(0);
    for (var i = 0; i < ds.length; i++) n = n * B + BigInt(ds[i]);
    return n;
  }
  function isPalindrome(ds) {
    for (var i = 0, j = ds.length - 1; i < j; i++, j--) if (ds[i] !== ds[j]) return false;
    return true;
  }
  function strip(ds) {
    var i = 0;
    while (i < ds.length - 1 && ds[i] === 0) i++;
    return ds.slice(i);
  }
  // Compare two digit arrays (no leading zeros) by value
  function cmp(a, b) {
    if (a.length !== b.length) return a.length - b.length;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  }

  function parseNumber(text, base) {
    if (!(base >= MIN_BASE && base <= MAX_BASE)) {
      throw new RangeError('The base must be between ' + MIN_BASE + ' and ' + MAX_BASE + '.');
    }
    var s = String(text).replace(/\s+/g, '').toUpperCase();
    if (!s) throw new RangeError('Enter a number.');
    var ds = [];
    for (var i = 0; i < s.length; i++) {
      var v = DIGITS.indexOf(s.charAt(i));
      if (v < 0 || v >= base) {
        throw new RangeError("'" + s.charAt(i) + "' is not a digit in base " + base +
                             ' (the digits are 0-' + DIGITS.charAt(base - 1) + ').');
      }
      ds.push(v);
    }
    return strip(ds);
  }

  // Digits of n -> digits of three palindromes adding up to n, largest
  // first. Every answer is checked; an Error here means a bug.
  function threePalindromes(digits, base) {
    digits = strip(digits);
    trace.type = null;
    trace.algorithms = [];
    var res;
    if (isPalindrome(digits)) res = [digits, [0], [0]];
    else res = (digits.length <= 6 ? smallSum : mainAlgorithm)(digits.slice(), base);
    if (!res) throw new Error('No answer for ' + digitsToText(digits) + ' in base ' + base + '.');
    res = res.map(strip);
    while (res.length < 3) res.push([0]);
    var total = BigInt(0);
    var ok = res.length === 3 && res.every(function (p) {
      total += toBigInt(p, base);
      return isPalindrome(p) && p.every(function (v) { return v >= 0 && v < base && v === Math.floor(v); });
    }) && total === toBigInt(digits, base);
    if (!ok) throw new Error('No valid answer for ' + digitsToText(digits) + ' in base ' + base + '.');
    return res.slice().sort(function (a, b) { return cmp(b, a); });
  }

  function solve(base, text) {
    if (!/^\s*[+-]?\d+\s*$/.test(String(base))) throw new RangeError('The base must be a whole number.');
    base = parseInt(base, 10);
    var digits = parseNumber(text, base);
    var res = threePalindromes(digits, base);
    var algorithms = [];
    trace.algorithms.forEach(function (a) { if (algorithms.indexOf(a) < 0) algorithms.push(a); });
    return {
      base: base,
      number: digitsToText(digits),
      decimal: toBigInt(digits, base).toString(),
      palindromes: res.map(digitsToText),
      decimals: res.map(function (p) { return toBigInt(p, base).toString(); }),
      type: trace.type,
      algorithms: algorithms
    };
  }

  root.SumOf3Palindromes = {
    solve: solve,
    threePalindromes: threePalindromes,
    parseNumber: parseNumber,
    toDigits: toDigits,
    digitsToText: digitsToText,
    MIN_BASE: MIN_BASE,
    MAX_BASE: MAX_BASE
  };
})(typeof window !== 'undefined' ? window : this);
