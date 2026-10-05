import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { startSynthiaSupervisor } from './synthia-supervisor.mjs';

export function resonanceChildSpecs(env = process.env) {
  const root = env.RESONANCE_ROOT || '/opt/resonance';
  const dataDir = env.RESONANCE_DATA_DIR || '/var/lib/synthai/resonance';
  const base = { ...env, PYTHONUNBUFFERED: '1', PYTHONDONTWRITEBYTECODE: '1' };
  return { root, dataDir, children: [
    {
      name: 'resonance-network', command: env.RESONANCE_PYTHON || '/opt/resonance-venv/bin/python3',
      args: ['-m', 'uvicorn', 'phone_entry:app', '--host', '127.0.0.1', '--port', '17383'],
      cwd: join(root, 'backend'), port: '17383', healthPath: '/api/health',
      requiredFile: join(root, 'backend', 'phone_entry.py'),
      env: { ...base, RESONANCE_DB_PATH: join(dataDir, 'resonance.db'), RESONANCE_FRONTEND: join(root, 'frontend', 'dist') },
    },
    {
      name: 'resonance-opportunity', command: process.execPath, args: ['service.mjs'],
      cwd: join(root, 'external-opportunity'), port: '8812',
      requiredFile: join(root, 'external-opportunity', 'service.mjs'),
      env: { ...base, SYNTHIA_OPPORTUNITY_PORT: '8812', SYNTHIA_OPPORTUNITY_STATE_DIR: join(dataDir, 'opportunities') },
    },
  ] };
}

export function startResonanceSupervisor(options = {}) {
  const childSpec = resonanceChildSpecs(options.env ?? process.env);
  mkdirSync(childSpec.dataDir, { recursive: true, mode: 0o700 });
  return startSynthiaSupervisor({ ...options, childSpec });
}
