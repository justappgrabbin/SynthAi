import { createServer } from 'node:http';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { ConversationExecution } from '../services/conversation-execution.mjs';
import { MemoryPersistence } from '../core/kernel.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalConversationModel } from '../services/local-conversation-model.mjs';

test('uses an installed local model and carries earlier dialogue into generation', async () => {
  const calls = [];
  const model = new LocalConversationModel({
    fetcher: async (url, init = {}) => {
      calls.push({url:String(url), init});
      if (String(url).endsWith('/api/tags'))
        return {ok:true,json:async()=>({models:[
          {name:'qwen3:30b',size:18000000000},
          {name:'llama3.2:latest',size:2000000000},
        ]})};
      if (String(url).endsWith('/api/chat'))
        return {ok:true,json:async()=>({message:{role:'assistant',content:'I followed your earlier meaning and this new question.'}})};
      throw Error('Unknown URL');
    }
  });
  const reply = await model.reply({
    input: 'What did you understand from what I just said?',
    history:[{input:'Do not create new architectures.',text:'I will use your existing system.',answerKind:'local-generative-dialogue'}],
    reading:{grammarFrame:'interrogative',candidateClaims:[{text:'speaker requested preservation'}]},
  });
  assert.equal(reply.kind,'local-generative-dialogue');
  assert.equal(reply.llm,true);
  assert.equal(reply.provider,'local:ollama:llama3.2:latest');
  assert.match(reply.text,/earlier meaning/);
  const request = JSON.parse(calls.find(x=>x.url.endsWith('/api/chat')).init.body);
  assert.equal(request.model,'llama3.2:latest');
  assert.equal(request.messages.at(-1).role,'user');
  assert.match(request.messages.find(x=>x.role==='system').content,/AutoLing, DISEMINER/);
  assert.ok(request.messages.some(x=>x.content==='Do not create new architectures.'));
  assert.equal(request.stream,false);
});

test('missing local model is reported rather than replaced by a fake generated answer', async () => {
  const model=new LocalConversationModel({fetcher:async()=>{throw Error('ECONNREFUSED')}});
  const result=await model.reply({input:'How would you solve this?'});
  assert.equal(result.llm,false);
  assert.equal(result.kind,'conversation-model-unavailable');
  assert.match(result.text,/not available/i);
});

test('rejects remote model hosts rather than leaking conversation history off device', () => {
  assert.throws(()=>new LocalConversationModel({endpoint:'https://third-party.example:11434'}),/loopback/);
  assert.throws(()=>new LocalConversationModel({endpoint:'http://192.168.0.2:11434'}),/loopback/);
});

test('an explicit model must be locally installed', async () => {
  const model = new LocalConversationModel({
    model:'unknown',
    fetcher:async()=>({ok:true,json:async()=>({models:[{name:'llama3.2:latest'}]})}),
  });
  const status=await model.available();
  assert.equal(status.ready,false);
  assert.match(status.note,/not installed/);
});

test('real loopback HTTP model runs through original Computer, Klein pipeline and persisted chat', async () => {
  const requests = [];
  const stub = createServer(async (req, res) => {
    if (req.url === '/api/tags') {
      res.writeHead(200, {'content-type':'application/json'});
      res.end(JSON.stringify({models:[{name:'llama3.2:latest',size:2000000000}]}));
      return;
    }
    if (req.url === '/api/chat') {
      let data = '';
      for await (const part of req) data += part;
      const body = JSON.parse(data);
      requests.push(body);
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({message:{role:'assistant',
        content:'The naming layer and the felt layer can describe different aspects of one relationship.'}}));
      return;
    }
    res.writeHead(404);res.end();
  });
  await new Promise(resolve=>stub.listen(0,'127.0.0.1',resolve));
  const url = 'http://127.0.0.1:' + stub.address().port;
  const options = {persistence:new MemoryPersistence(),namespace:'real-http-'+randomUUID(),
    eventLogPath:join(tmpdir(),'synthia-real-http-'+randomUUID()+'.jsonl')};
  try {
    const computer = await new ComputerRuntime(options).boot();
    const chat = new ConversationExecution(computer);
    chat.localModel = new LocalConversationModel({endpoint:url});
    const answer = await chat.talk('Explore naming and feeling within one relationship.');
    assert.equal(answer.answerKind,'local-generative-dialogue');
    assert.equal(answer.provider,'local:ollama:llama3.2:latest');
    assert.equal(answer.llm,true);
    assert.match(answer.text,/naming layer/);
    assert.equal(answer.resident.toolEvidence.autoling,'executed');
    assert.equal(answer.resident.toolEvidence.diseminer,'executed');
    assert.equal(chat.history().at(-1).text,answer.text);
    assert.ok(computer.synthia.spacetime.nodes.some(n=>n.type==='response'&&n.text===answer.text));
    assert.equal(requests.length,1);
    assert.equal(requests[0].messages.at(-1).content,'Explore naming and feeling within one relationship.');
  } finally {
    await rm(options.eventLogPath,{force:true});
    await new Promise(resolve=>stub.close(resolve));
  }
});
