# Prime Resident 3

Resident 3 remains an additive clone of protected Synthia 5.8.

Image:
- `Synthia-Prime-v0.5.8-Android-Resident-3.synthimg`
- version `0.5.8+android-resident.3`
- size 81,152,477 bytes
- SHA-256 `46e4c3cfe41ec18bcffefa235769eebfe44d4ab43584ce099102c083998d8298`
- 1,564 / 1,564 files verified byte-for-byte against the tested clone
- missing 0 / extra 0 / packaging-changed 0

Resident 3 contains all Resident 2 additions plus:
- `src/solo/local-linux-runtime-adapter.mjs`
- `test/34-local-linux-runtime.test.mjs`
- `src/ui/server.mjs` registers the adapter when Prime starts

Verified local execution:
- real Python process: PASS
- real /bin/sh process: PASS
- JavaScript can opt into Node with runtime=node / preferLocalRuntime
- targeted Prime regression set: 9 passed / 0 failed

Protected original 5.8 remains unchanged.
