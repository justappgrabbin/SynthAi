# Living World integration — Independent Computer v26.2

World source: world-engine-foundry-4.html, taken from user's Google Drive file ID 1qEeyp97SisOeJUy3gOgw9KYVTqEvPROs.
Original world SHA256: 80ec9bbdb94732dcaf57576f05b2cbadff4acafb66a9e5ffab551ec24c0075cc

- `index.html` is an offline all-in-one host with the original Independent Computer, existing MESSY interpreter and writer untouched.
- Original world source is in `world-engine-foundry-4.original.html` and inlined in the host as base64, with append-only adapter in `world-engine-foundry-4.adapter.html`.
- Main-thread cross-document postMessage bridge mounts a live playable world viewport, imports a selected text-based computer source into the original WorldEngine.manifestBuilding(), receives building selection and stages its content in the Computer editor, and exports world state.
- Bridge hooks report building creation/selection, without changing original underlying rules.
- This version has **no Sims-style humanoid agent movement** or Social Game System behavioral integration yet. World Engine Foundry is a visual file-to-building environment, not a full life simulator.
- Run `index.html` locally; no network/backend required.
