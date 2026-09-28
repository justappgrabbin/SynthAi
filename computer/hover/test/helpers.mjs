import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FederatedSynthia } from '../src/index.mjs';

export function testBirthRecord(personId = 'test-person', overrides = {}) {
  return {
    personId,
    agentId: 'synthia',
    birthDate: '2000-01-01',
    birthTime: '12:34:56',
    place: {
      label: 'Test Place',
      latitude: 40.7128,
      longitude: -74.006,
      timeZone: 'America/New_York',
    },
    ...overrides,
  };
}

export async function configuredSynthia(personId = 'test-person', options = {}) {
  const persistenceDir = await mkdtemp(join(tmpdir(), 'synthia-configured-test-'));
  const synthia = await FederatedSynthia.create({ ...options, persistenceDir });
  await synthia.configureBirthMirror(testBirthRecord(personId));
  return {
    synthia,
    persistenceDir,
    cleanup: () => rm(persistenceDir, { recursive: true, force: true }),
  };
}
