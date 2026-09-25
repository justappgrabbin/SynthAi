# Synthia preservation protocol

Effective: 2026-09-25

This protocol makes durable preservation part of the build process. Valuable work is considered accounted for when its source, provenance, verification state, and continuation point are stored in GitHub and/or the active Supabase project rather than existing only in chat, a temporary sandbox, or an untracked local build.

## Durable destinations

- **GitHub** is the source-of-truth for code, manifests, tests, patches, build recipes, release notes, branch history, and reproducible provenance.
- **SynthAi Foundry Official / Supabase** is the durable registry for cross-branch artifacts, state/checkpoint records, handoff state, and records that should remain outside the public repository.
- Large binaries belong in a durable GitHub Actions/Release artifact or Supabase Storage. A hash and provenance record preserve identity, while the binary itself is archived separately when bytes are available.

## Every valuable artifact records

1. artifact name or capability
2. source repository
3. branch and commit SHA
4. binary/content hash when applicable
5. storage location(s)
6. verification state
7. current work owner/lane
8. handoff state
9. next acceptance gate
10. relationship to protected baselines and donor lineage

## Preservation rules

- Existing working baselines remain intact.
- Changes are additive by default.
- Protected Synthia Prime 5.8 source remains unchanged; Prime extensions are recorded as additive descendants.
- Synthia's life-process swarm remains Synthia's organism architecture. External coding/recovery swarms operate around it.
- Donors stay traceable to their original source and are promoted only through explicit adapters/integration work.
- A capability stays in the ledger until it is either integrated with evidence or intentionally preserved as a separate lane.
- Branch history is preserved. Parallel swarms use separate branches/PRs and converge through explicit review rather than rewriting one another's work.

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
- what moved from PRESERVED to INCLUDED/VERIFIED
- the next blocker or acceptance step

## Release accounting gate

A release/drop gets a current accounting sheet before it is called complete. The sheet distinguishes:
- **INCLUDED**: present on the release branch/package
- **PRESERVED / RECONCILE**: valuable work safely stored on another branch/source and awaiting deliberate convergence
- **ACCEPTANCE PENDING**: implemented but awaiting required runtime/device evidence
- **SOURCE / DONOR**: preserved source material that has not been promoted into the runtime

## Current binary durability note

The current all-in-one candidate `SynthAI-Prime-Linux-Resident3-debug.apk` has durable hash/provenance records in GitHub and Supabase. Its final assembled binary was produced outside GitHub, so the binary itself becomes fully archived when its bytes are uploaded to a GitHub Actions/Release artifact or Supabase Storage. The reproducible host workflow, Prime image lineage, and exact SHA-256 remain recorded in the meantime.
