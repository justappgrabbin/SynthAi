import synthia, { embodiment, morphChange, morphSubstrate, remoteCapabilities } from '../synthiaRuntime.mjs';
import grammarSystems from '../grammarSystemsRuntime.mjs';
import coreCapabilities from '../coreCapabilityRuntime.mjs';
import nativeGrammar from '../native-grammar/runtime.mjs';
import morphChat from '../morph-chat/runtime.mjs';
import livingOrganism from '../organism/livingOrganismRuntime.mjs';
import { SynthiaSwarmBody } from './swarmBody.mjs';
import { defaultCheckpointStore } from './checkpointStores.mjs';
import { capabilitiesOf } from './processAdapter.mjs';
import { attachFoundryProcesses } from '../../../foundry/foundryProcesses.mjs';
import { SwarmCapabilityBridge } from './capabilityBridge.mjs';
import { createPhysiology } from '../physiology/index.mjs';
import { PracticeWorldPort } from '../world/practiceWorldPort.mjs';

function maybeRegisterRuntime(swarm, target, options) {
  try { return swarm.registerTarget(target, options); }
  catch { return null; }
}

export async function bootstrapCurrentSynthiaSwarm({ store = null, identity = null, attachFoundry = true } = {}) {
  const persistence = store || await defaultCheckpointStore();
  const swarm = new SynthiaSwarmBody({
    identity: identity || { id: 'synthia', name: 'Synthia', model: 'autonomata-organism', visibleBodies: 1 },
    store: persistence,
  });

  // Independent ATO worker meshes already present in the verified current donor.
  // The orchestrator is itself an independent Automaton; its private coordination mesh starts empty.
  maybeRegisterRuntime(swarm, synthia.automaton, { group: 'orchestration', maxConcurrency: 2 });
  swarm.registerMesh(synthia.orchestrator.mesh, { group: 'orchestration' });
  swarm.registerMesh(grammarSystems.mesh, { group: 'grammar' });
  swarm.registerMesh(coreCapabilities.mesh, { group: 'foundry-tools' });

  // Preserved semantic/Klein autonomata use a separate mesh implementation.
  // Do not register LivingMesh external-node proxies as second swarm workers:
  // they are semantic views over independently registered organs/hands below.
  // Only the canonical semantic automatons whose ids are not privately bound
  // are real workers in this group. This keeps one process identity per hand.
  for (const [id, target] of synthia.meshRuntime.engine.mesh.automata) {
    if (synthia.meshRuntime.privateBindings.has(id)) continue;
    maybeRegisterRuntime(swarm, target, { id, group: 'semantic-klein', maxConcurrency: 1 });
  }
  for (const [id, target] of morphChat.klein) {
    const declared = capabilitiesOf(target);
    swarm.registerTarget(target, {
      id: `klein:${id}`,
      group: 'klein-hands',
      capabilities: declared.length ? declared : ['klein.invoke', `klein.${id}`],
      maxConcurrency: 1,
      metadata: { nativeId: id, family: 'current-ato-klein' },
    });
  }

  // Stateful organs remain separate processes; none is promoted to "the Synthia process".
  maybeRegisterRuntime(swarm, livingOrganism, { group: 'continuity', maxConcurrency: 1 });
  maybeRegisterRuntime(swarm, nativeGrammar, { group: 'grammar', maxConcurrency: 1 });
  maybeRegisterRuntime(swarm, morphSubstrate, { group: 'morph-hands', maxConcurrency: 2 });
  maybeRegisterRuntime(swarm, morphChange, { group: 'morph-hands', maxConcurrency: 1 });
  maybeRegisterRuntime(swarm, embodiment, { group: 'body-router', maxConcurrency: 4 });
  maybeRegisterRuntime(swarm, remoteCapabilities, { group: 'remote-hands', maxConcurrency: 2 });
  maybeRegisterRuntime(swarm, synthia.selfIntegration, { group: 'self-integration', maxConcurrency: 1 });
  maybeRegisterRuntime(swarm, synthia.selfIntegration.transitionResolver, { group: 'self-integration', maxConcurrency: 2 });

  // v14 physiology is transplanted as independent processes, not as the old browser shell.
  // Metabolism, inner life, hypothesis life, world memory and the autonomous physiology
  // cycle each keep their own state/lifecycle and are bridged back into Synthia's broker.
  const physiology = createPhysiology();
  for (const process of physiology.processes) {
    maybeRegisterRuntime(swarm, process, { group: 'physiology', maxConcurrency: 1, metadata: { origin: 'synthia-v14-physiology-transplant' } });
  }
  synthia.attachPhysiology(physiology);

  // Replaceable visible-world boundary. The physiology world remains Synthia's
  // persistent internal world model; this port lets Adaya's practical habitat
  // observe it and accept actions without becoming the canonical brain/world.
  const worldPort = new PracticeWorldPort({ physiology });
  maybeRegisterRuntime(swarm, worldPort, { group: 'world-port', maxConcurrency: 1, metadata: { replaceableHabitat: true } });

  // The actual Pool/Forge/Vault Foundry donor joins as four independent hands.
  // It is capability-routed like every other organ; it never becomes a central Synthia blob.
  if (attachFoundry) attachFoundryProcesses(swarm);

  // Publish outer hands back into Synthia's inner capability broker. New host hands
  // (YOU-N-I-VERSE, phone Linux, later device peers) are mirrored dynamically as
  // proxies, so Synthia can discover and invoke them from her own decision path.
  const capabilityBridge = new SwarmCapabilityBridge({
    swarm,
    // DEG / Geo-DEG and the integrated Tool Factory are already native broker
    // meshes. Exclude those exact workers, not their entire families, so
    // Native Grammar and canonical semantic tools remain discoverable from
    // Synthia's own decision path.
    excludeWorkerIds: new Set([
      'deg-grammar-learner',
      'geo-deg-grammar-geometry',
      'synthia-tool-synthesis-worker',
    ]),
    onProxy: (proxy, worker) => {
      try {
        synthia.meshRuntime.attachATO(proxy, {
          id: proxy.id,
          capabilities: [...worker.capabilities],
          address: worker.address || null,
          origin: `swarm:${worker.group}`,
        });
      } catch { /* duplicate/unsupported proxy is non-fatal; ATO broker still has it */ }
    },
  });
  synthia.orchestrator.attachToolMesh(capabilityBridge.mesh);

  await swarm.wake();
  return Object.freeze({ swarm, synthia, capabilityBridge, physiology, worldPort });
}

export default bootstrapCurrentSynthiaSwarm;
