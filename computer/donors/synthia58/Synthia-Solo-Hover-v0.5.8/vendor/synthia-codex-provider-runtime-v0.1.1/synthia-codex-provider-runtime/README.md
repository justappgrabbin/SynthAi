# Synthia Codex + Provider Runtime

A Pure-JS replacement for the mixed Replit/Flask/React donor document.

## What survived from the donor
- 64-gate Codon Codex concept and interactive state inspection.
- Spoken/conversational front-end compatibility (UI can call platform speech synthesis; voice is not tied to a model).
- Natural-language construction and correction concept.
- Self-building concept, rebuilt as stage -> validate -> test -> explicit apply -> rollback.
- External model routing concept, rebuilt so Synthia owns context, memory, tools and integration.
- MCP as a tool/message broker, not as Synthia's identity or brain.

## Canonical-data rule
The UI does not ship the donor's hand-entered gate metadata as truth. It consumes the current canonical `gate_neural_ops` rows and refuses to initialize unless the 1..64 catalog is structurally complete.

`neutral` is retained as a UI observation state because the donor had five visual states, but it is intentionally non-persistent. It cannot silently change the canonical four-state expression model.

## Model selection
Three modes are supported:
1. `resident`: Synthia answers.
2. `delegate`: an external model is consulted, then Synthia integrates the result.
3. `provider_voice`: the selected external model supplies the displayed answer, while Synthia still owns context, memory, tools, provenance, and orchestration.

Provider credentials are not stored in this package or in provider-preference rows. Only secure/local credential references may be passed to a transport adapter.

## Live provider transports
`HttpProviderTransport` includes credential-resolver based adapters for OpenAI Responses, Anthropic Messages, xAI Responses-compatible API, and custom endpoints. Model IDs remain user/config selected. Credentials are resolved at call time and are never written to provider-preference records.
