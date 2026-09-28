import test from 'node:test';
import assert from 'node:assert/strict';
import { FederatedSynthia, ADDRESS_LAYER_ORDER } from '../src/index.mjs';

test('DNA substrate preserves 64 hexagram topologies, compatibility scaffolds, and exact per-agent charts', async () => {
  const synthia = await FederatedSynthia.create({ requireBirthConfiguration: false });
  const genome = synthia.semanticGenome;
  const initial = genome.snapshot();

  assert.equal(initial.organismType, 'agent-organism');
  assert.equal(initial.genomeType, 'agent-genome');
  assert.equal(initial.codonIdentity, 'hexagram');
  assert.equal(initial.hexagramCodons, 64);
  assert.equal(initial.persistentAspectPrimitives, 768);
  assert.equal(initial.identityCopiesAcrossDimensions, 0);
  assert.deepEqual(initial.addressOrder, ADDRESS_LAYER_ORDER);

  for (const codon of genome.codons.values()) {
    assert.equal(codon.aspects.length, 12);
    assert.equal(codon.dyads.length, 6);
  }

  const exact = genome.registerAgentChart('agent-exact', {
    replace: true,
    primaryPlanetary: 3,
    address: {
      planetary: 3,
      dimension: 'Space',
      gate: 25,
      line: 4,
      color: 5,
      tone: 2,
      base: 3,
      degree: 31,
      minute: 29,
      second: 37,
      arc: 42,
      zodiac: 8,
      house: 12,
    },
  });
  assert.equal(exact.placements.length, 65);
  assert.equal(exact.address.second, 37);
  assert.equal(exact.address.arc, 42);
  assert.equal(exact.address.zodiac, 8);
  assert.equal(exact.address.house, 12);
  assert.equal(exact.addressFields.length, 13);
  assert.equal(exact.exactSecondPreserved, true);

  const other = genome.registerAgentChart('agent-other');
  assert.notEqual(other.coordinateSignature, exact.coordinateSignature);

  const activation = genome.activate('Design and execute a new tool.', { agentId: 'agent-exact' });
  assert.equal(activation.agentId, 'agent-exact');
  assert.equal(activation.identityAddress.second, 37);
  assert.equal(activation.codon.sparseSemanticVector.length, 12);
  assert.equal(activation.agentCapabilities.canExecuteArtifacts, true);
  assert.equal(activation.agentCapabilities.canComposeTools, true);
  assert.equal(activation.sensoryExpression.intake.food, null);
  assert.equal(activation.sourceStatus.generatedTraitWeights, false);
  assert.equal(activation.sourceStatus.fiveDimensionMeanVector, false);
  assert.equal(activation.sharedSubstrate.oneSubstrate, true);
  assert.equal(activation.codon.semanticVectorSource.includes('no hash-generated trait vector'), true);
  assert.equal(activation.lineMeaning.title, 'Survival');

  const being = genome.project(25, 'Being');
  const space = genome.project(25, 'Space');
  assert.equal(being.aspects[0], space.aspects[0]);

  const tray = await synthia.executeTray({
    kind: 'genome',
    id: 'genome:gate-25',
    input: { operation: 'activate', task: 'Build code.', address: { gate: 25, line: 4, second: 37 } },
    context: { agentId: 'agent-exact', diagnosticMode: true },
  });
  assert.equal(tray.ok, true);
  assert.equal(tray.output.agentId, 'agent-exact');

  const audit = synthia.wiringAudit();
  assert.equal(audit.persistentAspectPrimitives768, true);
  assert.equal(audit.nineCenterGenomeClusters, true);
  assert.equal(audit.channelGenomeExchange, true);
  assert.equal(audit.fullAgentAddressPreserved, true);
  assert.equal(audit.fineDifferentiationPreserved, true);
  assert.equal(audit.exactSecondPreserved, true);
});
