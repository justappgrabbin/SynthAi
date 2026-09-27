# Synthia — merged build

This is all six of your uploads combined into one project, nothing left out.

## What actually happened to your files

I extracted all 6 zips (including the 3 nested zips inside the v0_2/v0_5/v0_6
bundles) — **997 files total**. Almost all of that was the *same* files
copy-pasted into every progressive-upgrade bundle (each new version zip carried
the old versions forward as backup copies). After hashing every file's actual
content:

- **272 genuinely unique files** exist across everything you sent.
- **218** of those had only ever existed in one form → copied straight in.
- **35 modules** had real competing versions (v0.2 → `_preserved_v0_3` →
  `preserved_v0_4` → v0.5 → v0.6). For each, I kept the most evolved version
  as the **canonical** one, following the lineage that's actually in your
  folder names and timestamps.
- **54 older/alternate versions** of those 35 modules were **not deleted** —
  they're archived under `resolver/variants/` and listed in
  `manifest/synthia-manifest.json`, fully loadable on demand.

Nothing was picked as "my favorite." The rule was purely mechanical: newest
point in the version lineage wins as default, everything else stays reachable.

## The resolver (the part you asked for either way)

`resolver/Resolver.mjs` is the ingestion/resolution layer:

```js
import { createSynthia } from './synthia.mjs';
const synthia = await createSynthia();

synthia.resolver.list();                          // all 218 modules + how many old versions exist
synthia.resolver.variants('GraphRuntime.ts');      // see the 4 archived versions of this one
await synthia.resolver.resolve('GraphRuntime.ts'); // load the canonical (newest) one
synthia.resolver.use('GraphRuntime.ts', '<hash>'); // pin an older version instead, no file editing
synthia.resolver.reset('GraphRuntime.ts');          // back to canonical
```

If a module fails to load on its own (a lot of the TS pieces reference other
modules that drifted apart across versions and don't line up 1:1), the
resolver reports that and keeps going — it doesn't take the rest of Synthia
down. Check `synthia.diagnostics()` to see what's actually live.

## Pure JavaScript

Every `.ts`/`.tsx` file in the project (83 of them) has been transpiled to a
sibling `.js` file — types stripped, logic untouched, zero build step needed
to load them. `synthia.mjs` and everything it boots by default
(`disseminer.js`, `autoling.js`, `integrated-tool-factory.mjs`) has **zero
external dependencies** — no npm install required, runs identically in Node
or a browser `<script type="module">`.

## Running her

**Chat, in the terminal:**
```
node chat.mjs
```

**Chat, in the browser** (needs a static server — ES modules don't load over `file://`):
```
npm run serve
# open http://localhost:8080
```

## What's wired in by default vs. what's just reachable

Booted automatically by `synthia.mjs`:
- **DISEMINER** (`src/runtime/disseminer.js`) — semantic inference / OCR-aware correction / analogy engine
- **AutolingEngine** (`src/runtime/autoling.js`) — morphological/linguistic parser (Sheldon-Klein-style)
- **IntegratedToolFactory** (`src/UPGRADES/vendor/integrated-tool-factory/`) — this is the "spawn tools to
  complete tasks" piece. It routes a request into one of 5 dimensions
  (Movement/Evolution/Being/Design/Space, each addressed by an I-Ching
  gate/line the way `resonance-engine-substrate` also does), then generates
  an addressable, callable tool for it.

Everything else — `GraphRuntime`, `SynthiaSubstrate`, `DeepStructureLearner`,
`InteractiveLearner`, the MCP server (`vendor/diseminer-mcp-server`), the
mesh server, `autonovel`, the `youniverse-diseminer` app, the ATO
core/automaton system — is real code, present in full, and loadable through
the resolver. I didn't hard-wire it into the boot sequence because several of
these pieces reference APIs from *other* pieces that changed shape between
versions (e.g. `GraphRuntime.ts` in v0.6 expects a different `ToolRegistry`
shape than the one archived from `_preserved_v0_3`), so force-loading all of
them at boot would crash on import rather than run. This is exactly the
situation the resolver is for — load what you need, and if a piece needs an
older sibling instead, `resolver.use()` swaps it in without touching a file.

## The four-corner word space

`resolver/FourCornerSpace.mjs` — this was the vaguest part of your brief, so
I built a real, working guess rather than skip it: a word can have a
soft affinity to all 4 corners at once (not locked to one quadrant), position
in the grid is *derived* from those affinities plus the current user's
context weights, and two words "belong together" by comparing their affinity
vectors — not by which quadrant they happen to be drawn in. Re-anchoring on
login is `space.setUserContext({ weights: {...} })`. If this isn't what you
had in mind, tell me what's off about it and I'll reshape it — it's a small,
isolated file, easy to change without touching anything else.

## Everything, still all there

`manifest/synthia-manifest.json` is the full inventory — every one of the 272
unique pieces, where it lives, and (for the 35 with history) every prior
version and which of your original zips each one came from.

## v0.6.7 Browser Perception

The browser hand can now inspect unfamiliar interfaces and navigate toward a requested goal before invoking the consent-gated form workflow. See `BROWSER-NAVIGATION-NOTES-2026-08-11.md` and `proofs/browser-navigation-v0.6.7/navigation-result.json`.
