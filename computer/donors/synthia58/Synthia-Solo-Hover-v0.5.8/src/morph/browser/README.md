# Browser surface morph load order

Load these scripts before creating the deep-surface adapter:

1. `vendor/deep-surface-morph.js`
2. `vendor/sprite-runtime.classic.js` when sprite-sheet playback is used
3. `vendor/reskin-controller.js` when the Three.js articulated rig overlay is used

The ES-module adapter is `../deep-surface-morph-adapter.mjs`.
The canonical state packet is produced by `../canonical-morph-runtime.mjs`.
