# Open the first merged app

Requires Node.js 22+ in your existing local Linux environment.
From this directory:

    node src/ui/server.mjs

Open http://127.0.0.1:4183. Tap the purple planet, select Build, then SynthAIPro.
The original Deploy console is also available at /deploy/index.html.

Birth setup is in the Hover header. Date, minute-time, and offline birthplace
selection configure the same runtime used by both chat screens. Chat is a local
rule/tool pipeline, not an external language model. The displayed tool trace comes
from actual AutoLing, DISEMINER, Klein analogy, and conversation execution.

SynthAIPro includes its original console, Morph and Stellar Nexus screens, plus
an app studio that imports/edits/saves/runs standalone HTML and JavaScript locally.
The original Morph screen's malformed string and duplicate script were repaired.
The original visual layouts are retained.

This first merge does not wire every original screen's optional service, implement
arbitrary project repair, or replace the Android installation. Browser automation
requires a browser binary; Android actions require the existing native bridge.
These capability limits remain visible in the runtime's status/error responses.

To rebuild the integrated React screen after source changes, from repository root:

    node scripts/build-synthaipro-integration.mjs

Its source and provenance are under integrations/synthaipro. Generated output
under ui/deploy is served by this runtime and included by Dockerfile.hover.
