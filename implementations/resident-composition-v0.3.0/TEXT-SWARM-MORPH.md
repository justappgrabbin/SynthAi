# Opaque word swarm morph

Word compositions now occupy overlapping opaque surface patches instead of letter outlines. The default view shows filled chair, house, person/body, world and page silhouettes. Reveal words exposes the exact word placements underlying those surfaces. Multiple placements reference the same graph constituents; they do not manufacture new swarm identities. Whitespace remains in the graph but does not create a surface word.

Run `python -m http.server 8000` from the repository root and open `/implementations/resident-composition-v0.3.0/demo/morph.html`. Enter text, choose a form and press Become. The Reveal words checkbox changes presentation without changing placements or graph state.

`LivingWorldView.morph({compositionId,form,resolveState,readSensory,directionRules})` connects an organism composition. `readSensory()` supplies the existing sensory adapter snapshot; each `resolveState(occurrence,{form,composition,sensory})` receives that snapshot with the exact addressed constituent. Person expression can use resolved emotion/sensation and holding strength. This is a connection point, not a substitute sensory adapter; no adapter was found in the inspected GitHub tree.

Movement approaches its surface position upward; Being approaches horizontally. Evolution and Design remain stationary unless the host supplies explicit direction vectors, because their directions are not yet confirmed. Mixed-dimensional words also remain stationary rather than acquiring a guessed dominant dimension. Motion is currently limited to formation, not a continuous simulation.

Holding strength in [0,1] deforms surface placements; opacity remains one even at zero strength. The relationship and all referenced constituents remain present. The renderer does not derive strength from gate numbers or synthesize a three-level coherence law.

These are authored, filled SVG forms. Full 3D volumetric scenes, facial reference embodiment, continuous dimensional dynamics, and automatic chart/channel-to-material resolution remain unfinished. The filtered words and opaque patches share a footprint approximation; they are not voxelized glyph meshes. No claim of complete physical realism is made.

Verification: `node implementations/resident-composition-v0.3.0/experiments/verify-swarm-morph.mjs` passes six tests for opacity, identity, filter equivalence, dimensional direction, support deformation, sensory propagation and rejection of invalid input. The 33 host participation tests also pass. The earlier browser automation attempt stalled; visual browser verification remains pending.
