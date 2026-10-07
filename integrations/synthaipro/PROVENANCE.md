Source: justappgrabbin/SynthAIPRODeploy, current main checked out in this session,
with local fixes. Original React console layout and original Morph/Stellar Nexus
HTML interfaces retained. Chat uses Hover's /api/chat; standalone app editing uses
the previously integrated SynthAi JavaScript state/automata modules.
Build: node scripts/build-synthaipro-integration.mjs from repository root.
Active output: computer/hover/ui/deploy, served by the existing Hover Node runtime.
No second external backend is required for these integrated functions.
The larger Synthia-server and Python modules from the deploy repository remain
outside this first integration. Original standalone HTML surfaces may contain
independent capabilities; this merge does not claim all their services are wired.
