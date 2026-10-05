# Synthia MCP Opportunity & Consent Layer v1.0

Executable implementation of the YOU-N-I-VERSE external relationship membrane.

## What is implemented

- Cascading capability resolution: local → organism → network → MCP → human opportunity
- Reciprocal opportunity scoring (requires both candidate capability and network value)
- RelationshipAuthority gate
- OutreachGuard with a hard single-invitation rule
- Append-only hash-chained OpportunityLedger
- InvitationBroker with pluggable authorized transports
- Separate collaboration and installation consent records
- HMAC-verifiable consent tokens with explicit scopes and revocation
- SelfDeploymentManager that cannot deploy without a valid installation token, correct device owner, allowlisted package, and authorized provisioner
- External outcome tracking
- Value attribution where no success share exists without actual value + facilitation evidence + prior agreement
- ScientistLoop and SuccessAutomaton adapters
- Wiring audit
- Node integration tests

## Important boundary

This package does **not** silently install software, bypass operating-system security, scrape private identities, or contact people by itself. Real transports, MCP resolvers, and device provisioners are adapters supplied by Stellar CPU. The core enforces authorization/consent before those adapters can be called.

## Run

```bash
npm test
```

## Existing Synthia integration

### IntentFlow / capability gaps
Feed unresolved gaps into:

```js
const resolution = await externalOpportunity.find(need)
```

### ScienceMode / ScientistLoop
Provide an adapter:

```js
scienceAdapter: {
  recordExperiment: async ({ opportunityId, predicted, actual }) => {
    const q = science.formulateQuestion(`Did external opportunity ${opportunityId} create predicted value?`)
    science.recordExperiment(q.id, 'external_collaboration', predicted, actual)
  }
}
```

### SuccessAutomaton
Provide:

```js
successAdapter: {
  observe: ({ opportunityId, outcome }) => successAutomaton.observe({ opportunityId, outcome })
}
```

### MCP Hub
Implement a resolver with the small contract:

```js
const mcpResolver = {
  async resolve(need) {
    // query only authorized MCP capability catalogs
    return { satisfied: false, candidates: [] }
  }
}
```

### Deployment
The provisioner is deliberately outside the core:

```js
const provisioner = {
  async deploy(plan) {
    // Stellar CPU chooses device-specific installer/package here.
    // plan arrives only after installation consent has been cryptographically verified.
    return { ok: true, runtimeId: '...' }
  }
}
```

## State flow

DISCOVERED → ELIGIBLE → INVITED → ACCEPTED/DECLINED/EXPIRED

ACCEPTED → COLLABORATING → INSTALL_OFFERED → APPROVED/DECLINED → INSTALLED

Declined/expired consumes automated outreach. Installation approval is a separate consent object from collaboration approval.

## v1.1 Integrated Runtime Bridge

This package now includes `SynthiaRuntimeBridge` and `createExternalRelationshipOrganism()`.

The bridge mounts the opportunity/consent membrane onto an existing `SynthiaResonanceRuntime` instance without rewriting the runtime. It reads unresolved IntentFlow demands and AspirationCore gaps, normalizes them as capability needs, and routes completed external outcomes back into ScienceMode, SuccessAutomaton-compatible adapters, and the mesh.

Canonical mount:

```js
import { createExternalRelationshipOrganism } from './src/index.js';

const external = createExternalRelationshipOrganism({
  runtime: existingSynthiaRuntime,
  successAutomaton,
  mesh,
  localResolver,
  organismResolver,
  networkResolver,
  mcpResolver,
  humanResolver,
  transports,
  channelPolicy,
  provisioner,
  allowedPackages
});

const openNeeds = external.runtimeBridge.getOpenNeeds();
```

All external relationship components are assembled behind this one factory. There is no second runtime and no independent app.
