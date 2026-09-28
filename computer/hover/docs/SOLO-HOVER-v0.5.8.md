# Synthia Solo Hover v0.5.8

## Runtime shape

The Solo Hover shell is a surface around the existing canonical Synthia organism. It does not define a second identity or a reduced state model.

Persistent body:

`planet -> radial launcher -> focused panel -> full workspace`

Core surfaces:

`Browser | Chat | World | To Do | Build`

All five surfaces share one `FederatedSynthia` instance and the same persistence directory.

## Canonical authority

The organism remains authoritative in this order:

`Planetary -> Dimension -> Gate -> Line -> Color -> Tone -> Base -> Degree -> Minute -> Second -> Arc -> Zodiac -> House`

The Solo Hover shell consumes that state. The browser continuation, visual shell, task store, and embedded Build surface do not replace it.

The v0.5.7 canonical morph runtime remains the embodiment boundary. It carries resolved state, biological translation, relational/Klein context, temporal superposition, experiential mesh evidence, and machine-native perception to the renderer.

## Browser hand

`SoloBrowserHand` adapts the preserved v0.6.8 browser continuation. The executable path uses Chromium DevTools Protocol when a supported Chromium binary is present.

Live operations:

- navigate to a URL
- inspect headings, actions, and forms
- capture the current browser surface
- click by visible screenshot coordinate
- click an indexed action by text
- back / forward / reload
- prepare field values through the browser-form automaton
- approve populated fields
- fill approved fields
- validate the draft
- request final submission
- dispatch submission only after final confirmation

The Browser surface can also send page context to the same Synthia chat path.

## Page morph

Browser page morphing does not invent a second phenotype mapping. It searches the canonical morph packet for a resolved chromatic expression and, when one exists, applies it as a page-surface accent. If no resolved chromatic expression is present, the operation returns `NO_RESOLVED_CHROMATIC_EXPRESSION`.

Physical embodiment morphing remains the deeper v0.5.7 landmark / mesh / motion / occlusion / surface reconstruction path.

## World, tasks, and build

World reads the active canonical state and morph snapshot from the organism server.

To Do persists to `.synthia-state/solo-hover-tasks.json`.

Build embeds the preserved Foundry UI at `/build/index.html` and the previous diagnostic engine surface remains available at `/lab.html`.

## Linux shell

The web surface is transparent. `linux/open-hover.sh` starts the local server and opens the shell in Chromium app mode. Actual compositor-level transparency, click-through outside the body, pinning, and always-on-top behavior are host/window-manager capabilities and should be applied by the Linux container/host layer.

## Verification

Verification performed in this checkpoint:

- all original v0.5.7 regression groups retained
- canonical v0.5.7 verification audit returns `PASS`
- Solo Hover shell contains all five surfaces and the persistent planet body
- task store persists across instances
- browser hand starts real Chromium, inspects a page, captures it, and fills approved fields
- collapsed, radial, and expanded panel states render from the packaged HTML/CSS in headless Chromium
