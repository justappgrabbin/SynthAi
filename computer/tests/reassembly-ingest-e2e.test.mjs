import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { JsonFilePersistence } from '../runtime/json-file-persistence.mjs';
import { ConversationExecution } from '../services/conversation-execution.mjs';
import { FileAdmission } from '../services/file-admission.mjs';

test('imported source survives restart and exact address reactivates ATO and execution', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'synthia-computer-e2e-'));
  try {
    const start = async () => {
      const computer = await new ComputerRuntime({ persistence: new JsonFilePersistence(join(directory, 'state.json')) }).boot();
      const conversation = new ConversationExecution(computer);
      return { computer, conversation, files: new FileAdmission(computer, conversation.execution) };
    };
    const first = await start();
    const dnaSource = 'export function answer() { return 6 * 7; }';
    const dnaRecord = await first.files.write('/home/user/Imports/library.js', dnaSource, 'e2e');
    assert.equal(dnaRecord.meta.dna.pieces, 1);
    const source = 'function answer() { return 6 * 7; }\nconsole.log(answer());';
    const record = await first.files.write('/home/user/Imports/source.js', source, 'e2e');
    assert.ok(record.meta.addressKey);
    assert.ok(first.conversation.execution.execution.capabilityMesh.getNode(`file:${record.meta.addressKey}:${record.meta.digest}`));
    const second = await start();
    const recalled = await second.files.activate(record.meta.addressKey, record.path);
    assert.equal(recalled.activation.automatonId, 'addressed-file-recall');
    assert.equal(recalled.content, source);
    const receipt = await second.conversation.executeArtifact({ name: 'source.js', type: 'javascript', content: recalled.content });
    assert.equal(receipt.ok, true);
    assert.equal(receipt.stages.length, 11);
    assert.deepEqual(receipt.result.result.stdout, ['42']);
    assert.equal(second.files.resolve('wrong-address').length, 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
