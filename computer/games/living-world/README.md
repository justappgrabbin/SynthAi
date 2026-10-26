# SYNTHIA — Living World · Playable Alpha 01 (2026-10-26)

## Build target
This is an implemented, offline-first character-life simulation delivered inside the **existing** SynthAI Computer, rather than a new dashboard or a replacement for Simlish. The game lives at `/living-world.html` in the existing Kimi shell and is launched through the Computer's `Games` entry **without an iframe**. A downloaded copy of the HTML also works independently of the Computer host.

## Real mechanics
- Four residents (Synthia, Nova, Echo, Moss), up to twelve user-created residents.
- Each agent independently moves toward activities selected by five simulated needs, with tile pathfinding around blocked water.
- User can select an agent, tap a destination, send commands to Eat / Rest / Play / Socialize / Create / Wash, toggle autonomy, pause and change time speed.
- Actions modify needs and experience, agents level up, social interactions modify **reciprocal** relationships, and experiences become bounded agent memories.
- Morph each agent among Human, Fox, Gnome, Robot, Orb and Cat. Morph realm scenery among Grove, Starlight and Ember; daylight and night lighting respond to the simulated time.
- A community festival appears when accumulated social ties meet the simulation threshold.
- Save locally, export/import JSON, and preserve old saves as **new archive copies** on reset/restore.
- Mobile viewport, touch selection, drag to pan, pinch and zoom, keyboard movements on desktop.
- Dependency-free world simulation module with four automated regression tests.

## Integration and boundaries
- Original donor files under `computer/donors`, Simlish, prior Computer, and resident are **unchanged**.
- Simlish donor/world gateway remains separate. The current game client is **not yet synchronized** with the Node `WorldEngineGateway` or the resident's neural/semantic models. Those are integration milestones, not silently asserted features.
- This is a two-dimensional game, **not** a 3D Sims clone; there is no fake phone Linux, machine-control permission, remotely hosted LLM, dynamic new rule synthesis, sound, synchronized multiplayer, or background agent execution.
- Agents act using explicit state transitions and bounded priority/autonomy logic, not pretrained language reasoning or simulated conversations.
- Open `Computer → Games → Living World` after building and running the existing Computer host; the game can also run separately from a local browser.

## Verification
- `node --test computer/tests/living-world.test.mjs`
- Existing Computer resident acceptance workflow includes the game tests on this branch.
- React shell must also pass `npm --prefix computer/shell/kimi-linux ci` and `npm --prefix computer/shell/kimi-linux run build`.
- Local standalone original engine/browser smoke tests performed; physical Android install is **not** yet verified.

## Research provenance
Architecture inspiration, not source-code copying:
- Li et al. (2024), *Unbounded: A Generative Infinite Game of Character Life Simulation*, https://arxiv.org/abs/2410.18975
- StanfordHCI/genagents: https://github.com/StanfordHCI/genagents (the **1,000-person** interview-based simulation repository, not the 2023 Smallville codebase).
