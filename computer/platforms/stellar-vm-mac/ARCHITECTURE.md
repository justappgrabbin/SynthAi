# Stellar VM architecture v0.1.0

```text
iPhone client (next layer)
        │
        │ secure Stellar protocol
        ▼
Mac Stellar Host
        │
        ├── Apple/Xcode executor (future host service)
        │
        └── Virtualization.framework
                 │
                 ├── EFI
                 ├── VirtIO GPU
                 ├── VirtIO block disk
                 ├── VirtIO network + NAT
                 ├── VirtIO entropy
                 ├── VirtIO balloon
                 └── VirtIO socket
                          │
                          ▼
                      Linux guest
                          │
                    Stellar runtime
                          │
                       Synthia
```

The VM host and the eventual iPhone app are deliberately separate. The Mac owns virtualization and Apple development tooling. The phone will control the Mac-hosted environment instead of attempting to run macOS virtualization locally on iOS.
