# DISEMINER MCP Server

Deterministic archetypal narrative engine. No LLM. No transformer. Graph-based Monte Carlo sampling through XNOR ATO-transformed I Ching house space with Klein Tool context-dependent emergent behavior primitives.

## Architecture

```
┌─ React Native Client (Living Mirror)
│   └─ Gate Visualizer · Sentence Builder · Narrative Explorer
│
├─ MCP Client (TypeScript)
│   └─ Discovers tools · Calls functions · Renders responses
│
├─ MCP Server (Node.js)
│   ├─ query_gate ──────→ Gate → Sentence + Physics + Codon
│   ├─ transform_house ─→ ATO XNOR → Transformed classification
│   ├─ simulate_narrative → Monte Carlo → Best path + Distribution
│   ├─ evaluate_klein_tools → Joint evaluation → Emergent relation
│   ├─ compute_resonance ─→ Harmonic alignment score
│   └─ get_codon_mapping ─→ DNA → Amino Acid → Mineral
│
└─ Data Layer (SQLite/JSON)
    ├─ 64 Gates + Lines + Colors + Tones + Bases + Degrees
    ├─ 64 Codons + Amino Acids + Minerals (Castro-Chavez)
    ├─ 8 Houses + Trigrams (Klein 1983)
    └─ Append-only Evaluation Ledger (determinism after collapse)
```

## Core Principles

1. **No LLM** — All operations are deterministic graph traversal, matrix operations, and seeded random sampling.
2. **XNOR ATO** — House transformations use Klein's strong equivalence operator (biconditional/XNOR) on trigrams.
3. **Klein Tools** — Context-dependent emergent behavior primitives. Joint evaluation produces third qualities not derivable from individual outputs.
4. **Determinism After Collapse** — Same context → same result, forever. Append-only ledger.
5. **Five Sentence Types** — SPACE (I Think), MIND (I Remember), SOUL (I Design), BODY (I Am), HEART (I Create).

## Files

| File | Purpose |
|------|---------|
| `ato-engine.ts` | XNOR ATO, trigram/hexagram registry, 8 houses |
| `klein-tool-engine.ts` | Klein Tool registry, context evaluator, decomposition engine, append-only ledger |
| `monte-carlo-sampler.ts` | W-profile derivation, sentence builder, Monte Carlo narrative sampler |
| `diseminer-mcp-server.ts` | MCP server with 10 tools + 5 resources |
| `LivingMirrorApp.tsx` | React Native client |
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Start MCP server
npm start

# In another terminal, test with MCP client
npm run client
```

## MCP Tools

### query_gate
Query a Human Design gate and return its full semantic, physical, and biological mapping.

```json
{
  "gate": 6,
  "line": 4,
  "color": 4,
  "tone": 3,
  "base": 2
}
```

### transform_house
Apply ATO (XNOR) transformation to an I Ching house.

```json
{
  "houseId": 1,
  "atoOperator": "110"
}
```

### simulate_narrative
Run Monte Carlo narrative simulation from a user query.

```json
{
  "query": "How do I resolve this conflict?",
  "chartData": {
    "sunGate": 6, "sunLine": 4, "sunColor": 4,
    "sunTone": 3, "sunBase": 2,
    "earthGate": 36, "earthLine": 1
  },
  "nSamples": 1000,
  "seed": 42
}
```

### evaluate_klein_tools
Evaluate Klein Tools at a node (context-dependent emergent behavior).

```json
{
  "nodeId": "user-123-gate-6",
  "activeToolIds": ["gate-6-primary", "gate-6-secondary"],
  "decompose": true,
  "decomposeDepth": 1
}
```

## W-Dimensions

| Dimension | Name | Function |
|-----------|------|----------|
| w1 | Impulse Field | Raw query energy |
| w2 | Polarity Tension | Doubt/resistance vector |
| w3 | Witness Position | Observer stability |
| w4 | Context Envelope | Situational breadth |
| w5 | Meaning Crystallization | Attractor depth |

## References

- Klein, S. (1983). "Analogy, Mysticism, and the Structure of Culture." *Current Anthropology* 24(2).
- Klein, S., Lieman, S.L., & Lindstrom, G.E. (1968). "DISEMINER: A Distributional-Semantics Inference Maker." *Computer Studies in the Humanities and Verbal Behavior* 1:10-20.
- Castro-Chavez et al. (2012). "Defragged Binary I Ching Genetic Code Chromosomes." *J Proteome Sci Comput Biol* 2012(1):3.
- Hu, Z. et al. (2017). "I-Ching, dyadic groups of binary numbers and the geno-logic coding in living bodies." *Prog Biophys Mol Biol*.

## License

MIT
