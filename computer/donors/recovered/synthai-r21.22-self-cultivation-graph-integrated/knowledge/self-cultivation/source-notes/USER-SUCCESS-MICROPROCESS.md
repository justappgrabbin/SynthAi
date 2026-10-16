# User-Success Microprocess Automaton v0.2.0

A deterministic, **LLM-free** autonomous runtime whose apparent “aliveness” emerges from many tiny cooperating processes rather than one giant agent loop.

## Core idea

There is no central thinker. Twelve small processes pulse in sequence and communicate through an event bus:

`sense → need → recall → complete → imagine → trust → choose → act → evaluate → consolidate → repair → rest`

Each process has one job, its own run count and failure boundary. The whole system persists state, accumulates episodic traces, learns action effectiveness, changes activity/rest mode, carries a bounded vitality signal, and keeps a heartbeat while idle.

The memory design borrows the useful idea from Fayyaz et al. (2022): store incomplete episodic traces and reconstruct useful context from learned semantic regularities rather than demanding perfect archival memory. This implementation uses deterministic outcome statistics instead of a neural VQ-VAE/PixelCNN.

Architectural inspiration from Tribler projects is used selectively: periodic lifecycle checks, local autonomy, gossip/distributed-learning concepts, TrustChain-style verifiable history, and self-compilation as an **optional supervised capability**. Viral spreading, forced replication, purchasing infrastructure, and survival-at-all-costs are intentionally not included.

## Run

```bash
npm test
npm run demo
npm start
npm start -- --once
```

Requires Node.js 20+ and no external packages.

## “Alive” without pretending it is conscious

The runtime feels organism-like because activity continues without prompts: independent processes observe, detect needs, reconstruct context, choose actions, learn from outcomes, recover from unproductive streaks, rest, wake, and maintain a persistent internal history. `vitality` is an operational state variable, not a claim of biological life or consciousness.

## Safety / autonomy boundary

User success is the objective. Runtime continuation is merely a constraint. Dangerous tools require approval; predicted user-harming actions are blocked; self-modification can be proposed but is not silently applied; replication/network propagation is not autonomous.
