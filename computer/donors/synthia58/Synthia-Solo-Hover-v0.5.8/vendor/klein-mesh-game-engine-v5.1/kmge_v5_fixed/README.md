# Klein-Mesh Multi-Game Engine

> **"Games are languages. The engine learns them like a linguist learns a field language."**

A universal game engine that treats each game as a **language** with its own grammar, learns multiple games into a shared semantic mesh, and switches between them instantly — all using lightweight distributional semantics instead of massive per-game diffusion models.

## The Problem with gameNgen

Current approach: **One 2GB diffusion model per game.**
- DOOM model: 2GB, only knows DOOM
- Zelda model: 2GB, only knows Zelda
- Mario model: 2GB, only knows Mario
- **Switching games = loading a completely different model**
- **Blending games = impossible without retraining**

## The Klein-Mesh Solution

**One shared substrate, multiple game grammars.**

Inspired by Sheldon Klein's complete research apparatus (1963-2002):

| Klein Paper | Year | Game Engine Application |
|-------------|------|------------------------|
| **Comp-Gram-Coder** (JACM) | 1963 | Classify game elements into 30 types (NOUN=entities, VERB=actions, ADJ=properties) without per-game dictionaries |
| **DISEMINER** | 1968 | Dependency matrices store game element relationships (player→enemy, weapon→ammo). Warshall's algorithm for transitive closure. |
| **AUTOLING** | 1968 | Learn each game's "phrase structure grammar" through gameplay interaction. Heuristic rule learning with recycling. |
| **Historical Change** | 1966 | Monte Carlo evolution of game mechanics across simulated generations. Games evolve, merge, give birth to new games. |
| **Syntactic Dependency & Coherent Discourse** | 1976 | Generate coherent gameplay sequences using dependency structure. |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  VQ-VAE CODEBOOK — Shared compression layer (512 codes)     │
│  All games share the same discrete latent space               │
│  ~50KB instead of 2GB per game                               │
└────────────────────┬────────────────────────────────────────┘
                     │ compressed frame tokens
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  COMP-GRAM-CODER (JACM 1963) — 30-class element classifier  │
│  • Suffix test: _ing=ongoing, _ed=completed, _ly=modifier    │
│  • Context triad test: (left.NOUN, 2, right.VERB)          │
│  • Logical multiplication of all test outputs                │
│  • No per-game dictionary needed — learns from context       │
└────────────────────┬────────────────────────────────────────┘
                     │ classified game elements
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  DISEMINER (1968) — Dependency Matrices per game            │
│  • T matrix: transitive links (player SHOOTS enemy)          │
│  • I matrix: intransitive links (player JUMPS)              │
│  • M matrix: merged closure (all possible paths)           │
│  • Warshall's algorithm: O(d²) for sparse game graphs        │
│  • Query: "Is player→enemy possible?" → check M[i][j]        │
└────────────────────┬────────────────────────────────────────┘
                     │ dependency network
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  AUTOLING (1968) — Grammar Learning per game                │
│  • H1: Parse closure → rule (S → player move shoot)          │
│  • H2: Same environment → same class (pistol = shotgun)    │
│  • H4: Recursive rules (S → action S action)                 │
│  • Testing: "CAN YOU SAY: [action sequence]?" → YES/NO        │
│  • Recycling: If grammar parses illegal sequences, destroy   │
│    entire grammar, restart with reordered input              │
└────────────────────┬────────────────────────────────────────┘
                     │ game grammar rules
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  HISTORICAL CHANGE (1966) — Monte Carlo Evolution             │
│  • Population of game agents with grammars                   │
│  • Conversations = gameplay sessions                         │
│  • Parsing success → rule frequency increases                │
│  • Rule borrowing between games → hybrid mechanics           │
│  • Birth/death → new games emerge from old ones              │
│  • Sapir's "drift": games have direction, evolve over time  │
└────────────────────┬────────────────────────────────────────┘
                     │ evolved game mechanics
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  MESSY MESH — Shared substrate                                │
│  • All games coexist as contexts on the same network          │
│  • Switch games by loading different dependency matrices     │
│  • Blend games by merging their grammars and matrices        │
│  • Total size: ~500KB for 10 games vs 20GB for 10 models     │
└─────────────────────────────────────────────────────────────┘
```

## Usage

```typescript
import { KleinMeshGameEngine } from './klein-mesh-game-engine';

const engine = new KleinMeshGameEngine(512); // 512 VQ codes

// Create game contexts
engine.createGame('doom', 'DOOM', 'fps');
engine.createGame('zelda', 'Zelda', 'rpg');
engine.createGame('mario', 'Super Mario', 'platformer');

// Ingest gameplay data (like feeding text to AUTOLING)
engine.ingestGameplay('doom', {
  frames: [frame1, frame2, frame3],  // Float32Array RGB data
  actions: ['move', 'shoot', 'reload', 'move'],
  states: [
    { health: 100, ammo: 50, enemy: 'imp' },
    { health: 90, ammo: 45, enemy: 'imp' },
    { health: 90, ammo: 45, enemy: 'imp' },
  ]
});

// Switch games instantly (no model loading)
engine.switchGame('doom');
const doomAction = engine.generateNextAction();
// → ['player', 'shoot', 'enemy'] (valid DOOM grammar)

engine.switchGame('zelda');
const zeldaAction = engine.generateNextAction();
// → ['link', 'use', 'sword'] (valid Zelda grammar)

// Semantic query
engine.isPossible('player', 'enemy', 'doom'); // true
engine.isPossible('player', 'enemy', 'zelda');  // false (Zelda uses 'link')

// Blend two games
engine.blendGames('doom', 'zelda', 'doomzelda');
// → Hybrid game with merged VQ codes, dependency matrices, and grammar rules

// Evolve a game over 25 simulated years
engine.evolveGame('doom', 25);
// → DOOM mechanics evolve through agent interaction, borrowing, mutation
```

## How It Works

### 1. Comp-Gram-Coder: Classify Without Dictionaries

Klein's 1963 insight: You don't need a 75,000-word dictionary. You can classify words by:
- **Suffix tests**: `-ing` = ongoing action, `-ed` = completed, `-ly` = modifier
- **Context triad frames**: If you see `ARTICLE [?] VERB`, the middle must be NOUN or ADJ
- **Logical multiplication**: If suffix test says NOUN/VERB and context test says NOUN/ADJ, the answer is NOUN

For games:
- `shooting` → VERB/ING (ongoing action)
- `health_potion` → NOUN (suffix `_potion` maps to item class)
- Context: `player [?] enemy` → middle must be VERB (shoot, punch, avoid)

### 2. DISEMINER: Dependency Matrices

Klein's 1968 insight: Store relationships as matrices, not graphs.

```
T matrix (transitive):   player ──shoots──→ enemy
                         player ──opens──→ door
                         key ────unlocks──→ door

I matrix (intransitive): player ──jumps──→ (no object)
                           enemy ──dies───→ (no object)

M = T*I + T* (merged closure)
  → player can reach enemy (direct: shoot)
  → player can reach door (direct: open, or indirect: key→unlock→door)
  → enemy can reach player? (check M[enemy][player])
```

Warshall's algorithm computes all paths in O(d²) where d = number of game elements. For games, d is small (~100 elements), so this is instant.

### 3. AUTOLING: Learn Grammar from Gameplay

Klein's 1968 insight: The linguist can be replaced by a machine.

```
Gameplay session: [move, shoot, reload, move, shoot]

Heuristic 1: S → move shoot reload move shoot

Heuristic 2: "shoot" and "punch" both appear after "move"
             → coin class: shoot, punch ∈ ATTACK_VERBS

Heuristic 4: [move, shoot, move, shoot] → recursive
             S → move S | move shoot S | ε

Testing: "CAN YOU SAY: [shoot, shoot, reload]?"
         Parse with current grammar → FAILS
         Informant (game logic) says NO
         → Add to illegals

Recycling: If grammar later parses [shoot, shoot, reload] as valid,
           destroy entire grammar, restart with reordered sessions.
```

### 4. Historical Change: Evolve Games

Klein's 1966 insight: Languages evolve through speaker interaction. So do games.

```
Population: 20 agents, each with a DOOM grammar

Major cycle (1 year):
  Each agent speaks (generates gameplay sequence)
  Each auditor tries to parse (validate sequence)

  If parse succeeds:
    → Rule frequency increases (more likely to use again)

  If parse fails:
    → Agent may borrow rule from speaker (cross-pollination)

Birth/death:
  Agents die (old grammars forgotten)
  New agents born (inherit community grammar average)

After 25 years:
  → DOOM grammar has evolved
  → Some rules died out, new rules emerged
  → If other games were in population, hybrid rules appeared
```

### 5. The Mesh: Shared Substrate

All games share:
- **One VQ-VAE codebook** (512 codes, ~50KB)
- **One Comp-Gram-Coder** (30 classes, learned from all games)
- **One MESSY semantic network** (all game elements connected by analogy)

Each game has:
- **Its own DISEMINER matrices** (T, I, M for that game's elements)
- **Its own AUTOLING grammar** (rules learned from that game's sessions)
- **Its own Historical Change population** (agents that evolve that game)

**Switching games:** Load different matrices + grammar. No model loading.
**Blending games:** Union of matrices, merge of grammars. No retraining.

## Size Comparison

| Approach | Per Game | 10 Games | Switch Cost | Blend Cost |
|----------|----------|----------|-------------|------------|
| gameNgen (diffusion) | 2GB | 20GB | 2GB load | Impossible |
| Klein-Mesh | 50KB | 500KB | Instant | Instant |

## Files

| File | Purpose | Size |
|------|---------|------|
| `klein-mesh-game-engine.ts` | Multi-game engine with all 5 Klein tools | ~42KB |
| `core-engine.ts` | D1-D5 gap-filling ingestion engine | ~40KB |
| `ato-engine.ts` | Episodic memory + semantic completion | ~35KB |
| `klein-full-toolkit.ts` | 8 Klein tools on MESSY substrate | ~45KB |
| `gamengen-adapter.ts` | Honest mock diffusion backend | ~12KB |
| `pipeline.ts` | Main orchestrator | ~25KB |
| `index.ts` | Clean exports | ~3KB |

## References

- Klein, S. & Simmons, R.F. (1963). "A Computational Approach to Grammatical Coding of English Words." *JACM*, 10(3), 334-347.
- Klein, S., Lieman, S.L., & Lindstrom, G.E. (1968). "DISEMINER: A Distributional-Semantics Inference Maker." *Computer Studies in the Humanities and Verbal Behavior*, 1(1), 10-20.
- Klein, S. et al. (1968). "The AUTOLING System." UWCS Technical Report #43.
- Klein, S. (1966). "Historical Change in Language Using Monte Carlo Techniques." *Mechanical Translation and Computational Linguistics*, 9(3-4), 67-82.
- Klein, S. (1976). "Modelling Propp and Lévi-Strauss in a Meta-symbolic Simulation System."
- Fayyaz, M. et al. (2022). "A Model of Semantic Completion in Generative Episodic Memory." *Neural Computation*, 34(8). PMID: 35896150.

## License

MIT
