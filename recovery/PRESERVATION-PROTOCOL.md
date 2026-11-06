# Synthia preservation protocol

Effective: 2026-09-25

This protocol makes durable preservation and user delivery part of the build process.

A valuable artifact can be **preserved** without being **delivered**. It can be **built** without being **accepted**. Those states must never be collapsed into one another.

The governing rule is:

> **If the creator cannot physically retrieve, open, install, run, or otherwise use the actual valuable artifact, it has not passed.**

Source code, hashes, manifests, CI logs, successful compilation, static verification, screenshots, provenance records, and reproducibility are evidence. They are not substitutes for putting the usable result in the creator's hands.

## Canonical status model

Every valuable artifact must use one of these states:

- **SOURCE / DONOR** — useful source material exists.
- **BUILT** — the artifact was successfully produced.
- **PRESERVED** — the source and/or artifact is durably stored.
- **DELIVERED** — the actual usable artifact is surfaced to the creator through a working, durable access path.
- **USER-ACCESS VERIFIED** — the creator can actually retrieve/open/install/run that artifact.
- **ACCEPTED** — the required real-world/device behavior has been demonstrated from the delivered artifact.
- **FAILED DELIVERY** — a valuable build existed but the creator could not retrieve or use the actual artifact.
- **FAILED ACCEPTANCE** — the artifact was delivered but failed required use/runtime behavior.

**BUILT is not DELIVERED. PRESERVED is not DELIVERED. STATICALLY VERIFIED is not ACCEPTED.**

## In-your-hands gate

No app, APK, package, model, ZIP, build, export, or other valuable output may be called complete, successful, shipped, delivered, or passed until all applicable items below are true:

1. the exact artifact bytes exist in durable storage
2. the artifact has a durable visible location
3. the creator is given the actual access/download surface
4. that access path is checked for existence after upload
5. the artifact size and hash are recorded when applicable
6. the creator can retrieve/open/install/run the artifact
7. device/runtime acceptance is completed when the artifact is an executable app

If any earlier technical stage succeeds while these conditions are unmet, report the technical stage precisely and keep the overall result open.

A dead link is a delivery failure.
A temporary sandbox path is not durable delivery.
A hash without the binary is not delivery.
A compile-success badge is not delivery.
A GitHub commit containing source but not the requested executable is not delivery.

## Durable destinations

- **GitHub** is the source-of-truth for code, manifests, tests, patches, build recipes, release notes, branch history, and reproducible provenance.
- **GitHub Actions artifacts / Releases** are preferred durable delivery surfaces for APKs and other build outputs when GitHub is the requested destination.
- **SynthAi Foundry Official / Supabase** is the durable registry for cross-branch artifacts, state/checkpoint records, handoff state, and records that should remain outside the public repository.
- **Supabase Storage** may hold large binaries when appropriate, but a database row containing only metadata or a hash does not count as storing the binary.
- Temporary chat/container/sandbox storage is a work area only, never the final home of a valuable artifact.

## Every valuable artifact records

1. artifact name or capability
2. source repository
3. branch and commit SHA
4. binary/content hash when applicable
5. exact storage location(s)
6. exact delivery location shown to the creator
7. preservation state
8. delivery/user-access state
9. runtime/device acceptance state
10. current work owner/lane
11. handoff state
12. relationship to protected baselines and donor lineage

## Preservation rules

- Existing working baselines remain intact.
- Changes are additive by default.
- Protected Synthia Prime 5.8 source remains unchanged; Prime extensions are recorded as additive descendants.
- Synthia's life-process swarm remains Synthia's organism architecture. External coding/recovery swarms operate around it.
- Donors stay traceable to their original source and are promoted only through explicit adapters/integration work.
- A capability stays in the ledger until it is either integrated with evidence or intentionally preserved as a separate lane.
- Branch history is preserved. Parallel swarms use separate branches/PRs and converge through explicit review rather than rewriting one another's work.
- Valuable binary output must be uploaded to its durable destination as part of the same completion workflow that produces it whenever technically possible.
- A swarm must not finish or hand off a valuable artifact while its only copy exists in ephemeral storage.

## Swarm handoff contract

Before a swarm changes code it reads:
1. `recovery/unfinished-work-ledger-2026-09-25.md`
2. `recovery/FIRST-DROP-ACCOUNTING-2026-09-25.md`
3. the target PR body and head SHA
4. the Supabase preservation ledger entry for the target capability

During work it keeps its scope on its own branch.

At handoff it records:
- changed files
- tests/CI evidence
- new commit SHA
- artifact hashes
- durable artifact location
- creator-visible delivery location
- result of access-path verification
- what moved between SOURCE / BUILT / PRESERVED / DELIVERED / USER-ACCESS VERIFIED / ACCEPTED
- the next blocker or acceptance step

No handoff is complete for a valuable executable artifact until the delivery location has been surfaced and checked.

## Release accounting gate

A release/drop gets a current accounting sheet before it is called complete. The sheet distinguishes:
- **SOURCE / DONOR**
- **BUILT**
- **PRESERVED**
- **DELIVERED**
- **USER-ACCESS VERIFIED**
- **ACCEPTANCE PENDING**
- **ACCEPTED**
- **FAILED DELIVERY**
- **FAILED ACCEPTANCE**

The release itself does not pass while a required first-drop artifact remains FAILED DELIVERY or USER-ACCESS unverified.

## Current binary durability note

The all-in-one candidate `SynthAI-Prime-Linux-Resident3-debug.apk` was built at 367,532,021 bytes with SHA-256 `4b5012ae88b2f89309d04596f19b5c380dcf9658a17f861e2d9c7a7c1f45cf23`.

Its source lineage, component hashes, and provenance were preserved. The final assembled APK bytes were not promoted from temporary storage into GitHub Actions/Release storage, Supabase Storage, or another durable creator-visible binary location.

Under this protocol its status is therefore:

**BUILT + PROVENANCE PRESERVED + FAILED DELIVERY**

It must not be described as delivered, shipped, passed, or complete unless the exact binary is recovered or reproduced, durably stored, surfaced to the creator, and user-access verified.
