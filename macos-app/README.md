# Synthia dual host

This branch gives the same canonical `computer/hover` organism two native host bodies.

## Android

The Android face uses the tablet's own Android runtime. Synthia can:

- discover and launch installed apps;
- search and open Google Play;
- open ChatGPT, Claude, and Manus in Google Play;
- fall back to the providers' web apps when the native listing is incompatible with the device;
- keep the existing Accessibility hands, floating planet, and ARM64 PRoot Hover runtime.

Root is not required.

## macOS

The Mac face is a native Swift + WebKit application. It embeds a universal Node 22 executable and the executable Synthia Hover runtime, so the user does not need Node, npm, Python, or developer tools installed.

The Mac package deliberately does not embed another operating system. Intel and Apple Silicon are carried as universal Mach-O slices.

Runtime state lives outside the bundle under the user's Application Support directory.

The preserved Python Talk boundary is satisfied by a Node-backed compatibility shim in the app bundle, leaving the canonical Hover adapter untouched.

## Build output

The macOS workflow produces:

`Synthia-macOS-universal.zip`

The Android workflow produces:

`Synthia-Android-Runtime-Store-debug`

## Distribution note

The Mac build is ad-hoc signed in CI. A normal public macOS release without the unidentified-developer warning still requires Apple Developer ID signing and notarization credentials.
