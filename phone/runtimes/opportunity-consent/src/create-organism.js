import { EventBus } from './event-bus.js';
import { OpportunityLedger } from './opportunity-ledger.js';
import { ExternalCapabilityResolver } from './capability-resolver.js';
import { OpportunityEvaluator } from './opportunity-evaluator.js';
import { RelationshipAuthority } from './relationship-authority.js';
import { OutreachGuard } from './outreach-guard.js';
import { InvitationBroker } from './invitation-broker.js';
import { ConsentManager } from './consent-manager.js';
import { SelfDeploymentManager } from './self-deployment-manager.js';
import { ExternalOutcomeTracker, ValueAttributionEngine } from './outcome.js';
import { ExternalOpportunityOrchestrator } from './orchestrator.js';
import { SynthiaRuntimeBridge } from './runtime-bridge.js';

/**
 * One canonical assembly point for the external relationship membrane.
 * Existing Synthia runtime is injected; it is never copied or rewritten.
 */
export function createExternalRelationshipOrganism({
  runtime,
  successAutomaton=null,
  mesh=null,
  localResolver=null,
  organismResolver=null,
  networkResolver=null,
  mcpResolver=null,
  humanResolver=null,
  transports={},
  channelPolicy=()=>true,
  provisioner=null,
  allowedPackages=[],
  consentSecret,
  minimumMutualBenefit=0.55
}={}) {
  const eventBus = new EventBus();
  const ledger = new OpportunityLedger();
  const runtimeBridge = runtime ? new SynthiaRuntimeBridge({runtime, successAutomaton, mesh, eventBus}) : null;

  const capabilities = new ExternalCapabilityResolver({
    local: localResolver,
    organism: organismResolver,
    network: networkResolver,
    mcp: mcpResolver,
    human: humanResolver
  });
  const evaluator = new OpportunityEvaluator({minimumMutualBenefit});
  const authority = new RelationshipAuthority();
  const guard = new OutreachGuard({ledger, channelPolicy});
  const invitations = new InvitationBroker({ledger, guard, transports});
  const consent = new ConsentManager({secret:consentSecret, ledger});
  const deployment = new SelfDeploymentManager({consent, ledger, provisioner, allowedPackages});
  const outcomes = new ExternalOutcomeTracker({ledger, eventBus});
  const valueAttribution = new ValueAttributionEngine();

  const orchestrator = new ExternalOpportunityOrchestrator({
    capabilities,evaluator,authority,guard,invitations,ledger,consent,deployment,outcomes,valueAttribution,eventBus,
    scienceAdapter: runtimeBridge?.scienceAdapter(),
    successAdapter: runtimeBridge?.successAdapter()
  });

  // Outcomes return to the mesh after ledger/science recording.
  if (runtimeBridge) {
    eventBus.on('external.outcome', async payload => {
      await runtimeBridge.meshAdapter().publish('external.outcome', payload);
    });
  }

  return {
    orchestrator,
    runtimeBridge,
    eventBus,
    ledger,
    capabilities,
    evaluator,
    authority,
    guard,
    invitations,
    consent,
    deployment,
    outcomes,
    valueAttribution
  };
}
