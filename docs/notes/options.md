---
layout: default
title: Options
nav_order: 2
parent: Notes
has_children: false
---

# Options

## Definitions
- Call Option : A right to buy the underlying
- Put Option : A right to sell the underlying
- European Option : Right only exercised at maturity
- American Option : Right can be exercised at anytime **BEFORE** maturity.
- Writing (an option) : Selling the option
- Premium : Price or value of an option
- (Option) 
    - At the money : strike price == underlying price
    - In the money : immediate exercise is profitable
    - Out the money : immediate exercise is unprofitable

## Long Call
- Payoff : max(S(T) - K, 0)
- Profit : max(S(T) - K, 0) - C(t, K, T), where K is the strike price, t is the call price
- Short call is just negative of long call

## Long Put
- Payoff : max(K - S(T), 0)
- Profit : max(K - S(T), 0) - P(t, K, T)
- Short put is just negative of long put.








