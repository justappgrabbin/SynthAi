# SynthAI Mobile Computer

This is the phone-first SynthAI Computer runtime.

It is **not** a reduced Computer and it is **not** a port of the Linux container
runtime. It keeps the SynthAI Computer's portable contracts and the
`.synthimg` image format while using browser/mobile-safe substrate adapters.

## Design rule

**Compact the substrate, not the capability.**

The Linux `synthctl` runtime may use namespaces, `pivot_root`, cgroups and
native `exec`. The mobile Computer does not require those mechanisms.

The mobile runtime uses:

- IndexedDB for mutable Computer state
- Cache Storage for installed image files
- a Service Worker for local app URLs
- WebCrypto SHA-256 for image integrity
- DecompressionStream for gzip payloads
- the existing Computer VFS/projects/automata/morph/app contracts
- the recovered five-stage StateSpaceEngine
- ASLEEP / WARM / ACTIVE lifecycle checkpoints

## Universal state-space boundary

The runtime keeps the architectural boundary explicit:

- **above Base**: universal/shared addressable state-space and mesh-visible state
- **below Base**: sovereign/private credentials, memories, files and private app state

A local Computer can remember a full address and its last checkpoint. A future
mesh adapter can resolve the same canonical address from another device without
making private state public.

## Address contract

The portable canonical address contains the same 13 fields:

`planetary dimension gate line color tone base degree minute second arc zodiac house`

Gate/Line/Color/Tone/Base can be activated through the real recovered
Movement → Evolution → Being → Design → Space state-space engine.

## .synthimg compatibility

The loader understands synthctl FORMAT v1:

`SYNTHIMG | version | flags | manifest length | payload SHA-256 | manifest | ustar payload`

Gzip-compressed payloads are supported when the device exposes
`DecompressionStream('gzip')`.

The JSON manifest may include the mobile extension:

```json
{
  "name": "Resonance Network",
  "version": "1",
  "arch": "any",
  "mobile_entry": "index.html"
}
```

If `mobile_entry` is absent, the runner looks for an HTML entrypoint and then
common `index.html` locations.

Linux-only images remain valid `.synthimg` files, but the mobile runner will
refuse to launch them when they contain no web/mobile entrypoint.

## Lifecycle

Install:

`choose image → verify SHA → unpack → cache files → WARM`

Summon in Compact mode:

`checkpoint → WARM → mount only when used`

Summon in Full mode:

`checkpoint → ACTIVE`

Sleep:

`capture app state/address/pointers → ASLEEP`

Mutable state is stored outside the immutable image so an image can be replaced
without erasing user continuity.

## Phone launcher

After `node computer/build-web.mjs`, open:

`/mobile-computer.html`

The launcher provides:

- Compact / Full launch profile
- `.synthimg` file install
- installed image list
- Summon / Sleep controls
- embedded app view
- canonical address activation
- last-state relocation

## Status

Current mobile acceptance covers:

1. synthctl-compatible FORMAT v1 parsing
2. payload SHA-256 verification
3. corrupt-image rejection
4. real five-stage state-space activation
5. local address checkpoint relocation
6. reversible recovered micro/macro codecs
7. browser runtime staging

This branch intentionally leaves the Linux `synthctl` repository unchanged.
