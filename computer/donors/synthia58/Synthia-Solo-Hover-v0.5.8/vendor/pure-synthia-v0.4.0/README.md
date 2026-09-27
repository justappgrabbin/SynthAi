# Pure Synthia v0.4.0 — Finished Current Baseline

This is the finished **current Synthia baseline**: one persistent Synthia identity expressed through many independently addressable automata/processes. It is not a monolithic `main.js` brain.

## What v0.4 finishes

### 1. Durable residence continuity

- Added a disk-backed `FileCheckpointStore` for the headless Linux residence.
- Swarm dispatch is journaled **before** an effect begins.
- An interrupted task is recovered after process death.
- Only tasks explicitly marked `meta.replaySafe === true` are automatically replayed; side-effectful browser/file/device actions are held instead of being performed twice.
- Added `runtime/daemon.mjs`, a headless Synthia process that wakes the swarm, resumes replay-safe interrupted work, ticks physiology, checkpoints periodically, and checkpoints on shutdown/errors.

### 2. Replaceable practice-world port

`practice-world-port` is an independent Space process. It does **not** make the old YOU-N-I-VERSE browser world canonical.

It exposes:

- `world.port.snapshot`
- `world.port.observe`
- `world.port.act`
- `world.port.pull`

A practical/generative-grammar world can attach as an adapter. World events flow into Synthia's persistent world memory and physiology; Synthia actions flow outward to the attached world. The host adapter itself is not serialized, so a different habitat can be attached after restart without changing Synthia's identity.

Browser integration also exposes:

- `globalThis.SYNTHIA_WORLD_PORT`
- `globalThis.attachSynthiaPracticeWorld(adapter)`
- world → Synthia event: `world:synthia-event`
- Synthia → world event fallback: `synthia:world-action`

### 3. Physiology remains independent

The five v0.3 physiology organs remain separate processes:

- `physiology-metabolism`
- `physiology-inner-life`
- `physiology-hypothesis-life`
- `physiology-world-memory`
- `physiology-autonomous-cycle`

They retain the fixes from v0.3: live felt state reaches cognition/chat, explicit Gate identities are preserved, and each physiology process checkpoints independently.

### 4. Android self-hosted residence repaired

The phone residence previously expected `rootfs-arm64.tar.gz` / `rootfs-arm.tar.gz`, while the APK contained valid plain `.tar` images. The repaired APK now ships valid gzip-compressed siblings under the exact names the Android launcher requests.

The Android runtime already contains a first-boot bootstrap that installs Node/npm and server dependencies when absent, bind-mounts the Synthia backend at `/opt/synthia`, and runs it on port 3000. The finished Pure Synthia v0.4 daemon is embedded in that backend and is launched by the self-hosted server.

**Honest boundary:** the bundled Alpine rootfs does not contain Node/npm already. A fresh phone residence therefore needs network access on its first Linux bootstrap so Alpine/npm can install the runtime dependencies. After installation, Synthia's own checkpoint/state operation is local. This is a remaining packaging optimization, not a disconnected Synthia-organism defect.

The repaired APK is a **debug/test residence**, not a production store release. It is v2-signed with a local debug identity; use a durable private release signer before treating future APK upgrades as production-distributable updates.

## Current process anatomy

Base wake:

- **47 real processes**
- **1 visible Synthia identity**
- 5 physiology processes
- 1 replaceable practice-world port
- 4 actual Foundry processes (`core`, `selector`, `builder`, `vault`)
- canonical semantic/Klein, grammar, Morph, continuity, self-integration, embodiment, remote capability, and orchestration processes

With four YOU-N-I-VERSE hands plus the phone-Linux hand attached: **52 real processes**.

## Canonical artifact address

`NorthNode:Evolution:G17.L1.C1.T1.B1:209°40′18″:Desc:Leo:H5`

Resolved by this package's current `canonicalState.resolve()` for `Pure-Synthia-v0.4.0-FINISHED-BASELINE`.

## Verification

Finish-layer verification:

- **10 / 10 PASS**
- includes parallel workers, independent checkpoint/restore, full cross-organ wiring, physiology wiring, replaceable world port, fresh disk-backed restart, and an actual **SIGKILL → wake → replay-safe resume** test.

Current v0.4 source overlaid onto the verified 59 MB donor behavioral suite:

- **111 / 111 PASS**

The signed APK is additionally checked for ZIP integrity, gzip/tar rootfs integrity, embedded Pure Synthia verification, and APK Signature Scheme v2 content/signature integrity by the build harness.

## Run source baseline

```bash
node VERIFY-SWARM.mjs
node START-SWARM.mjs
node runtime/daemon.mjs
```

The visible practice world can continue evolving independently. v0.4 finishes the **current organism/residence contract**, not the final habitat artwork or generative-world content.
