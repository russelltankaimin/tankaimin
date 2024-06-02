---
title: 'Can Q-Learning with Graph Networks Learn a Generalisable Branching Heuristic for a SAT Solver?'
permalink: /research/q-learn-graph-sat
tags:
    - Comp Sci
---

## Authors:  
1. Vitaly Kurin  
2. Shimon Whiteson   
3. Saad Godil  
4. Bryan Cantanzaro 

## Introduction
*Graph-Q-SAT* is a branching heuristic for a Boolean SAT Solver trained with a *value-based RL* using a **Graph NN** for function approximation. It is trained to examine the structure of the problem instance to make better decisions early in the search. There is no need for elaborate data sets or feature engineering. It somehow reduced the number of iterations (I think they mean decision levels?) by 2-3x of the usual SAT solvers.

It can also generalise to UNSAT instances, and also problem sizes 5x more than what was being trained on.

*Graph-Q-SAT* is a branching heuristic in CDCL. The graph representation is similar to Selsam's representation which provides permutation and variable relabeling invariance. It *outperforms VSIDs*

### Recap on RL
The RL problem as a Markov Decision Process. A state space $S$, a set of actions $A$, a reward function $R(s, a, s')$ and the transition function $T(s, a, s') = p(s, a, s')$. Discount factor $\gamma \in [0, 1)$ weights preferences for immediate reward relative to future reward. 
The last element of the tuple p is the probability distribution over initial states. 

In the case of episodic tasks, the state space is split into the set of non-terminal states and the terminal state S. To solve an MDP means to find an optimal policy, a mapping that outputs an action or distribution over actions given a state and which maximizes the expected discounted return $R = \mathbb{E}\left[\sum_{t=0}^{\infty} \gamma^t r_t\right]
$, where $r_{t} = R(s_{t}, a_{t}, s_{t+1})$ is the reward for the transition from $s_{t}$ to $s_{t+1}$.

### What is GNN?
Formulas are eliminated, new clauses can be added during the solving process. Network architecture must not assume the input to be of the same size. Boolean formula should be invariant to the permutation of the clauses, variables and their renaming. Best to use GNN. Used formalism of Battaglia which is very general.

#### Graph
It is a directed graph $<V, E, U>$ where $V$ is the set of vertices, $E$ is the set of directed edges, with $e_{i,j} = (i, j) \in E, v_i, v_j \in V$ and $U$ is a global attribute which contains the information relevant to the whole graph.

A GNN is a set of 6 functions:  
1. 3 update functions: $\phi_e, \phi_v, \phi_u$  
2. 3 aggreate functions: $\rho_{e \rightarrow v}, \rho_{e \rightarrow u}, \rho_{v \rightarrow u}$  

One iteration of computation which the GNN does:  
$$
e_{ij}' = \phi_e(u, e, v_i, v_j) \quad \forall e_{ij} \in E  
$$  
$$
v_{i}' = \phi_v[u, v_i, \rho_{e \rightarrow v}({e_{ki} | \forall e_{ki} \in E})] \forall v_i \in V  
$$  
$$
u' = \phi_u[u, \rho_{e \rightarrow u}({e_{ij} | \forall e_{ij} \in E}), \rho_{v \rightarrow u}({v_i | \forall v_i \in V})]
$$

A GNN performs multiple iterations to further propagate information in the graph. Neural networks
that represent update functions, can be optimised end-to-end using backpropagation.

## Graph Q-SAT
Each SAT problem is an MDP sampled from a distribution of SAT problems of a specific family (random 3-SAT or graph colouring). A task is defined as follows: $\tau ~ D(\phi, (un)SAT, n_{vars}, n_{clauses})$, where D is the distribution of SAT problems, $\phi$ defines the task family. The rest are self-explanatory. 

The action space includes two actions for each unassigned variable: assigning it to true or false. It takes the actions, modifies its implication graph internally and returns a new state containing newly learned clauses and without the variables removed during propagation. Strictly speaking, this state is not fully observable. 

a. We use a simple reward function: the agent gets a negative reward of $p$ for each non-terminal transition and 0 for reaching the terminal state. This reward encourages an agent to finish an episode as quickly as possible and does not require elaborate reward shaping.

**FACT** Experiments do not take weeks and are easy to iterate on.


