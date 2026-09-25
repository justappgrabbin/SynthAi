# Synthia Prime 5.8 resident image

Synthia Prime is the exact Synthia Solo Hover v0.5.8 Android Hands source tree wrapped as a SynthIMG without removing or rewriting source files.

## Protected image identity

- Source: `Synthia-Solo-Hover-v0.5.8-ANDROID-HANDS-SOURCE.zip`
- Source size: 83,184,881 bytes
- Source SHA-256: `c73d2bf2c688fc954cb3ac2e273662308a23577c6d29b08509eff85b6983a143`
- Image: `Synthia-Prime-v0.5.8.synthimg`
- Image size: 81,149,942 bytes
- Image SHA-256: `550d2de8ccef3bb3237a2fe6fac7c52577b386c4ba9e2438c7abb0881429a243`
- Whole-tree verification: 1,560 / 1,560 files byte-for-byte

## Resident contract

- `resident_type`: `synthia58`
- resident entry: `src/ui/server.mjs`
- hover surface: `ui/index.html`
- runtime entry: `src/index.mjs`
- Android Hands AccessibilityService: `android/src/com/synthia/solo/SynthiaAccessibilityService.java`

The resident loader is wired on this branch. It starts Prime inside the local native/Linux process host, health-checks `/api/status`, publishes the live resident on the Computer mesh, and routes chat/execute/identity/morph/solo operations to the running 5.8 server.

This does not yet claim the final all-in-one Linux-backed APK or physical-device acceptance. Those remain separate assembly and device-verification work.
