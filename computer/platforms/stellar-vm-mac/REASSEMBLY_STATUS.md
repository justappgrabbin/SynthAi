# StellarVM Mac host source

This directory is an exact copy of `StellarVM-Mac-v0.1.0.zip`, retained with its original ZIP in `../../donors/source-archives/`. Original ZIP SHA-256: `597279660cd4182bf025a2392d36005ea8ea0ae3034c111804022a6ae8a8af43`.

Its Swift application is a real macOS 14+ Linux virtual machine host using `Virtualization.framework`. It creates a persistent disk, machine identifier, EFI NVRAM, GPU, network, keyboard, pointer, and VirtIO socket. It is a separate Mac executable, not code that can run inside Android. The archive's own `ARCHITECTURE.md` names the VirtIO socket and future guest-side `stellar-agent` as the control seam.

Current status: source preserved in the **same continuing repository**, audited, and intentionally outside the Android APK's runtime asset bundle. The Mac VM cannot yet answer a state-space request from the Android Computer because the guest-side agent and secure phone-to-Mac control channel are absent from this v0.1.0 source. No remote execution or Mac control is claimed. Before enabling it as a runtime, connect the guest agent to the Computer's canonical address/execution receipt contract and verify a Mac guest command returning an addressed result. Do not substitute a cosmetic Mac window.
