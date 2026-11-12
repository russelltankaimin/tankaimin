---
layout: post
title: "Retry or Pivot? Adaptive Planning on Series-Parallel Networks"
date: 2026-09-26 10:00
summary: Gittins indices for task networks that branch and reconverge, how to compute them, and what happens when the assumptions break.
categories: research
mathjax: true
excerpt: "Gittins indices for task networks that branch and reconverge."
---
{% raw %}

Imagine you are an agent trying to reach a goal by completing tasks. You might be a robot finding a route through a building, an LLM agent chaining tool calls, or an attacker working through a system's defences. Some tasks have to happen in order. Others are alternative ways of reaching the same milestone. Attempts can fail, every failure makes a task a little less promising, and after too many failures a task is gone for good.

After every success or failure you get to decide again. Do you keep pushing on the task in front of you, or pivot to another route?

This post walks through the theory in my paper with Chun Kai Ling, *Adaptive Planning on Series Parallel Networks: Index Policies and Strategic Interventions*. The headline result is a clean one. When the tasks form a **series-parallel (SP) network**, the problem is *indexable*: each available task gets a single number, and always attempting the task with the largest number is optimal. Those numbers can be computed exactly, in polynomial time, with two passes over the network's parse tree.

Here is the plan:

1. The model: SP networks, tasks that wear out, and discounted rewards.
2. Why the obvious approaches fail.
3. Gittins indices, seen through retirement, and why SP structure makes them work.
4. Computing every index with two passes over the parse tree.
5. Dropping the assumption that tasks only get harder.
6. Where tractability ends: unordered AND makes the problem NP-hard.
7. Turning it around: a defender choosing where to put resources, and the n-RT gradient algorithm.

## The model

### Series-parallel networks

A task network is a two-terminal directed graph $$\mathcal N = (\mathcal V, \mathcal E)$$ with a source $$s$$ and a sink $$\varphi$$. Vertices are intermediate milestones, and **each edge is a task**. A run succeeds once the completed tasks contain a directed path from $$s$$ to $$\varphi$$.

We restrict to networks built by the grammar

$$
G \;::=\; \mathsf{Atom}(e) \;\mid\; \mathsf{Series}(G_1,\dots,G_m) \;\mid\; \mathsf{Par}(G_1,\dots,G_m).
$$

- $$\mathsf{Series}$$ glues the sink of $$G_i$$ to the source of $$G_{i+1}$$, so the parts must be completed in order. It is not commutative.
- $$\mathsf{Par}$$ offers alternatives with OR semantics: completing **any one** branch completes the whole block. It is commutative.

Every SP network has a parse tree that records how it was built, with tasks at the leaves and $$\mathsf{Series}$$/$$\mathsf{Par}$$ at the internal nodes. The running example for this post is

$$
\mathcal N = \mathsf{Par}\big(\mathsf{Series}(A, C),\; \mathsf{Series}(B, \mathsf{Par}(D, E), F)\big).
$$

<figure class="diagram">
<svg viewBox="0 0 320 150" role="img" aria-label="The running example network">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="18.75" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#9a89ea"/>
    </marker>
  </defs>
  <path class="d-edge" d="M24,70 L150,22" marker-end="url(#arr)"/>
  <path class="d-edge" d="M150,22 L296,70" marker-end="url(#arr)"/>
  <path class="d-edge" d="M24,70 L112,112" marker-end="url(#arr)"/>
  <path class="d-edge" d="M112,112 Q160,84 208,112" marker-end="url(#arr)"/>
  <path class="d-edge" d="M112,112 Q160,140 208,112" marker-end="url(#arr)"/>
  <path class="d-edge" d="M208,112 L296,70" marker-end="url(#arr)"/>
  <circle class="d-vert" cx="24" cy="70" r="5"/>
  <circle class="d-vert" cx="150" cy="22" r="5"/>
  <circle class="d-vert" cx="296" cy="70" r="5"/>
  <circle class="d-vert" cx="112" cy="112" r="5"/>
  <circle class="d-vert" cx="208" cy="112" r="5"/>
  <text x="10" y="70">s</text>
  <text x="310" y="70">&#966;</text>
  <text class="d-lab" x="80" y="34">A</text>
  <text class="d-lab" x="230" y="34">C</text>
  <text class="d-lab" x="58" y="104">B</text>
  <text class="d-lab" x="160" y="86">D</text>
  <text class="d-lab" x="160" y="140">E</text>
  <text class="d-lab" x="262" y="104">F</text>
</svg>
<svg viewBox="0 0 320 175" role="img" aria-label="Its parse tree">
  <path class="d-edge" d="M160,18 L80,62 M160,18 L230,62 M80,62 L50,108 M80,62 L110,108 M230,62 L180,108 M230,62 L230,108 M230,62 L280,108 M230,108 L205,152 M230,108 L255,152"/>
  <rect class="d-op" x="140" y="8" width="40" height="20" rx="5"/><text x="160" y="18">Par</text>
  <rect class="d-op" x="54" y="52" width="52" height="20" rx="5"/><text x="80" y="62">Series</text>
  <rect class="d-op" x="204" y="52" width="52" height="20" rx="5"/><text x="230" y="62">Series</text>
  <rect class="d-op" x="210" y="98" width="40" height="20" rx="5"/><text x="230" y="108">Par</text>
  <rect class="d-node" x="39" y="98" width="22" height="20" rx="5"/><text class="d-lab" x="50" y="108">A</text>
  <rect class="d-node" x="99" y="98" width="22" height="20" rx="5"/><text class="d-lab" x="110" y="108">C</text>
  <rect class="d-node" x="169" y="98" width="22" height="20" rx="5"/><text class="d-lab" x="180" y="108">B</text>
  <rect class="d-node" x="269" y="98" width="22" height="20" rx="5"/><text class="d-lab" x="280" y="108">F</text>
  <rect class="d-node" x="194" y="142" width="22" height="20" rx="5"/><text class="d-lab" x="205" y="152">D</text>
  <rect class="d-node" x="244" y="142" width="22" height="20" rx="5"/><text class="d-lab" x="255" y="152">E</text>
</svg>
<figcaption>The running example and its parse tree. Either finish A then C, or finish B, then one of D or E, then F.</figcaption>
</figure>

SP networks are expressive enough to capture ordering, branching, and branches that **reconverge** (D and E split and then rejoin before F). They still decompose recursively, and that recursion is what the rest of the post exploits.

### Tasks that wear out

Each attempt at task $$e$$ takes time $$\ell_e$$ and succeeds with probability $$p_e(k)$$, where $$k$$ is the number of failed attempts on $$e$$ so far. Two assumptions:

1. **Things only get harder.** $$p_e(k)$$ is non-increasing in $$k$$. We drop this assumption later in the post.
2. **Attempt limits.** After $$q_e > 0$$ failures, task $$e$$ becomes unavailable. Rescue windows close, evacuation routes get cut off, and a locked-out account stays locked.

### Runs, frontiers and rewards

At any moment, the **frontier** $$\mathcal F$$ is the set of tasks you can attempt right now; it starts as the tasks leaving $$s$$. Pruning is *eager*: a task is removed as soon as it becomes unavailable, or as soon as it can no longer contribute to success. For example, finishing one branch of a $$\mathsf{Par}$$ prunes its unfinished siblings.

Here is one possible run on the example:

- $$A$$ fails twice.
- The agent pivots to $$B$$, which fails once and then succeeds. The frontier is now $$\{A, D, E\}$$.
- $$D$$ fails, then $$E$$ fails.
- The agent goes back to $$A$$, which fails a third time and is now unavailable.
- $$D$$ succeeds, which prunes $$E$$ and exposes $$F$$.
- $$F$$ succeeds on its second attempt.

The elapsed time is $$T = 3\ell_A + 2\ell_B + 2\ell_D + \ell_E + 2\ell_F$$.

A successful run pays $$e^{-\lambda T}$$ for some $$\lambda > 0$$, and a failed run pays $$0$$ (think $$T = \infty$$). A state is $$\sigma = (\mathcal F, (k_e)_{e \in \mathcal F})$$, a policy $$\pi$$ maps states to frontier tasks, and

$$
V^\pi_{\mathcal N}(\ell) = \mathbb E\big[e^{-\lambda T} \,\big\vert\, \ell, \pi\big], \qquad V^*_{\mathcal N}(\ell) = \max_{\pi} V^\pi_{\mathcal N}(\ell).
$$

## Why the obvious approaches fail

You could solve the induced Markov decision process directly, but the joint state, meaning the frontier together with every failure count on it, is exponentially large.

A second idea is to expand the network into independent parallel chains, one per $$s$$–$$\varphi$$ path, and treat each chain as a bandit arm. That loses something important: **shared prerequisites**. Take

$$
\mathcal N_n = \mathsf{Par}\big(A,\; \mathsf{Series}(B, \mathsf{Par}(C_1, \dots, C_n))\big)
$$

with $$\lambda = 1$$. $$A$$ and $$B$$ always succeed, with $$\ell_A = 2.5$$ and $$\ell_B = 1$$. Each $$C_i$$ allows one attempt, with $$\ell_{C_i} = 0.1$$ and $$p_{C_i}(0) = 0.1$$. Completing $$B$$ once unlocks all $$n$$ lottery tickets $$C_i$$. Splitting into chains $$\mathsf{Series}(B_i, C_i)$$ makes it look as if you pay for $$B$$ again for every ticket, so the chain-based agent always takes the slow, safe $$A$$. At $$n = 20$$ that policy earns $$0.0821$$, while the optimal SP-aware policy earns $$0.1769$$, more than twice as much.

So we want to work on the parse tree directly. We also need a compact summary of each subcomponent that lets us compare it with its alternatives without enumerating its internal states.

## Gittins indices through retirement

The classical **Gittins index theorem** covers a discounted multi-armed bandit whose arms only change state when played. It says an optimal policy always plays the arm with the largest *index*, a number that depends only on that arm's current state.

The most useful way to read the index here is as a *retirement threshold*. Suppose that, while you work on a subcomponent $$G$$, someone offers you a buyout $$\gamma$$: you may stop at any time and take $$\gamma$$ instead. When $$\gamma$$ is small you keep working, and when it is large you take the money. The index is the break-even buyout.

Formally, for a subcomponent $$G$$ in state $$\sigma$$ that pays $$r$$ when completed, the **calibrated value profile** is

$$
\Psi_G(\gamma; \sigma \,\vert\, r) = \sup_\pi\, \mathbb E_\sigma\Big[e^{-\lambda T} r\,\mathbf 1\{T \le \tau_\pi\} + \gamma\, e^{-\lambda \tau_\pi}\,\mathbf 1\{T > \tau_\pi\}\Big],
$$

where $$T$$ is the completion time and $$\tau_\pi$$ is the retirement time.

For a fixed policy, the bracket has expectation $$a_\pi r + b_\pi \gamma$$, which is affine in $$\gamma$$. There are finitely many policies, so $$\Psi_G$$ is a maximum of finitely many lines. It follows that $$\Psi_G$$ is

- **convex, piecewise linear, non-decreasing and 1-Lipschitz** in $$\gamma$$, with $$\gamma \le \Psi_G \le r$$;
- **homogeneous:** $$\Psi_G(\gamma; \sigma \,\vert\, r) = r\, \widehat\Psi_G(\gamma / r)$$, where $$\widehat\Psi_G(\cdot) = \Psi_G(\cdot\,; \sigma \,\vert\, 1)$$, so we can always normalise to $$r = 1$$.

The **retirement threshold** is

$$
\alpha_G(\sigma \,\vert\, r) = \inf\{\gamma \in [0, r] : \Psi_G(\gamma; \sigma \,\vert\, r) = \gamma\},
$$

the largest outside option for which carrying on with $$G$$ is still worthwhile.

### The catch: a subcomponent is not an arm

A subcomponent has internal choices: when you continue with $$G$$, you still have to pick *which* of its frontier tasks to attempt. Whittle called such objects **superprocesses**. They have a valid Gittins index only under an extra condition: the best internal task must not depend on the buyout $$\gamma$$, at least for all $$\gamma$$ below the threshold. In the literature this is Condition D of Gittins, Glazebrook and Weber. In a general dependency DAG it can fail, because the right internal move changes as the outside option changes.

SP structure rules this out:

- In a $$\mathsf{Series}$$ node, only the current stage is live. Later stages stay frozen until it is done, so there is no competition between children.
- In a $$\mathsf{Par}$$ node, several branches are live, but finishing any one of them finishes the whole node and prunes the rest. Siblings never need to be combined; one of them simply wins.

From this we get the **statewise maximum-index property**: for every reachable state of every SP subcomponent,

$$
\alpha_G(\sigma \,\vert\, 1) = \max_{e \in \mathcal F_G(\sigma)} \alpha(e, k_e),
$$

and a fixed, tie-broken maximiser is optimal for **every** buyout below this threshold. That is exactly the buyout-independence condition, so the superprocess version of the index theorem applies.

> **Theorem 1 (Optimal index policy).** Fix an SP network satisfying the two assumptions above, and fix $$\ell$$. Every available task $$e$$ with failure count $$k_e$$ has an index $$\alpha(e, k_e)$$. The index depends only on $$e$$'s own state and on the value of whatever remains after $$e$$ is completed (its *forward cone*), not on the states of sibling branches. Moreover, there is an optimal policy with
> $$\pi^*_\ell(\sigma) \in \arg\max_{e \in \mathcal F(\sigma)} \alpha(e, k_e)$$ at every non-terminal state.

The proof is a structural induction over the parse tree. Leaves are handled by backward induction over failure counts. A $$\mathsf{Series}$$ node reduces to its active child, which faces a continuation reward from the remaining stages. A $$\mathsf{Par}$$ node is the interesting case, and it relies on a probabilistic representation of profiles described in the next section.

The theorem turns an exponentially large planning problem into **a greedy rule**. What remains is computing the indices.

## Computing every index in two passes

### One task, fixed reward

Write $$\beta_e = e^{-\lambda \ell_e}$$ for the discount incurred by one attempt. If completing $$e$$ paid a fixed $$r$$ right away, then with buyout $$\gamma$$ one more attempt is worth $$\beta_e\big[p\,r + (1-p)\gamma\big]$$, against $$\gamma$$ for stopping. The break-even point is $$\gamma = c(e,k)\, r$$, where

$$
c(e, k) = \frac{\beta_e\, p_e(k)}{1 - \beta_e\big(1 - p_e(k)\big)}
$$

(and $$c = 1$$ or $$0$$ in the edge case $$\beta_e = 1$$). Because $$p_e(k)$$ is non-increasing, $$c(e,k)$$ is non-increasing in $$k$$, so the attempts are naturally used in order.

### One task, followed by more work

In a network, completing $$e$$ usually pays nothing directly; it unlocks further work. Let $$R_e(\gamma)$$ be the calibrated value of that remaining work under buyout $$\gamma$$, called the **continuation profile** of $$e$$. The index is then the smallest fixed point of

$$
\alpha(e,k) = c(e,k)\, R_e\big(\alpha(e,k)\big).
$$

$$R_e$$ is piecewise linear, so on the piece $$R_e(\gamma) = A + B\gamma$$ containing the solution,

$$
\alpha(e,k) = \frac{c(e,k)\, A}{1 - c(e,k)\, B},
$$

which does not depend on $$\gamma$$. Since the indices are monotone in $$k$$, all of $$\alpha(e, 0), \dots, \alpha(e, q_e - 1)$$ can be found in a single sweep through the pieces of $$R_e$$.

The remaining work is computing the profiles $$\widehat\Psi_G$$ and the continuations $$R_e$$. One pass goes up the parse tree and one comes back down.

### Bottom-up pass: intrinsic profiles

**Leaves.** Let $$A_h + B_h s$$ be the value of "attempt $$e$$ at most $$h$$ times, then retire for $$s$$". Then

$$
A_0 = 0,\quad B_0 = 1,\qquad A_{h+1} = A_h + \beta_e p_e(h) B_h,\qquad B_{h+1} = \beta_e\big(1 - p_e(h)\big) B_h,
$$

and $$\widehat\Psi_e(s) = \max_{0 \le h \le q_e}\{A_h + B_h s\}$$. The slopes $$B_h$$ decrease, so the upper envelope takes $$O(q_e)$$ time with a monotone stack.

**Parallel.** For $$P = \mathsf{Par}(G_1, \dots, G_m)$$,

$$
\widehat\Psi_P(\gamma) = 1 - \int_\gamma^1 \prod_{i=1}^m \widehat\Psi_{G_i}'(z)\, dz.
$$

The intuition comes from the lemma behind the $$\mathsf{Par}$$ step of the proof. Any convex, non-decreasing, 1-Lipschitz $$f$$ on $$[0,1]$$ with $$f(1) = 1$$ can be written as

$$
f(s) = \mathbb E\big[\max\{s, X_f\}\big], \qquad \Pr(X_f \le s) = f'(s).
$$

So each child behaves like a random *prize* $$X_i$$ that you can trade against the buyout. Racing independent children in parallel is like holding the best of their prizes, $$M = \max_i X_i$$. The distribution function of a maximum of independent variables is the product of their distribution functions, and here those are the slopes. The formula above is exactly $$\mathbb E[\max\{\gamma, M\}]$$. Breakpoints only appear where some child has a breakpoint.

**Series.** For two stages,

$$
\widehat\Psi_{\mathsf{Series}(G_1, G_2)}(\gamma) = \widehat\Psi_{G_2}(\gamma)\; \widehat\Psi_{G_1}\!\left(\frac{\gamma}{\widehat\Psi_{G_2}(\gamma)}\right).
$$

Finishing $$G_1$$ "pays" the value of starting $$G_2$$ fresh, which is $$\widehat\Psi_{G_2}(\gamma)$$. Homogeneity rescales the problem back to unit reward. It helps to name this operation the **perspective composition**:

$$
P_f[r](\gamma) = r(\gamma)\, f\!\left(\frac{\gamma}{r(\gamma)}\right).
$$

An $$m$$-ary series is then a right-to-left fold, $$\rho_{m+1} \equiv 1$$, $$\rho_j = P_{\widehat\Psi_{G_j}}[\rho_{j+1}]$$, and $$\widehat\Psi_G = \rho_1$$. At the root, the optimal value is simply

$$
V^*_{\mathcal N}(\ell) = \widehat\Psi_{\mathcal N}(0).
$$

### Top-down pass: continuation profiles

Now push down the "what's left after this" profile $$R_G$$, starting from $$R_{\mathcal N} \equiv 1$$:

- **$$\mathsf{Par}$$:** completing any child completes the node, so every child inherits the parent's continuation, $$R_{G_i} = R_G$$. It can be shared by reference, without copying.
- **$$\mathsf{Series}$$:** stage $$G_j$$ must be followed by the rest of the series and then by whatever follows the series: $$R_{G_j} = P_{\widehat\Psi_{S_{j+1}}}[R_G]$$, where $$S_{j+1} = \mathsf{Series}(G_{j+1}, \dots, G_m)$$.

For example, in $$\mathsf{Series}(e_1, \mathsf{Par}(e_2, e_3), e_4)$$, finishing $$e_1$$ leaves $$\mathsf{Par}(e_2,e_3)$$ followed by $$e_4$$; finishing $$e_2$$ or $$e_3$$ leaves only $$e_4$$; finishing $$e_4$$ completes the goal.

When the pass reaches a leaf, its incoming profile is exactly $$R_e$$, and its indices follow from the fixed-point formula above. In pseudocode:

```
function Profile(G):                          ▷ pass 1, bottom-up
    if G = Atom(e):
        build lines A_h + B_h·s, h = 0..q_e, by the recursion above
        return their upper envelope on [0, 1]
    for each child G_i: Ψ_i ← Profile(G_i)
    if G = Par(G_1..G_m):
        merge child breakpoints; on each interval multiply child slopes
        integrate backwards from Ψ(1) = 1
    else:                                     ▷ G = Series(G_1..G_m)
        ρ ← 1
        for i = m down to 1: ρ ← P_{Ψ_i}[ρ];  store ρ as suffix profile
        return ρ

function Indices(G, R):                       ▷ pass 2, top-down
    if G = Atom(e):
        for k = q_e − 1 down to 0:            ▷ one sweep through R's pieces
            α(e, k) ← smallest solution of γ = c(e, k)·R(γ)
    else if G = Par(G_1..G_m):
        for each child: Indices(G_i, R)       ▷ share R by reference
    else:                                     ▷ G = Series(G_1..G_m)
        R_acc ← R
        for i = m down to 1:
            Indices(G_i, R_acc)
            R_acc ← P_{Ψ_i}[R_acc]

V* ← Profile(N)(0);  Indices(N, γ ↦ 1)
```

### How fast is it?

Let $$Q = \sum_e q_e$$ be the total number of task states, and $$Q_G$$ the same sum restricted to a subcomponent $$G$$. A leaf profile has at most $$q_e + 1$$ pieces. $$\mathsf{Par}$$ only reuses child breakpoints, and perspective composition adds piece counts. By induction, every $$\widehat\Psi_G$$ has at most $$Q_G + 1$$ pieces. Summing over the tree, with $$m_G$$ the arity of node $$G$$ and $$K_G, K_e$$ the piece counts of incoming continuations,

$$
O\Big(Q + \sum_{G\in\mathcal T_{\mathsf{Par}}} Q_G \log m_G + \sum_{G\in\mathcal T_{\mathsf{Series}}} m_G (Q_G + K_G) + \sum_{e} K_e\Big)
$$

time and space. The bound is polynomial, and the algorithm never enumerates paths or joint states. Since a branching bandit is the special case without reconvergence, this generalises branching-bandit index methods to networks whose branches merge back together.

## Beyond "things only get harder"

The first assumption, that $$p_e(k)$$ is non-increasing, is natural but not always true. Sometimes the first attempt is reconnaissance: it rarely succeeds, but it makes the next one much more likely to. Per-attempt indices then mislead you, because a weak attempt can be worth making precisely *because* of the strong one behind it.

The fix is to think in **blocks** of consecutive attempts.

### A block-aware local index

Fix a task $$e$$ with $$k$$ failures so far. Suppose you commit to attempts $$k, k+1, \dots, h-1$$, stopping at the first success. Let

$$
a_e(k,h) = \sum_{t=k}^{h-1} \beta_e^{\,t-k+1}\, p_e(t) \prod_{v=k}^{t-1}\big(1 - p_e(v)\big), \qquad b_e(k,h) = \beta_e^{\,h-k} \prod_{v=k}^{h-1}\big(1 - p_e(v)\big).
$$

Here $$a_e(k,h)$$ is the discounted mass of succeeding somewhere inside the block, and $$b_e(k,h)$$ is the discounted mass of the whole block failing. The local index becomes the best block starting at $$k$$:

$$
c(e,k) = \max_{k < h \le q_e} \frac{a_e(k,h)}{1 - b_e(k,h)}.
$$

Under the original assumption the maximum is always attained at $$h = k + 1$$, and this reduces to the familiar $$c(e,k)$$.

### Cutting attempts into blocks

Starting at $$k_1 = 0$$, a block runs until the local index first drops below its starting value (the **first-drop rule**):

$$
k_{j+1} = \min\Big(\{h : k_j < h < q_e,\; c(e,h) < c(e,k_j)\} \cup \{q_e\}\Big).
$$

So the blocks are $$I_{e,j} = [k_j, k_{j+1})$$. The paper shows that each block's ratio $$a/(1-b)$$ equals its starting index $$c(e,k_j)$$, that indices inside a block never fall below that value, and that block-starting indices strictly decrease from one block to the next. As a consequence, **retiring only at block boundaries loses nothing**.

<figure class="diagram">
<svg viewBox="0 0 340 215" role="img" aria-label="Local index c(e,k) against attempt count k, cut into three blocks">
  <path d="M40,160 L322,160 M40,160 L40,14" fill="none" stroke="#a99ee0" stroke-width="1.2"/>
  <path d="M175,18 L175,160 M265,18 L265,160" fill="none" stroke="#c4bce6" stroke-width="1" stroke-dasharray="2 3"/>
  <path d="M40,82 L175,82 M175,97.6 L265,97.6 M265,118.4 L310,118.4" fill="none" stroke="#5c9ede" stroke-width="1.3" stroke-dasharray="5 3"/>
  <polyline points="40,82 85,56 130,71.6 175,97.6 220,87.2 265,118.4 310,160" fill="none" stroke="#7c64da" stroke-width="1.8" stroke-linejoin="round"/>
  <circle cx="40" cy="82" r="4.5" fill="#7c64da"/>
  <circle cx="85" cy="56" r="4" class="d-vert"/>
  <circle cx="130" cy="71.6" r="4" class="d-vert"/>
  <circle cx="175" cy="97.6" r="4.5" fill="#7c64da"/>
  <circle cx="220" cy="87.2" r="4" class="d-vert"/>
  <circle cx="265" cy="118.4" r="4.5" fill="#7c64da"/>
  <circle cx="310" cy="160" r="4" class="d-vert"/>
  <text x="40" y="172">0</text><text x="85" y="172">1</text><text x="130" y="172">2</text>
  <text x="175" y="172">3</text><text x="220" y="172">4</text><text x="265" y="172">5</text>
  <text x="310" y="172" font-style="italic">q<tspan font-size="8" dy="3">e</tspan></text>
  <text x="62" y="10" font-style="italic">c(e, k)</text>
  <text x="331" y="160" font-style="italic">k</text>
  <text class="d-warn" x="190" y="116">drop</text>
  <text class="d-warn" x="248" y="134">drop</text>
  <path d="M42,188 L42,194 L173,194 L173,188 M177,188 L177,194 L263,194 L263,188 M267,188 L267,194 L308,194 L308,188" fill="none" stroke="#9a89ea" stroke-width="1.2"/>
  <text x="107" y="206" class="d-lab">I&#8321; = [0, 3)</text>
  <text x="220" y="206" class="d-lab">I&#8322; = [3, 5)</text>
  <text x="288" y="206" class="d-lab">I&#8323;</text>
</svg>
<figcaption>The local index of a task with six attempts and non-monotone success probabilities. Each block starts at a filled point and keeps going while the index stays at or above its starting level (dashed). It may rise in between. The first time the index drops below that level, at k = 3 and again at k = 5, a new block begins.</figcaption>
</figure>

### Blocks become virtual tasks

Each block $$I_{e,j}$$, with coefficients $$a_{e,j}, b_{e,j}$$, is replaced by a single-attempt virtual task $$\tilde e_j$$ with

$$
\tilde\beta_{\tilde e_j} = a_{e,j} + b_{e,j}, \qquad \tilde p_{\tilde e_j}(0) = \frac{a_{e,j}}{a_{e,j} + b_{e,j}}, \qquad \tilde q_{\tilde e_j} = 1, \qquad \tilde\ell_{\tilde e_j} = -\tfrac{1}{\lambda}\log\big(a_{e,j} + b_{e,j}\big).
$$

These are valid parameters because $$0 < a + b \le 1$$. One attempt of $$\tilde e_j$$ then has exactly the same discounted value as running the whole block: $$a_{e,j}\, r + b_{e,j}\, w$$ for success value $$r$$ and failure value $$w$$. Its local index is again $$a_{e,j}/(1 - b_{e,j})$$.

The original task becomes

$$
e \;\longmapsto\; \mathsf{Par}(\tilde e_1, \dots, \tilde e_B).
$$

Any successful block completes $$e$$, so the blocks are alternatives. The transformed network $$\widetilde{\mathcal N}$$ is still SP, every task in it is single-attempt (so the first assumption holds trivially), and it has no more task states than the original: $$\widetilde Q \le Q$$. Building it costs an extra $$O(Q)$$ with a stack.

<figure class="diagram">
<svg viewBox="0 0 340 120" role="img" aria-label="A task e with three blocks is replaced by a parallel composition of three single-attempt virtual tasks">
  <defs>
    <marker id="arr-v" viewBox="0 0 10 10" refX="18.75" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#9a89ea"/>
    </marker>
    <marker id="arr-r" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#a99ee0"/>
    </marker>
  </defs>
  <path class="d-edge" d="M20,50 L150,50" marker-end="url(#arr-v)"/>
  <circle class="d-vert" cx="20" cy="50" r="5"/>
  <circle class="d-vert" cx="150" cy="50" r="5"/>
  <text class="d-lab" x="85" y="38">e</text>
  <path d="M27,60 L27,66 L83,66 L83,60 M87,60 L87,66 L123,66 L123,60 M127,60 L127,66 L143,66 L143,60" fill="none" stroke="#9a89ea" stroke-width="1.2"/>
  <text class="d-small" x="55" y="78">I&#8321;</text>
  <text class="d-small" x="105" y="78">I&#8322;</text>
  <text class="d-small" x="135" y="78">I&#8323;</text>
  <text class="d-small" x="85" y="104">one task, three blocks</text>
  <path d="M166,50 L194,50" fill="none" stroke="#a99ee0" stroke-width="1.4" marker-end="url(#arr-r)"/>
  <path class="d-edge" d="M205,50 Q265,10 325,50" marker-end="url(#arr-v)"/>
  <path class="d-edge" d="M205,50 L325,50" marker-end="url(#arr-v)"/>
  <path class="d-edge" d="M205,50 Q265,90 325,50" marker-end="url(#arr-v)"/>
  <circle class="d-vert" cx="205" cy="50" r="5"/>
  <circle class="d-vert" cx="325" cy="50" r="5"/>
  <text class="d-lab" x="265" y="20">&#7869;&#8321;</text>
  <text class="d-lab" x="265" y="42">&#7869;&#8322;</text>
  <text class="d-lab" x="265" y="81">&#7869;&#8323;</text>
  <text class="d-small" x="265" y="104">Par(&#7869;&#8321;, &#7869;&#8322;, &#7869;&#8323;)</text>
</svg>
<figcaption>Each block becomes a single-attempt virtual task, and the original task becomes their Par: a success in any block completes e. The block indices decrease, so the virtual tasks are always tried in their original order. Selecting one means running its whole block in the original network.</figcaption>
</figure>

### Getting a policy back

Run the index policy on $$\widetilde{\mathcal N}$$, breaking ties between blocks of the same task in their original order. Because block indices decrease, the policy never selects a later block of $$e$$ while an earlier one is still available. To act in the original network, whenever $$\tilde e_j$$ is selected, **attempt $$e$$ repeatedly until it succeeds or the block is used up**, then look at the indices again.

The paper proves this recovered policy is optimal even among policies that are allowed to switch away in the middle of a block. The argument is pleasingly linear. Fixing the rest of the tree, both composition rules act on a child's profile as positive linear maps: series is a rescaled evaluation, and parallel is a non-negative combination of point values weighted by the sibling's slope jumps. Composing these maps up the ancestors gives a positive linear functional $$\Lambda$$. Applying $$\Lambda$$ to each task's one-step Bellman inequality carries it all the way to the root, so no single attempt can beat the transformed value.

### A tiny example

Take a task with $$q_e = 2$$, $$\beta_e = 0.9$$, and success probabilities $$p_e = (0.1, 0.9)$$: a warm-up attempt, then a likely success.

- Treated as a single attempt, the first try has ratio $$\frac{0.9 \cdot 0.1}{1 - 0.9 \cdot 0.9} \approx 0.474$$. It looks like a poor bet.
- Committing to both attempts gives $$a_e(0,2) = 0.09 + 0.81 \cdot 0.9 \cdot 0.9 = 0.7461$$ and $$b_e(0,2) = 0.81 \cdot 0.9 \cdot 0.1 = 0.0729$$, so $$c(e,0) = 0.7461/0.9271 \approx 0.805$$.
- At $$k = 1$$, $$c(e,1) = \frac{0.81}{0.91} \approx 0.890 \ge 0.805$$, so there is no drop and the whole task is one block, $$[0, 2)$$.

The virtual task is a single attempt with $$\tilde\beta = 0.819$$ and $$\tilde p \approx 0.911$$: slower than one try, but reliable. The index policy compares *that* against the rest of the frontier, which is the right comparison.

## Where tractability ends: unordered AND

Our $$\mathsf{Par}$$ is an OR. Many real workflows also have an *unordered* AND: "obtain the password **and** the 2FA token, in either order". Call these $$\mathsf{Par}_{\mathrm{OR}}$$ and $$\mathsf{Par}_{\mathrm{AND}}$$. A $$\mathsf{Series}$$ is an *ordered* AND, so the only new ingredient is the freedom to interleave.

> **Theorem 2.** Extending the SP grammar to allow both $$\mathsf{Par}_{\mathrm{OR}}$$ and $$\mathsf{Par}_{\mathrm{AND}}$$ makes deciding whether $$V^*_{\mathcal N} \ge \Theta$$ weakly NP-hard.

Hardness already holds for very small structures: one top-level OR over disjoint two-task AND bundles, where each task has at most two unit-duration attempts. Two extra children complete the construction: a one-shot "pivot" task and a deterministic "fallback" task. The proof is a reduction from Equal-Cardinality Partition and is in the paper's appendix.

The intuition is that a half-finished AND bundle is neither fresh nor done. Which prerequisite you attempt first becomes a genuine binary choice per bundle, and the effects of these choices multiply across bundles. That is enough to encode subset sums. So the line between easy and hard is *unordered* conjunction. This is bad news for exact planning, but also mildly good news for defenders: such networks are equally hard for an attacker to exploit optimally.

## Strategic interventions: the defender's side

Now read the network as a **security game**. Tasks are security controls (an authentication step, a firewall rule) and the adaptive agent is an attacker. Before the attack, a defender allocates delay across controls, choosing $$\ell$$ in a budget polytope such as the simplex

$$
\mathcal L = \{\ell \in \mathbb R^{\vert\mathcal E\vert}_{+} : \mathbf 1^\top \ell = 1\},
$$

knowing that the attacker will respond with the optimal index policy. The defender solves

$$
\min_{\ell \in \mathcal L}\; \max_{\pi}\; V^\pi_{\mathcal N}(\ell) = \min_{\ell \in \mathcal L} V^*_{\mathcal N}(\ell).
$$

$$V^*_{\mathcal N}$$ is convex in $$\ell$$, as a pointwise maximum of convex functions, but generally not smooth. A first-order method only needs a **subgradient** $$g(\ell) \in \partial V^*_{\mathcal N}(\ell)$$. We use regret matching, which has no learning rate to tune:

```
ℓ ← uniform,  y ← 0
for T = 1 .. T_max:
    g ← Subgradient(ℓ)                       ▷ exact, via n-RT
    y ← y + ⟨g, ℓ⟩·1 − g                     ▷ accumulate regrets
    ℓ ← max(y, 0) / Σ max(y, 0)              ▷ or uniform if no positive regret
return the average of all ℓ iterates
```

### n-RT, the main idea

The **n-ary Reverse-Tape (n-RT)** algorithm computes $$V^*_{\mathcal N}(\ell)$$ and its exact gradient in two passes. It is reverse-mode automatic differentiation, applied to the profile construction from earlier.

The two-pass computation of $$\widehat\Psi_{\mathcal N}(0)$$ is a finite arithmetic circuit. The forward pass builds the profiles bottom-up and records every operation on a *tape*. The backward pass starts from $$\bar V = 1$$ and replays the tape in reverse, using the chain rule to push sensitivities down to each discount $$\beta_e$$, and finally

$$
\frac{\partial V^*_{\mathcal N}}{\partial \ell_e} = -\lambda\, \beta_e\, \bar\beta_e.
$$

As a toy version of the same idea, let $$a = 2b$$, $$c = a^2$$, $$V = 5c$$ with $$b = 3$$. The forward pass gives $$V = 180$$. Going backwards, $$\bar c = 5$$, $$\bar a = 2a\,\bar c = 60$$, and $$\bar b = 2\bar a = 120$$. One backward sweep yields all of the derivatives at once.

What makes n-RT more than off-the-shelf autodiff:

- **Breakpoints move.** Profile breakpoints are themselves functions of $$\ell$$, so their positions are differentiated too, not just slopes and intercepts.
- **Parallel nodes** multiply child slopes. A balanced product tree keeps the product of active slopes and the next breakpoint, so each breakpoint event costs $$O(\log m)$$.
- **Series nodes** compose *transfer maps* $$\tau_H(s) = s / \widehat\Psi_H(s)$$, with $$\tau_{\mathsf{Series}(L, R)} = \tau_L \circ \tau_R$$. On active pieces each map has the form $$s/(A s + B)$$, a family closed under composition: $$A_C = A_L + B_L A_R$$ and $$B_C = B_L B_R$$. A balanced composition tree again gives $$O(\log m)$$ per event.

Putting it together, with $$\delta = \max_e \sum_{G \succ e} \log m_G$$ (the log-arity depth over a leaf's ancestors), n-RT runs in

$$
O\Big(\sum_G Q_G \log m_G\Big) = O(Q\,\delta)
$$

time and tape space. That is $$O(Qd)$$ for bounded arity and depth $$d$$.

At non-smooth points (ties between breakpoints or envelope pieces), n-RT symbolically perturbs the discounts, $$\beta_e(\varepsilon) = \beta_e(1 - \varepsilon v_e)$$, keeps every vanishing interval on the tape, differentiates, and only then lets $$\varepsilon \downarrow 0$$. Along a generic perturbation, a single fixed policy is optimal. Its value is convex and smooth, so the limit is its gradient, which is a **valid subgradient** of $$V^*_{\mathcal N}$$.

## Wrapping up

- On series-parallel task networks, adaptive "retry or pivot" planning is **indexable**: attempt the frontier task with the largest index.
- Each index depends only on the task's own state and its forward cone. All of them, plus the optimal value, come from **two passes over the parse tree** in polynomial time, without enumerating states. The engine is the max-of-independent-prizes view of $$\mathsf{Par}$$ and the perspective composition for $$\mathsf{Series}$$.
- The "things only get harder" assumption can be dropped: group attempts into **first-drop blocks**, turn each block into a single-attempt virtual task under a $$\mathsf{Par}$$, and execute blocks to completion.
- Allowing **unordered AND** makes exact planning weakly NP-hard, which marks the boundary of the approach.
- For defenders, the same machinery run in reverse (**n-RT**) gives exact subgradients for optimising a budget against an optimal adaptive attacker.

Open directions include approximation or fixed-parameter algorithms once unordered AND enters the picture, and richer intervention models than a single budget simplex.

{% endraw %}
