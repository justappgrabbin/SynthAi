import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { ConversationExecution } from '../services/conversation-execution.mjs';
import { MemoryPersistence } from '../core/kernel.mjs';

const computerOptions = () => ({
  persistence: new MemoryPersistence(),
  namespace: 'test:grounded:' + randomUUID(),
  eventLogPath: join(tmpdir(), 'synthia-grounded-' + randomUUID() + '.jsonl'),
});

test('grounded recall attributes user statements and excludes current question', async () => {
  const config = computerOptions();
  try {
    const computer = await new ComputerRuntime(config).boot();
    await computer.synthia.observe('The volcano model uses six tiers to route lava particles.');
    const question = await computer.synthia.observe('What did I say about volcano particles?');
    const answer = computer.groundedDialogue.respond('What did I say about volcano particles?', {
      currentReadingId: question.id,
    });
    assert.equal(answer.kind, 'speaker-recall');
    assert.match(answer.text, /six tiers to route lava particles/);
    assert.ok(!answer.text.includes('What did I say about volcano particles?'));
    assert.equal(answer.evidence[0].verified, false);
    assert.equal(answer.llm, false);
    assert.equal(computer.services.get('grounded-dialogue').provider, computer.groundedDialogue);
  } finally { await rm(config.eventLogPath, { force:true }); }
});

test('actual world state differs from unverified reports and never claims an action', async () => {
  const config = computerOptions();
  try {
    const computer = await new ComputerRuntime(config).boot();
    await computer.donorIntegration.receive({
      donor: 'adaptive-swarm-3d',kind:'dispatch',eventId:'world:dispatch:123',
      payload:{ status:'executed', result:{ mutated:true } },
    });
    const output = computer.groundedDialogue.respond('What happened in the swarm world?');
    assert.equal(output.kind,'world-status');
    assert.match(output.text, /0 live agents/);
    assert.match(output.text, /source reports, not verified/);
    assert.equal(output.evidence[0].verified, false);
    const film = computer.groundedDialogue.respond('What is the film story status?');
    assert.match(film.text, /no runtime film receipts/);
  } finally { await rm(config.eventLogPath, { force:true }); }
});

test('chat preserves grounded evidence and uses a real generative provider for unseen questions', async () => {
  const config = computerOptions();
  try {
    const computer = await new ComputerRuntime(config).boot();
    const chat = new ConversationExecution(computer);
    chat.localModel = { available: async()=>({ready:true,model:'test'}), reply: async({input})=>({text:'I can explore: '+input,kind:'local-generative-dialogue',provider:'local:ollama:test',llm:true,evidence:[]}) };
    const status = await chat.talk('What is the status of the Synthia model?');
    assert.equal(status.provider, 'computer:grounded-dialogue');
    assert.equal(status.llm, false);
    assert.match(status.text, /pretrained large language model: no/);
    assert.equal(status.answerKind, 'runtime-observation');
    const other = await chat.talk('Invent an original space opera');
    assert.equal(other.provider, 'local:ollama:test');
    assert.equal(other.answerKind, 'local-generative-dialogue');
    assert.equal(other.llm, true);
    assert.match(other.text, /Invent an original space opera/);
    assert.equal(other.evidenceVerified, false);
    assert.ok(other.text.length > 0);
    assert.equal(chat.history().length, 2);
    assert.equal(chat.history()[0].provider, 'computer:grounded-dialogue');
  } finally { await rm(config.eventLogPath, { force:true }); }
});

test('file answers derive from live Computer VFS rather than guessed file names', async () => {
  const config = computerOptions();
  try {
    const computer = await new ComputerRuntime(config).boot();
    const empty = computer.groundedDialogue.respond('List imported files');
    assert.match(empty.text, /No files are presently recorded/);
    assert.equal(empty.evidence.length, 0);
    // Actual import-index registration uses ArtifactIntake. This unit verifies
    // the dialogue VFS contract without inventing an imported app or ZIP.
    const file = await computer.vfs.write('/home/user/Imports/volcano-note.txt','Note about six tiers',{encoding:'utf8'});
    const present = computer.groundedDialogue.respond('List imported files');
    assert.match(present.text, /volcano-note.txt/);
    assert.equal(present.evidence[0].path, file.path);
  } finally { await rm(config.eventLogPath, { force:true }); }
});
