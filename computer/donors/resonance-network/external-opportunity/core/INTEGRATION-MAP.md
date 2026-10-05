# Integration Map

## Placement

Stellar CPU
- Synthia organism
  - IntentFlow
  - Capability Resolver (this package)
  - Mesh / state space
  - Automata execution
- External Relationship Plane (this package)
  - RelationshipAuthority
  - OpportunityEvaluator
  - OutreachGuard
  - OpportunityLedger
  - InvitationBroker
  - ConsentManager
  - SelfDeploymentManager
  - OutcomeTracker
  - ValueAttributionEngine
- Stellar Proximology
  - ScientistLoop adapter
- Resonance Network
  - candidate/network capability adapter

## Runtime loading

Always-on lightweight core:
- RelationshipAuthority
- OutreachGuard
- ledger index / consent verifier

Wake on demand:
- External capability search
- invitation transport
- deployment provisioner
- outcome reconciliation

Remote/service plane preferred:
- MCP discovery/catalog search
- organization/person opportunity search
- installer package selection/building
- long-running outcome analytics

This keeps the phone client small while preserving the full organism capability.

## v1.1 Canonical Wiring

```text
Existing SynthiaResonanceRuntime
        │
        ├── IntentFlow demands ───────┐
        ├── AspirationCore gaps ──────┤
        │                             ▼
        │                  SynthiaRuntimeBridge
        │                             │
        │                             ▼
        │              ExternalRelationshipOrganism
        │                             │
        │  local → organism → network → MCP → human
        │                             │
        │                   OpportunityEvaluator
        │                             │
        │                 RelationshipAuthority
        │                             │
        │                     OutreachGuard
        │                             │
        │                    InvitationBroker
        │                             │
        │                     ConsentManager
        │                             │
        │                SelfDeploymentManager
        │                             │
        │                  ExternalOutcomeTracker
        │                             │
        ├──── ScienceMode ◄───────────┤
        ├─ SuccessAutomaton ◄─────────┤
        └────────── Mesh ◄────────────┘
```

The membrane is mounted, not forked: the existing runtime remains the canonical Synthia organism.
