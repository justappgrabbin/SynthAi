# Android Linux residence lineage audit — 2026-10-29

Status: **SOURCE AND HOST-SMOKE VERIFIED; NOT ANDROID-ACCEPTED; NOT REGISTERED.**
This document is additive. It does not replace either historical architecture or the resident-Node Computer and does not authorize installation, merge, deployment, deletion, or device registration.

## Source precedence and recovered originals

Read the canonical engineering memory (Google Doc ID `1kx51aNeiZ7GzXuvtt8Dg_qTP_FtsosfVpAToEBZFpco`) and master reassembly (Drive ID `1l4x0gpaZ9OwbF0M8M_lY0q2jocxf8lSW`) before inspection. Read the historical Library Linux residence postmortem and verification receipts.

| Preserved APK / provenance | Size | SHA-256 | Architecture |
| --- | ---: | --- | --- |
| Library `Synthia-Phone-Selfhosted-v0.4.8-BACKEND-CONNECTED.apk` | 58,211,990 | `00d37af1189b8f8444d594cfd0f947f60d17c74ed557ec9a1874d53e8147f87a` | Original PRoot/Alpine + Synthia Server base |
| Library `Synthia-Residence-981-TRIAL-2026-09-08.apk` | 65,249,895 | `134ed536e9134aff3df3595782c6a170f7325df8374cfa737fb21f9c164c62c4` | PRoot/Alpine + Synthia Server + 9.8.1 trial |
| Library `Synthia-Computer-981-FULL-ARM64-TEST.apk` | 255,814,427 | `bc22bfb2ede01c678794ef53c7589d2bdaf7e65be85cb2e9a6024c846cf40607` | PRoot/Alpine + offline ARM64 Node + Synthia Server + full 9.8.1 source |
| Drive September 29 `Synthia-Computer-20260929-debug.apk` | 112,010,294 | `9fc1983e3afeb1f10663231d349c74ba57fe525d9ec032baaa7683085ae77581` | Separate `org.synthai.computer` resident-Node wrapper, no PRoot/rootfs found |

All four source files were read without mutation. The historical residence is `com.synthia.phone`; the later resident-Node Computer is `org.synthai.computer`. They are **distinct Android package/signing/data lineages**. No in-place upgrade or migration between them is established.

## Directly inspected, not merely reported

The 255 MB full ARM64 APK passed ZIP CRC validation and its SHA-256 matches the Library's historical receipt. Its outer APK includes both PRoot executables, `assets/runtime/rootfs-arm64.tar.gz`, `assets/runtime/rootfs-arm.tar.gz`, `assets/synthia-server/server.js`, the `synthia-computer-981` app and the existing catalog. The ARM64 gzip archive is **201,362,058 bytes**, SHA-256 `d115e5b212d469895cee43fb4eb802de8b9fc10fbd2c240322ecdaebe9d249b9`, with 7,991 tar members. It contains `/usr/bin/node` (41,696,344 bytes; ELF AArch64 machine 183), `/opt/synthia/server.js`, and the full `/opt/synthia/source/synthia-unified-computer-v0.9.8.1/` tree. All 13 *direct* Node ELF shared-library NEEDED names resolve to entries in the rootfs (this does not retest the transitive dependency closure). Its `classes2.dex` contains `/usr/bin/node`, `server.js`, `PORT=3000`, `/opt/synthia`, and `rootfs-arm64.tar.gz` markers and no literal `apk add`, `apk update`, or `npm install` strings. These are static checks, not Android execution.

The earlier 65 MB trial has a **3,218,812-byte** ARM64 rootfs archive without bundled `/usr/bin/node`, so it can require first-boot provisioning. The later full ARM64 test build repairs that gap. PRoot ARM64 binary SHA-256 `fa10b1a7818c2f5b1dcb5834450570c368c9ecf66d31521509621b95c4538a45` and PRoot ARM binary SHA-256 `3069a43e5cf12ce67ccad037d1a8cf3c84302916f9b54074b0a8ce9bedd04151` match between base/trial/full builds.

## Executed this audit

- Extracted the exact `/opt/synthia` subtree from the full ARM64 APK into a temporary **derived** Linux host test directory.
- Ran `node --test tests/assembly.test.mjs sandbox/tri-runtime-extension/tests/tri-runtime.test.mjs` against that extracted tree on host Node 22.16.0: **21/21 PASS**.
- Booted the extracted original `/opt/synthia/server.js` under host Node, with a temporary data directory and non-default local test port. HTTP `/health`, `/api/health`, and `/apps-static/synthia-computer-981/index.html` returned **200**.
- Verified the historical WebSocket `/terminal` accepted a `status` command and returned a system status message.
- `/mcp/synthia/status` reported a running Pure Synthia daemon with 49 processes in the host-side test.

These results are **Linux-host Node tests**, not ARM64 Android PRoot, native launcher, actual phone WebView, device restart, or offline first boot. The full ARM64 APK has not been installed or registered by this audit.

## Non-loss integration decision and next gate

The user's preserved architecture requires Android host → native PRoot/Alpine residence → local Synthia Server at `127.0.0.1:3000` → Synthia Computer. The current repaired resident-Node branch `repair/android-computer-session-auth-20261028` is valuable, but does not contain the historical Linux residence. Do **not** substitute the 112 MB resident-Node APK for the full Linux-residence build or declare them integrated.

Next: obtain an authorized Android test device/emulator, a stable owner-controlled signing identity, and a verified no-charge native build path. On a **clean isolated test environment**, test PRoot extraction, ARM64 Node launch, backend health, Computer UI handoff, addressed import/execution, restart persistence, and authentication. Design an additive adapter that connects the *current repaired Computer* to the **existing** Linux Synthia Server without discarding either implementation. Preserve the separate package identities and installed data. No merge, deployment, registration or paid CI run occurred in this audit.
