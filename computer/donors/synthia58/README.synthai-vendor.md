# Synthia 5.8 (Solo Hover + Android Hands) — vendored donor

This folder vendors the Synthia 5.8 bundle supplied by Alexis, used as the
source for the **hover** Android flavor (`app.synthai.hover`, app name "Synthia").

| Field | Value |
| --- | --- |
| Source zip | `Cynthia-Sovereign-v0.5.8-Android-Hands-1.zip` |
| Source zip size | 82,535,021 bytes |
| Source zip sha256 | `972e1df1024f1c5f3a34a2ddaa94a45f9217b628079822a2e4ae4ea4c9917ccf` |
| Zip root folder | `Cynthia-Sovereign-v0.5.8-Android-Hands/` (its contents are this folder) |
| Files in zip | 1,575 |
| Files vendored | 1,574 (+ this README) |

## Byte-identical rule

Every file from the zip is here **byte-identical** (no edits, no reformatting).
The single exception is a file that was dropped:

- `Synthia-Solo-Hover-v0.5.8/backups/Synthia-Integrated-Automata-v0.5.1-pre-acceptance-audit.tar.gz`
  (~37 MB). It is a historical backup tarball that is not referenced by
  `src/`, `ui/` or the tests; 5.8's own `scripts/package-release.sh`
  already excludes `backups/*` from releases.

Hover-flavor customisations (ports, transparent background CSS, package
renames of `android-host/`) live in `android-app/app/src/hover/` and
`android-app/linux/Dockerfile.hover`, not in this folder.

## Layout

- `Synthia-Solo-Hover-v0.5.8/` — Node >= 20 app, no npm dependencies.
  Copied to `/opt/synthia58` in the hover rootfs and started with
  `node src/ui/server.mjs` (env `PORT`, `SYNTHIA_DATA_DIR`,
  `SYNTHIA_ANDROID_BRIDGE_URL`).
- `android-host/` — original Android host classes (`com.synthia.sovereign`).
  Ported (renamed to `app.synthai.hover`) into the hover source set.
- `linux-runtime/` — original Termux launch scripts (reference only).
- `extras/`, `PATCH-NOTES.md` — as supplied.

## Not applied (deferred)

`prime58-android-resident-1.patch` (Admin Mode, Talk hooks, test 32) is
**not** applied: it edits 5.8 files (would break the byte-identical rule) and
it only applies to `src/ui/server.mjs` with a 38-line offset against this
build. Left for a later, separately reviewed change.

## Not in the Venom rootfs

`android-app/linux/Dockerfile.dockerignore` excludes this folder from the
Venom (Computer) rootfs so Venom's image is unchanged.
