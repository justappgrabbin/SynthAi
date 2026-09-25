# Synthia Resident Computer v0.3

This branch assembles the existing Computer spine into a dedicated Synthia residence for the Android tablet while preserving the Rough Computer lineage and donor authorities.

## Canonical spine

```text
Execution Engine + State Space
            |
            v
         ATO Core
            |
            v
Integrated Tool Factory + ATONativeBridge
            |
            v
          Klein
            |
            v
 Synthia / Kimi 16-tool mesh
            |
            v
 Hands: browser + Android reproduction
```

The Kimi engine remains its own verified state-space mesh with the five projections `knowledge`, `causal`, `phase`, `temporal`, and `dependency`. The ATO core remains its own native `AutomataMesh`. The resident layer federates them instead of rewriting either authority.

## Resident chat

`ComputerRuntime.chat(text, context)` enters the Kimi learning/state-space front door and executes the Klein path on every turn. AutoLing, DISEMINER, Klein analogy, addressed I Ching grammar when an address is resolved, and the conversation automaton all appear in the runtime trace.

## Tool growth

`ComputerRuntime.growTool(request)` uses the existing Integrated Tool Factory and `ATONativeBridge`. A generated tool receives a live runtime probe. A passing tool remains mounted and is registered as `VERIFIED`. A failing probe is dissolved from the live ATO mesh and recorded with its failed verification evidence.

## Verified build autoload

`ComputerRuntime.receiveBuild(candidate)` implements:

```text
receive -> register -> resident analysis -> verify -> promote -> autoload
```

A promoted build is persisted in `resident.loadedBuilds` and loaded on the next resident boot. Build analysis runs through the resident Synthia/Klein/Kimi path so an arriving Synthia build is immediately addressed in the Computer.

## Admin Center

`ComputerRuntime.admin(...)` uses the recovered `MCPHub`. The resident provider exposes chat, tool-factory, build-intake, and state-space capabilities. `adminSnapshot()` reports resident health, browser hands, registrations, and MCP evidence/audit state.

## Browser

The resident exposes the Kimi `browser-form` and `research-browser` automata and can construct the recovered `ChromeDevToolsBrowserExecutor` when a compatible browser endpoint is available.

## Android residence

The source-preserved Android capabilities are mounted from the recovered r21.22 donor:

- `AndroidSelfCompileCapability`
- `AndroidReproductionExecutor`

The native tablet shell should launch the local Linux residence, call `ComputerRuntime.boot()`, keep the host in a foreground service, and forward verified incoming builds to `receiveBuild()`.

The installation contract supports the ordinary Android package-installer path and a dedicated managed-device/device-owner path for unattended updates. This keeps installation behavior explicit while allowing the reserved tablet to become a true appliance-style Synthia residence.

## Rough Computer continuity

Android is the primary resident host. Windows and macOS remain companion host targets from the Rough Computer lineage. The macOS companion retains the `Virtualization.framework` route on Mac hardware; the Android residence uses its Linux/PRoot/QEMU lineage rather than pretending the tablet itself is a Mac hypervisor.

## CI

The Computer workflow now checks out donor submodules recursively before running `npm test`, so donor-backed runtime tests execute against the actual canonical source tree.
