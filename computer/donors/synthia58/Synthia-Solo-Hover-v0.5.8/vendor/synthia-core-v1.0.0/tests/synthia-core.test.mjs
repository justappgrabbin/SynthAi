import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { SynthiaCore } from '../src/SynthiaCore.mjs';

describe('SynthiaCore', () => {

  it('boots with Synthia seeded at Gate 1 Being', () => {
    const core = new SynthiaCore();
    const snap = core.boot();
    assert.equal(snap.booted, true);
    assert.ok(snap.entities >= 1, 'Synthia herself must be registered');
    const synthia = core.learning.registry.get('synthia');
    assert.equal(synthia.nativeAddress.gate, 1);
    assert.equal(synthia.nativeAddress.dimension, 'Being');
    assert.equal(synthia.sayings.Being, 'I Am');
  });

  it('mounts all ATO tools on boot', () => {
    const core = new SynthiaCore();
    core.boot();
    const tools = core.tools();
    assert.ok(tools.length >= 8, `expected at least 8 tools, got ${tools.length}`);
    const ids = tools.map(t => t.id);
    assert.ok(ids.includes('autoling'), 'autoling must be mounted');
    assert.ok(ids.includes('diseminer'), 'diseminer must be mounted');
    assert.ok(ids.includes('klein-analogy'), 'klein-analogy must be mounted');
  });

  it('waters text and returns gate candidates', () => {
    const core = new SynthiaCore();
    core.boot();
    const result = core.water('learning through movement and change');
    assert.ok(result.topGate >= 1 && result.topGate <= 64, 'top gate must be 1..64');
    assert.ok(result.candidates.length > 0, 'must return candidates');
    assert.equal(result.text, 'learning through movement and change');
  });

  it('admits a piece and returns a dimensional address', () => {
    const core = new SynthiaCore();
    core.boot();
    core.water('relating to others through felt presence');
    const admitted = core.admit({
      id:   'heart-test',
      text: 'relating to others through felt presence',
      type: 'concept',
    });
    assert.ok(admitted.gate >= 1 && admitted.gate <= 64);
    assert.ok(['Movement','Evolution','Being','Design','Space'].includes(admitted.dimension));
    assert.ok(admitted.questionId, 'should record a scientist question');
    const registered = core.learning.registry.get('heart-test');
    assert.ok(registered, 'piece must be in registry after admission');
  });

  it('contact produces a sentence from the mesh', () => {
    const core = new SynthiaCore();
    core.boot();
    core.admit({ id: 'a', text: 'the field integrates all expressions', type: 'concept' });
    core.admit({ id: 'b', text: 'learning through movement', type: 'concept' });
    const result = core.contact('a', 'b', { relation: 'informs' });
    assert.ok(result.sentence, 'contact must produce a sentence result');
    assert.ok(result.event, 'contact must produce an event');
  });

  it('calls a live ATO tool through the mesh', async () => {
    const core = new SynthiaCore();
    core.boot();
    const result = await core.call('diseminer', {
      operation: 'ingest',
      text: 'field heart mind body learn',
      context: { source: 'test' },
    });
    assert.ok(result?.id || result?.tokens, 'diseminer should return ingested doc');
  });

  it('accumulates water count and training records', () => {
    const core = new SynthiaCore();
    core.boot();
    core.water('first watering');
    core.water('second watering');
    core.water('third watering');
    const snap = core.snapshot();
    assert.equal(snap.waterCount, 3);
    assert.ok(snap.routes.length > 0, 'training journal should have routes');
  });

  it('snapshot reflects live state', () => {
    const core = new SynthiaCore();
    core.boot();
    core.water('something');
    core.admit({ id: 'piece-1', text: 'something to integrate', type: 'artifact' });
    const snap = core.snapshot();
    assert.ok(snap.entities >= 2, 'synthia + admitted piece');
    // admit(piece) deliberately resolves the piece through water(piece.text),
    // so the explicit watering plus admission are two accumulated waterings.
    assert.equal(snap.waterCount, 2);
  });

});
