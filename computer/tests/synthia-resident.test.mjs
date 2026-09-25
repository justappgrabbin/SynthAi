import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { CANONICAL_KIMI_TOOLS, RESIDENT_BOOT_ORDER } from '../services/synthia-resident.mjs';

test('resident computer boots canonical substrate in declared order', async () => {
  const computer = await new ComputerRuntime().boot();
  const snapshot = computer.resident.snapshot();
  assert.equal(snapshot.status, 'ready');
  assert.deepEqual(snapshot.order, [...RESIDENT_BOOT_ORDER]);
  assert.equal(snapshot.stateSpace.atoKernelStates, 64);
  assert.equal(snapshot.kimi.toolCount >= 16, true);
  const ids = new Set(snapshot.kimi.tools.map(tool => tool.id));
  for (const id of CANONICAL_KIMI_TOOLS) assert.equal(ids.has(id), true, `missing canonical Kimi tool ${id}`);
  for (const projection of ['knowledge', 'causal', 'phase', 'temporal', 'dependency']) {
    assert.ok(snapshot.kimi.mesh[projection], `missing mesh projection ${projection}`);
  }
});

test('resident chat always executes Klein and Kimi state-space path', async () => {
  const computer = await new ComputerRuntime().boot();
  const result = await computer.chat('build a browser tool and connect it to the mesh');
  assert.match(result.reply, /build a browser tool/i);
  for (const stage of ['state-space', 'ato-engine', 'tool-factory', 'autoling', 'diseminer', 'klein-analogy', 'conversation']) {
    assert.equal(result.trace.includes(stage), true, `chat trace missing ${stage}`);
  }
  assert.ok(result.klein);
  assert.ok(result.learning);
});

test('tool factory retains a generated tool only after a successful runtime probe', async () => {
  const computer = await new ComputerRuntime().boot();
  const result = await computer.growTool({
    purpose: 'resident verification base tool',
    input: 'resident verification',
    dimension: 'Being',
    level: 0,
  });
  assert.equal(result.retention, 'VERIFIED');
  assert.ok(result.tool?.id);
  assert.equal(computer.autoRegistrar.get('tool', result.tool.id)?.status, 'VERIFIED');
});

test('build intake promotes verified builds and keeps failed builds out of resident autoload', async () => {
  const computer = await new ComputerRuntime().boot();
  const good = await computer.receiveBuild({
    id: 'synthia-test-good',
    name: 'Synthia Test Good',
    version: '1.0.0',
    platform: 'android',
    source: 'test',
    capabilities: ['chat'],
    verification: { status: 'passed', tests: [{ name: 'smoke', passed: true }] },
  });
  assert.equal(good.status, 'PROMOTED');
  assert.equal(computer.resident.loadedBuilds.has('synthia-test-good'), true);

  const bad = await computer.receiveBuild({
    id: 'synthia-test-bad',
    name: 'Synthia Test Bad',
    version: '1.0.0',
    platform: 'android',
    source: 'test',
    verification: { status: 'failed', tests: [{ name: 'smoke', passed: false }] },
  });
  assert.equal(bad.status, 'REJECTED');
  assert.equal(computer.resident.loadedBuilds.has('synthia-test-bad'), false);
});

test('admin center exposes MCP resident provider, browser hands, and Android self-compile inspection', async () => {
  const computer = await new ComputerRuntime().boot();
  const admin = computer.adminSnapshot();
  assert.equal(admin.status, 'ready');
  assert.equal(admin.mcp.providers.includes('synthia-resident'), true);
  assert.deepEqual(admin.browser.tools.map(tool => tool.id).sort(), ['browser-form', 'research-browser']);
  const android = computer.inspectAndroid({ commands: ['node', 'java', 'aapt2', 'apksigner'] });
  assert.equal(android.available, true);
});
