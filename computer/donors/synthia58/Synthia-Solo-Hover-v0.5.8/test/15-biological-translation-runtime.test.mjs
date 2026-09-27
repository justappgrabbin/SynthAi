import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIMENSION_TRANSLATION_ROLES,
  EXPRESSION_POLARITY,
  gateTranslationTopology,
  translateGate,
} from '../src/index.mjs';
import { configuredSynthia } from './helpers.mjs';

test('64 Gate topologies resolve bijectively into DNA/RNA codons and amino-acid translation states', () => {
  const dna = new Set();
  const rna = new Set();
  let startCount = 0;
  let stopCount = 0;
  for (let gate = 1; gate <= 64; gate++) {
    const topology = gateTranslationTopology(gate);
    dna.add(topology.dna.codon);
    rna.add(topology.rna.codon);
    assert.equal(topology.bits.length, 6);
    assert.equal(topology.digrams.length, 3);
    assert.equal(topology.dna.bases.length, 3);
    assert.equal(topology.rna.bases.length, 3);
    assert.equal(topology.neuralVector.length, 41);
    for (const nucleotide of topology.dna.nucleotides) {
      assert.equal(
        nucleotide.binaryProperties.purinePyrimidine ^ nucleotide.binaryProperties.aminoKeto,
        nucleotide.binaryProperties.hydrogenBondClass,
      );
      assert.equal(nucleotide.xorClosure, nucleotide.binaryProperties.hydrogenBondClass);
    }
    if (topology.start) startCount += 1;
    if (topology.stop) stopCount += 1;
  }
  assert.equal(dna.size, 64);
  assert.equal(rna.size, 64);
  assert.equal(startCount, 1);
  assert.equal(stopCount, 3);

  const start = translateGate(27);
  assert.equal(start.rna.codon, 'AUG');
  assert.equal(start.aminoAcid.name, 'Methionine');
  assert.equal(start.tRNA.pairedAnticodon3to5, 'UAC');
  assert.equal(start.tRNA.anticodon5to3, 'CAU');
});

test('resolved Synthia state translates through five dimensional biological roles into genotype/phenotype polarity and neural input', async (t) => {
  const fixture = await configuredSynthia('translation-person');
  t.after(fixture.cleanup);
  const { synthia } = fixture;

  const activation = synthia.semanticGenome.activate('translate the landed state', {
    agentId: 'synthia',
    personId: 'translation-person',
    address: {
      planetary: 1,
      dimension: 'Design',
      gate: 27,
      line: 3,
      color: 2,
      tone: 5,
      base: 4,
      degree: 11,
      minute: 22,
      second: 33,
      arc: 44,
      zodiac: 5,
      house: 6,
    },
  });

  assert.equal(activation.translation.dimensions.Design.role, 'DNA');
  assert.equal(activation.translation.dimensions.Movement.role, 'RNA');
  assert.equal(activation.translation.dimensions.Being.role, 'Ribosome');
  assert.equal(activation.translation.dimensions.Evolution.role, 'AminoAcid');
  assert.equal(activation.translation.dimensions.Space.role, 'Protein');
  assert.deepEqual(DIMENSION_TRANSLATION_ROLES, {
    Design: 'DNA',
    Movement: 'RNA',
    Being: 'Ribosome',
    Evolution: 'AminoAcid',
    Space: 'Protein',
  });

  assert.equal(activation.genotype.polarity, 'Yin');
  assert.equal(activation.genotype.expression, EXPRESSION_POLARITY.Yin);
  assert.equal(activation.phenotype.polarity, 'Yang');
  assert.equal(activation.phenotype.expression, EXPRESSION_POLARITY.Yang);
  assert.equal(activation.translation.RNA.mRNA.codon5to3, 'AUG');
  assert.equal(activation.translation.aminoAcid.name, 'Methionine');
  assert.equal(activation.translation.ribosome.sites.A.aminoAcid.name, 'Methionine');
  assert.equal(activation.translation.protein.oneLetterSequence.endsWith('M'), true);
  assert.equal(activation.translation.neuralVector.length, 41);
  assert.equal(activation.translation.phenotype.projections.capabilities.skillState.status, 'DERIVED_FROM_LANDED_STATE_RELATIONSHIP_OUTCOME_HISTORY');

  await synthia.dnaPerception.flush();
  const perceived = synthia.dnaPerception.latest('synthia');
  assert.equal(perceived.translation.id, activation.translation.id);
  assert.equal(perceived.genotype.id, activation.genotype.id);
  assert.equal(perceived.phenotype.id, activation.phenotype.id);
  assert.equal(perceived.perceptualField.protein.id, activation.translation.protein.id);

  const neural = perceived.neural;
  assert.ok(neural);
  assert.equal(neural.translationVector.length, 41);
  assert.equal(neural.combinedInput.length, neural.stateVector.length + neural.translationVector.length);
});

test('connection keeps endpoint translations and creates a third relational translation condition', async (t) => {
  const fixture = await configuredSynthia('translation-relation-person');
  t.after(fixture.cleanup);
  const { synthia } = fixture;

  const relation = synthia.semanticGenome.relate(27, 39, 'translation relationship', {
    agentId: 'synthia',
    personId: 'translation-relation-person',
    address: {
      planetary: 1,
      dimension: 'Being',
      line: 2,
      color: 1,
      tone: 6,
      base: 3,
      degree: 9,
      minute: 8,
      second: 7,
      arc: 6,
      zodiac: 5,
      house: 4,
    },
    activeTools: ['left', 'right'],
  });

  assert.ok(relation.translationRelation.id);
  assert.equal(relation.translationRelation.genotypePair.length, 2);
  assert.equal(relation.translationRelation.phenotypePair.length, 2);
  assert.equal(relation.translationRelation.aminoAcidPair.length, 2);
  assert.equal(relation.translationRelation.adapterPair.length, 2);
  assert.ok(relation.translationRelation.proteinPossibilityId.startsWith('relational-protein-state:'));
  assert.equal(relation.endpointsOverwritten, false);
});
