import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { RelayWorkerClient } from '../../public/relay-worker.mjs';

test('delivery deduplicates concurrent imports and separates worker addresses', async () => {
  const values = new Map([['relayWorkerUrl', 'https://first.example']]);
  globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const computer = new ComputerRuntime();
  const client = new RelayWorkerClient(computer);
  let requests = 0;
  client.request = async () => {
    requests++;
    await new Promise(resolve => setTimeout(resolve, 10));
    return { project: { name: client.url, files: [{ path: 'index.html', content: client.url, type: 'text/html' }] }, verification: { ok: true } };
  };
  try {
    const [first, repeated] = await Promise.all([client.importArtifact('same-job'), client.importArtifact('same-job')]);
    assert.equal(first.projectId, repeated.projectId);
    assert.equal(requests, 1);
    assert.equal(computer.projects.list().length, 1);
    assert.equal((await client.importArtifact('same-job')).projectId, first.projectId);
    values.set('relayWorkerUrl', 'https://second.example');
    const second = await client.importArtifact('same-job');
    assert.notEqual(second.projectId, first.projectId);
    assert.equal(computer.projects.list().length, 2);
    assert.equal(computer.projects.readFile(second.projectId, 'index.html').content, 'https://second.example');
  } finally { delete globalThis.localStorage; }
});
