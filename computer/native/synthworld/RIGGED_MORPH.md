# Native SynthWorld character/world reskin — isolated candidate

## What this changes
- Existing **Godot** `Scenes/World.tscn`, `Scenes/Agents/Cynthia.tscn` and `Scenes/Agents/Agent.tscn` now have a native presentation layer. This is **not** the separate browser Hover World.
- `Scripts/Visual/RiggedAvatar.gd` imports user-supplied humanoid GLBs when the files are available. It finds their live `Skeleton3D`, animates named hip/limb/spine bones during movement, and applies a material overlay to the actual skinned meshes. Imported models have 67 joints and zero embedded animation clips.
- With no donor GLBs installed, a clearly procedural **Skeleton3D + BoneAttachment3D** fallback renders an animated modular mannequin, rather than reverting to motionless capsules. Its pieces are bone-attached, not blended skinned vertices. Do not mistake fallback for the donor GLB.
- `Scripts/Visual/WorldPresentation.gd` updates terrain, atmosphere, lighting, five display-only dimension beacons and tree canopy; adds camera follow and an interactive native touch-to-target/Morph/Follow interface.
- Original `Cynthia.gd`, `Agent.gd`, `TraitComponent.gd`, `World.gd`, `SentenceExecutor.gd`, `SentenceService.gd` remain unchanged. Their repairs, AI drives, built orders, sentence execution and traits remain authoritative.

## Asset install
The two original rigged GLBs from the provided `3d-human-model-main.zip` were extracted **unchanged** to a separate user artifact `SynthWorld-rigged-character-assets.zip`.
Copy `Assets/Characters/Thanh.glb` and `Assets/Characters/Tham.glb` from that asset pack into `computer/native/synthworld/game/Assets/Characters/`. Open the project in Godot to import the assets before export.
The source-only branch falls back to a procedural rig when those assets are absent, keeping it buildable.

**Asset licensing**: no LICENSE found at the top level of the donor `3d-human-model-main.zip`; confirm permission before putting these assets into a public repository or distributing them in an APK. The archive itself was supplied by the user, and original bytes were preserved.

## Semantics: implementation boundary
The currently verified running world uses mutable `world_state`, agent drives, traits and sentence commands. The presentation HUD shows **observed values**: world harmony and count of loaded Cynthia traits. It never invents a Human Design birth chart, hexagram, physical measurement or evidence of real-world contact. `RiggedAvatar.set_semantic_state` is a deliberately restricted appearance adapter, not a new trait source or behavioral authority.
The separately provided multi-level computational organism, 64-state particle swarm, Kimi scene particles, motion matching, and UniRig sources are **donors**, not silently integrated into the native gameplay. Bringing these in requires explicit mappings, independent acceptance tests, mobile performance budgets and safety gates. Semantic contact does not automatically imply operational capability.

## Acceptance
Run the original execution test and the new scene-level visual test using the engine version supplied by the native build:
```
godot --headless --path computer/native/synthworld/game --script res://tests/execution_test.gd
godot --headless --path computer/native/synthworld/game --script res://tests/visual_acceptance_test.gd
```
Do a Godot import (including any supplied GLBs) before Android export. Use the existing native Android packaging pipeline and preserve the installed application's signing key and saved data.
**Not yet established:** successful Godot 4.6 parser/import, full native APK export, performance on device, or equivalence with any separately installed `SynthWorld` APK.

## Donor triage
- `3d-human-model-main.zip`: actual 67-joint skinned avatars, no animation clips; immediate character asset donor.
- `Kimi_Agent_Adaptive Swarm 3D Engine (1).zip`: two body meshes without skins, browser-first visuals; use only as reference for future particle effects.
- `UniRig-main.zip`: Python-heavy research rig generator; unnecessary at Android runtime given already-rigged characters.
- `SYNTH_AI_PARTICLE_SWARM_REFERENCE.zip` and `synth_ai_computational_organism_starter.zip`: architectural JS/spec donors, not executable Godot scene replacements.
- `Synthia-Computer-r22.4-source.zip`: newer Computer source snapshot; does not contain the native SynthWorld Godot scene tree.
- `Kimi_Agent_Morphing Interactive Video App.zip`: browser video compositor with authored clips, not a realtime skinned humanoid engine.
- `MagicMorphing_LivingChat_Kit.zip`, `digital-twin-threejs-main.zip`, `autonove-video-cognition.zip`, `Synthia-Computer-Mount-Identity-Conflict-Repair-20261019.zip`, `reference-asset-compiler-main.zip`: separate purpose; do not merge opportunistically.
- `Environment-aware-Motion-Matching-main.zip` (approx. 412 MB): deferred for heavyweight rig-motion retargeting review. Its contents and performance have not been validated in the native game.

## Recovery
All originals remain in the original branch and user Drive. This branch intentionally uses additive scene nodes and a separate donor asset pack. To undo, revert the scene edits and remove the `Scripts/Visual/` additions; no saved-world schema migration is performed.
