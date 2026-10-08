# Text swarm morph experiment

The same SymbolCompositionGraph occurrences now visibly transition from text into chair, house, body, world-field and page outlines. LivingWorldView exposes `morph({compositionId, form, resolveState})`. Shared occurrences retain their identity, address and ordered memberships. Weak holding strength deforms a placement without removing the underlying relationship or constituent.

Run from the repository root:

```sh
python -m http.server 8000
```

Open `/implementations/resident-composition-v0.3.0/demo/morph.html` on that server. Enter text, select a form and press Become. This is a browser-native SVG particle expression with no backend, workers, generated code or model download.

`resolveState(occurrence, {form, composition})` can supply existing resolved qualitative state and a finite `holdingStrength` in [0,1]. The renderer preserves the supplied state. It does not invent a mapping from gate themes to numeric strengths. The demonstration does not supply this resolver; its layouts are authored visual projections, not computed gate/channel physics. Reference-face rendering, full 3D worlds, arbitrary semantic form generation, and the complete five-stack/three-level strength law remain unfinished.

The graph and `o_sequence` share a dependency-free sequence implementation, extracted to make the original composition path usable without the absent foundation dependencies. Ordered identity and scale promotion are preserved.

Verification: `node implementations/resident-composition-v0.3.0/experiments/verify-swarm-morph.mjs` passes five tests covering identity/address retention, nested shared memberships, strength deformation, invalid state rejection and escaped rendering. The 33 host participation checks also pass. A browser automation attempt stalled in this environment; no visual browser pass is claimed.
