# External agents and embodied donor integration (2026-10-27)

This branch preserves the existing Synthia Computer runtime, Synthia Resident, the Klein semantic-spacetime graph, and original language tools.

## Delivered: local nanobot agent delegation

The new computer/adapters/NanobotAgentAdapter.mjs delegates a single approved turn through nanobot's local OpenAI-compatible /v1/chat/completions endpoint. The original Computer conversation engine is unchanged. Callers must explicitly configure nanobot when creating ComputerRuntime and invoke delegateToNanobot from a privileged internal path.

Example (local nanobot must already be running and configured with a model):

    const computer = await new ComputerRuntime({
      nanobot: { baseUrl: 'http://127.0.0.1:8900' }
    }).boot();
    const reply = await computer.delegateToNanobot({
      message: 'Inspect the selected project and explain findings.',
      sessionId: 'synthia:project1', ownerApproved: true
    });

The bridge permits only HTTP loopback addresses, bounds turn length, uses one user message per call, passes stable session IDs, rejects upstream errors, and requires an ownerApproved flag. The flag is not independent authentication: do not expose this backend through an unauthenticated route. Configuring the adapter does not install nanobot or grant tools. Run acceptance tests with node --test computer/tests/nanobot-agent.test.mjs.

## Embodied donor work examined, but not connected

- AIKA (aika-java-main.zip): Apache-2.0 Java 23/Maven sparse-neuron network with persistent neuron/synapse graph separated from input-specific activation/link graph. Next step: build tests with Java 23 and expose an isolated typed event API. No Synthia neural graph overwrite.
- Reference Asset Compiler (reference-asset-compiler-main.zip): MIT Python 3D pipeline with SHA-256 approval ledger, Blender 5.2, Unreal Engine 5.8, Hunyuan3D. Its CLI ran locally and selected stage, approval and promotion tests passed (one skipped). Next step: isolated character build worker returning staged assets and validated approval receipts. Full image-to-3D needs about 24GB GPU VRAM and roughly 45–60 GiB disk.
- TEMOS (TEMOS-master.zip): MIT PyTorch text-to-human-motion model. ZIP includes code and small transform-stat files but not the trained motion checkpoint, datasets or licensed SMPL dependencies. Next step: install compatible runtime and checkpoint in isolated worker, generate joints from a test sentence, and retarget the resulting motion to an approved character rig.

## Required end-to-end contract

Text input -> Synthia's semantic/event record -> approved task routing -> character asset worker and/or motion worker -> hash-bound artifacts -> retargeted skeleton -> verified scene animation -> logged evidence.

Each worker must expose typed input/output contracts, provenance and resource limits. All external effects pass Computer authorization. For RAC, treat its hash-bound review gates as necessary before asset promotion. Do not call test fixtures, static demos, or unavailable model checkpoints a completed game.

## Operations and remaining gates

First validate live nanobot on the loopback API, owner authentication, token limits, failed requests and session isolation. Keep expensive Blender/UE/Hunyuan and motion inference workers separate from the agent gateway. Queue their jobs with cancellation and GPU quotas. Proposed initial metrics are 99% terminal responses to approved delegation within configured timeouts, 100% correlation IDs, and zero execution without owner authorization; these are design targets, not measured SLOs. Actual cloud costs depend on GPU hours and request volume; local adapter tests require no remote model fees. If a worker fails, disable that optional backend and retain the original Synthia runtime and prior project branch.
