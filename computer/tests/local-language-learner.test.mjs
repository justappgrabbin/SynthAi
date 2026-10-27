import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rm } from 'node:fs/promises';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { ConversationExecution } from '../services/conversation-execution.mjs';
import { MemoryPersistence } from '../core/kernel.mjs';

test('explicitly corrected reply trains a real conditional local token model and survives reboot', async () => {
  const config = {
    persistence: new MemoryPersistence(),
    namespace: 'local-language-' + randomUUID(),
    eventLogPath: join(tmpdir(), 'synthia-local-language-' + randomUUID() + '.jsonl'),
  };
  try {
    const first = await new ComputerRuntime(config).boot();
    const chat = new ConversationExecution(first);
    assert.equal(first.languageLearner.status().pretrained, false);
    assert.equal(first.languageLearner.status().trainedExamples, 0);
    assert.equal(first.languageLearner.infer('Invent an original space opera'), null);
    const original = await chat.talk('Invent an original space opera');
    assert.equal(original.answerKind, 'conversation-model-unavailable');

    await assert.rejects(() => chat.teachLanguage({
      turnId:'unrecognized-id', answer:'In space we dance',
    }), /Cannot train without an existing chat turn/);

    const corrected = 'A pilot crosses the violet nebula and discovers an abandoned observatory.';
    const taught = await chat.teachLanguage({ turnId:original.id, answer:corrected });
    assert.equal(taught.model.trainedExamples,1);
    assert.equal(taught.model.llm,false);
    const inferred = first.languageLearner.infer('Invent an original space opera');
    assert.equal(inferred.kind,'human-trained-sequence');
    assert.equal(inferred.llm,false);
    assert.equal(inferred.verified,false);
    assert.ok(inferred.text.includes('pilot'));
    assert.equal(first.languageLearner.infer('What is the price of a bicycle?'),null);

    const newResponse = await chat.talk('Invent an original space opera');
    assert.equal(newResponse.answerKind,'human-trained-sequence');
    assert.equal(newResponse.provider,'computer:local-sequence-learner');
    assert.equal(newResponse.evidence[0].verified,false);
    assert.ok(newResponse.text.includes('pilot'));

    const restored = await new ComputerRuntime(config).boot();
    assert.equal(restored.languageLearner.status().trainedExamples,1);
    assert.ok(restored.languageLearner.infer('Invent an original space opera').text.includes('pilot'));
  } finally {
    await rm(config.eventLogPath,{force:true});
  }
});

test('unapproved arbitrary user utterances cannot automatically train answer output',async()=>{
  const config={
    namespace:'local-no-autolearn-'+randomUUID(),
    eventLogPath:join(tmpdir(),'synthia-no-autolearn-'+randomUUID()+'.jsonl'),
  };
  try {
    const computer=await new ComputerRuntime(config).boot();
    await computer.synthia.observe("A book's secret machinery is actually a comet.");
    assert.equal(computer.languageLearner.status().trainedExamples,0);
    assert.equal(computer.languageLearner.infer('Explain the comet machinery'),null);
  } finally { await rm(config.eventLogPath,{force:true}); }
});
