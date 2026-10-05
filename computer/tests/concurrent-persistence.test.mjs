import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FilePersistence } from '../backend/file-persistence.mjs';

test('overlapping realm observations and preference checkpoints restore the last accepted state', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'phone-checkpoint-'));
  try {
    const persistence = new FilePersistence(dir);
    await Promise.all(Array.from({ length: 60 }, (_, revision) => persistence.save('phone', { revision, photo: 'x'.repeat(100000), episode: { actor: 'player', position: [revision,1,0] } })));
    const reboot = new FilePersistence(dir);
    assert.equal((await reboot.load('phone')).revision, 59);
    assert.deepEqual((await reboot.load('phone')).episode.position, [59,1,0]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
