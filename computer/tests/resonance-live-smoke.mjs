import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startResonanceSupervisor } from '../backend/resonance-supervisor.mjs';

const dataDir = await mkdtemp(join(tmpdir(), 'resonance-phone-'));
const supervisor = startResonanceSupervisor({ env: { ...process.env,
  RESONANCE_ROOT: resolve('computer/donors/resonance-network'),
  RESONANCE_DATA_DIR: dataDir }, probeIntervalMs: 100 });
try {
  const deadline = Date.now() + 60000;
  while (Object.values(supervisor.status().children).some(child => child.state !== 'ready')) {
    assert.ok(Date.now() < deadline, JSON.stringify(supervisor.status()));
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const base = 'http://127.0.0.1:17383';
  for (const path of ['/', '/home']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<div id="root">/);
  }
  const created = await fetch(base + '/api/profile/create', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      email: 'phone-smoke@example.invalid', display_name: 'Phone fixture',
      birth: { date: '1990-01-01', time: '12:00', utc_offset_hours: 0, latitude: 51.5, longitude: -0.1 }
    }) });
  const profile = await created.json();
  assert.equal(created.status, 200, JSON.stringify(profile));
  assert.ok(profile.user_id);
  assert.ok(Object.keys(profile.field_state).length > 0);
  const persisted = await (await fetch(base + '/api/profile/' + profile.user_id)).json();
  assert.equal(persisted.display_name, 'Phone fixture');
  assert.deepEqual(persisted.natal_report, profile.natal_report);
  console.log('PASS: real network frontend, ephemeris profile, persisted neural fields, supervised services');
} finally {
  supervisor.stop();
  await new Promise(resolve => setTimeout(resolve, 300));
  await rm(dataDir, { recursive: true, force: true });
}
