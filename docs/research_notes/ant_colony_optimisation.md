---
title: 'Ant Colony Optimisation'
permalink: /research/aco
tags:
    - Comp Sci
---

## Authors  
1. Marco Dorigo  
2. Mauro Birattari  
3. Thomas Stutzle

## Introduction  
Swarm intelligence is a relatively new approach that takes inspiration from the social behaviour of ants and of other animals. It is more of foraging behaviour. These ants deposit pheromone on the ground in order to mark some favourable path that should be followed by other members of the colony.

## Application to the TSP (Travelling Salesman Problem)
Consider the classic TSP, where the task is to find the shortest tour that allows each city to be visited once and only once. This is equivalent to the goal of finding a Hamiltonian Tour of minimal length on a fully connected graph. In ant colony optimisation, the solution is by simulating a number of artificial ants moving on a graph. Let $V$ = set of cities and $E$ be the set of edges connecting the cities.

The ant colony optimisation is an iterative algorithm. 1 iteration : a fixed number of artificial ants are considered. Each of them builds a solution by walking from 1 vertex to another with the constraint of not visiting any vertex more than once. At each step of the solution construction, an ant selects the following vertex to be visited in a stochastic process that is based on the pheremone levels of th


