---
layout: post
title: Every Number is a Sum of Three Palindromes
date: 2025-08-14 20:00
summary: Pick a base, type a number, and watch it split into three palindromes, using an algorithm I implemented back in 2019.
categories: math
mathjax: true
graphs: [pascal, bezout, torusSquare]
---

A palindrome is a number that reads the same forwards and backwards, like 7, 44, 121 or 9009. Here is a fact that sounds too good to be true: **every positive integer is the sum of at most three palindromes**. For example,

$$2026 = 2002 + 22 + 2, \qquad 31415926535 = 21001010012 + 9988118899 + 426797624.$$

It doesn't only work in base 10. Javier Cilleruelo, Florian Luca and Lewis Baxter proved it for every base $$g \ge 5$$ ([Mathematics of Computation, 2018](https://arxiv.org/abs/1602.06208)). Better still, their proof is *constructive*: it is an algorithm that takes the digits of a number and writes down three palindromes adding up to it. Back in December 2019 I implemented that algorithm in Python, and this post finally puts it to use.

## Try it

Choose a base from 5 to 36 and type a number in that base. Digits above 9 are the letters A to Z, so base 16 is ordinary hexadecimal. The answer is computed by [my actual Python script]({{ "/code_stuff/sumof3palindromes.py" | relative_url }}), running in your browser through [Pyodide](https://pyodide.org). The first answer takes a few seconds while Python loads; after that they are instant.

<div class="palin" data-palindromes data-src="{{ "/code_stuff/sumof3palindromes.py" | relative_url }}">
  <form class="palin__form" autocomplete="off">
    <label class="field">
      <span class="field__label">Base</span>
      <input class="field__input" name="base" type="number" min="5" max="36" value="16" required>
    </label>
    <label class="field">
      <span class="field__label">Number in base <span data-base-label>16</span></span>
      <input class="field__input" name="number" type="text" value="DEADBEEF" maxlength="5000" spellcheck="false" autocapitalize="characters" required>
    </label>
    <button class="btn" type="submit">Split it</button>
  </form>
  <div class="palin__examples">
    <span>Try:</span>
    <button type="button" class="palin__example" data-example data-base="10" data-number="2026"><code>2026</code> in base 10</button>
    <button type="button" class="palin__example" data-example data-base="10" data-number="31415926535"><code>31415926535</code> in base 10</button>
    <button type="button" class="palin__example" data-example data-base="5" data-number="1000000"><code>1000000</code> in base 5</button>
    <button type="button" class="palin__example" data-example data-base="36" data-number="PALINDROME"><code>PALINDROME</code> in base 36</button>
  </div>
  <p class="palin__status" data-status role="status" aria-live="polite"></p>
  <div class="palin__result" data-result hidden></div>
  <p class="palin__nojs">This needs JavaScript. You can still <a href="{{ "/code_stuff/sumof3palindromes.py" | relative_url }}">download the script</a> and run it with Python.</p>
</div>
<script src="{{ "/js/palindromes.js" | relative_url }}" defer></script>

Under the answer it says which *type* the number is and which of the paper's algorithms produced the palindromes. The next section explains what those are.

## How the algorithm works

The idea is easy to state. Write the number $$n$$ with $$l$$ digits, and look for three palindromes $$p_1, p_2, p_3$$ of lengths about $$l$$, $$l-1$$ and $$l-2$$. A palindrome is fixed by the first half of its digits, so we only have to choose about $$3l/2$$ digits, and we need them to make each of the $$l$$ columns of the addition come out right.

The digits are chosen from the outside in, two columns at a time:

1. **Pick the type.** The first two or three digits of $$n$$ and its last digit decide which of 13 *types* it is: A1 to A6 or B1 to B7. The type fixes the leading digits $$x_1, y_1, z_1$$ of the three palindromes, and so (because they are palindromes) their last digits too.
2. **Work inwards.** At step $$i$$, the digit of $$n$$ near the *left* end decides $$x_i$$ and $$y_i$$. Because each palindrome repeats its digits, those choices also land in a column near the *right* end, and that column (with its carry) decides $$z_i$$. One step fixes a column at each end.
3. **Fix the middle.** When the two ends meet, the carry coming into the middle can be off by one or two. A final *adjustment step* repairs it by nudging a handful of the middle digits. This is where almost all the case analysis lives.

Which steps to follow depends on the type and on whether $$l$$ is odd or even. That gives the paper's four main algorithms. Algorithm I handles type A when $$p_1$$ has odd length, Algorithm II handles type A when it has even length, and Algorithms III and IV are the same for type B. A fifth, Algorithm V, deals with *special* numbers that have a 0 next to the middle, which would break the adjustment step. It subtracts 1 (or 2) from the two middle digits, solves that smaller number, and adds the 1s back into the middle of $$p_1$$, which keeps it a palindrome. Numbers with at most six digits are too short for all this and are handled case by case.

Why $$g \ge 5$$? The construction needs room in each digit: some steps pick digits like $$g-4$$ or rely on a column holding enough without overflowing. Smaller bases need different methods. Rajasekaran, Shallit and Smith [later showed](https://arxiv.org/abs/1706.10206), using automata, that three palindromes still suffice in bases 3 and 4, but base 2 needs four.

## Testing it properly

Revisiting the code for this post, I wrote a strict checker. For each answer it checks that every digit is valid for the base, that each of the three numbers really is a palindrome (no sneaky leading zeros), and that they add up to $$n$$ *in that base*. My original 2019 tester added the answers up as if they were base-10 numbers, so in any other base it couldn't tell a right answer from a wrong one.

Random numbers almost never hit the awkward cases, so I also fed it numbers built mostly from the digits 0, 1, 2, 3, $$g-2$$ and $$g-1$$. Out of 560,000 such numbers, 21 came back wrong, all with a "digit" equal to the base or more. All of them were even-length numbers of type B with at least 8 digits, which pointed to Algorithm IV's adjustment step.

The culprit was case IV.4.iii. The paper splits it on whether the middle digit $$y_{m-1}$$ of the second palindrome is $$g-1$$ or $$g-2$$. My code tested its neighbour $$y_{m-2}$$ instead. So it sometimes added 2 to a $$y_{m-1}$$ that was already $$g-2$$ or $$g-1$$. A one-character fix. After that:

- every number below $$5^9$$ in base 5, below $$6^8$$ in base 6, below $$7^7$$ in base 7, below $$8^7$$ in base 8, below $$10^7$$ in base 10 and below $$16^5$$ in base 16 is correct (about 17.6 million numbers), and
- nearly a million random and deliberately awkward numbers in every base from 5 to 36, up to 60 digits long, are all correct too.

To be safe, the script now checks every answer before returning it, so if anything were still wrong you would see an error rather than a wrong sum. It is also fast: even a 5000-digit number takes well under a second, in the browser too.

## Run it yourself

The script is [here]({{ "/code_stuff/sumof3palindromes.py" | relative_url }}) and needs nothing but Python 3:

```
$ python3 sumof3palindromes.py              # interactive
$ python3 sumof3palindromes.py test 1 100000 7    # check 1..100000 in base 7
```

or from Python:

```python
>>> from sumof3palindromes import solve
>>> solve(16, "DEADBEEF")["palindromes"]
['D111111D', 'D44144D', '589985']
```
