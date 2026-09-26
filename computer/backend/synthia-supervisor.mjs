import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Supervises the embedded Synthia Server inside the phone Linux rootfs.
 *
 * Two long-lived children, both bound to 127.0.0.1 only:
 *   synthia-node    node server/lite.js       (Computer GitHub bridge, MCP bus)
 *   synthia-python  python3 render-server.py  (Synthia Python API)
 *
 * Trident / Python MCP stay on-demand (stdio) and are not started here.
 * Failures never throw into the caller: the Computer backend on 17380 must
 * keep serving /health even if Synthia cannot start.
 */
const LOOPBACK = '127.0.0.1';

export function synthiaChildSpecs(env = process.env) {
  const root = env.SYNTHIA_ROOT || '/opt/synthia-server';
  const nodePort = String(env.SYNTHIA_NODE_PORT || '17381');
  const pyPort = String(env.SYNTHIA_PY_PORT || '17382');
  const dataDir = env.DATA_DIR || '/var/lib/synthai/synthia';
  const token = env.TERMINAL_TOKEN || env.SYNTHAI_LOCAL_TOKEN || '';
  const heapMb = String(env.SYNTHIA_NODE_HEAP_MB || '320');
  const pythonBridge = `http://${LOOPBACK}:${pyPort}`;
  const base = {
    HOME: env.HOME || '/root',
    PATH: env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    TMPDIR: env.TMPDIR || '/tmp',
    TZ: env.TZ || 'UTC',
    DATA_DIR: dataDir,
    SYNTHIA_EMBEDDED: '1',
    HOST: LOOPBACK
  };
  return {
    root,
    dataDir,
    children: [
      {
        name: 'synthia-node',
        command: env.SYNTHIA_NODE_BIN || process.execPath,
        args: [`--max-old-space-size=${heapMb}`, 'server/lite.js'],
        cwd: root,
        port: nodePort,
        requiredFile: join(root, 'server', 'lite.js'),
        env: {
          ...base,
          NODE_ENV: 'production',
          NODE_MODE: 'lite',
          PORT: nodePort,
          TERMINAL_TOKEN: token,
          PYTHON_BRIDGE_URL: pythonBridge,
          SYNTHIA_API_BASE: pythonBridge,
          CORS_ORIGIN: env.CORS_ORIGIN || 'https://appassets.androidplatform.net',
          TRIDENT_ONNX_ENABLED: 'false',
          ...(env.GITHUB_TOKEN ? { GITHUB_TOKEN: env.GITHUB_TOKEN } : {}),
          ...(env.GITHUB_USERNAME ? { GITHUB_USERNAME: env.GITHUB_USERNAME } : {})
        }
      },
      {
        name: 'synthia-python',
        command: env.SYNTHIA_PYTHON_BIN || 'python3',
        args: ['render-server.py'],
        cwd: root,
        port: pyPort,
        requiredFile: join(root, 'render-server.py'),
        env: {
          ...base,
          PORT: pyPort,
          PYTHONUNBUFFERED: '1',
          PYTHONDONTWRITEBYTECODE: '1'
        }
      }
    ]
  };
}

export function startSynthiaSupervisor({
  env = process.env,
  out = line => console.log(line),
  spawnImpl = spawn,
  fetchImpl = globalThis.fetch,
  minBackoffMs = 1000,
  maxBackoffMs = 60000,
  stableAfterMs = 60000,
  probeIntervalMs = 2000
} = {}) {
  const spec = synthiaChildSpecs(env);
  const states = new Map();
  let stopping = false;

  try { mkdirSync(spec.dataDir, { recursive: true, mode: 0o700 }); }
  catch (error) { out(`SYNTHIA_SUPERVISOR data dir ${spec.dataDir} unavailable: ${error.message}`); }

  const pipe = (name, stream) => {
    let buffered = '';
    stream?.setEncoding?.('utf8');
    stream?.on?.('data', chunk => {
      buffered += chunk;
      const lines = buffered.split(/\r?\n/);
      buffered = lines.pop() || '';
      for (const line of lines) if (line) out(`[${name}] ${line}`);
      if (buffered.length > 8192) { out(`[${name}] ${buffered}`); buffered = ''; }
    });
    stream?.on?.('end', () => { if (buffered) out(`[${name}] ${buffered}`); buffered = ''; });
  };

  const probe = async (child, state, generation) => {
    while (!stopping && state.generation === generation && state.state === 'starting') {
      try {
        const response = await fetchImpl(`http://${LOOPBACK}:${child.port}/health`, { signal: AbortSignal.timeout(1500) });
        if (response.ok) {
          state.state = 'ready';
          state.readyAt = new Date().toISOString();
          out(`SYNTHIA_CHILD_READY ${child.name} port=${child.port}`);
          return;
        }
      } catch { /* still starting */ }
      await new Promise(resolve => setTimeout(resolve, probeIntervalMs));
    }
  };

  const launch = child => {
    const state = states.get(child.name);
    if (stopping) return;
    if (!existsSync(child.requiredFile)) {
      state.state = 'missing';
      state.error = `${child.requiredFile} not found`;
      out(`SYNTHIA_CHILD_MISSING ${child.name} ${state.error}`);
      return;
    }
    state.generation += 1;
    const generation = state.generation;
    state.state = 'starting';
    state.startedAt = Date.now();
    state.error = null;
    let proc;
    try {
      proc = spawnImpl(child.command, child.args, { cwd: child.cwd, env: child.env, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      state.error = error.message;
      return scheduleRestart(child, state, `spawn failed: ${error.message}`);
    }
    state.proc = proc;
    state.pid = proc.pid ?? null;
    out(`SYNTHIA_CHILD_START ${child.name} pid=${state.pid} port=${child.port}`);
    pipe(child.name, proc.stdout);
    pipe(child.name, proc.stderr);
    let exited = false;
    const onExit = reason => {
      if (exited) return;
      exited = true;
      state.proc = null;
      state.pid = null;
      if (stopping) { state.state = 'stopped'; return; }
      if (Date.now() - state.startedAt >= stableAfterMs) state.failures = 0;
      scheduleRestart(child, state, reason);
    };
    proc.on('error', error => { state.error = error.message; onExit(`error: ${error.message}`); });
    proc.on('exit', (code, signal) => onExit(`exit code=${code} signal=${signal}`));
    probe(child, state, generation).catch(() => {});
  };

  const scheduleRestart = (child, state, reason) => {
    if (stopping) return;
    state.failures += 1;
    state.restarts += 1;
    const delay = Math.min(maxBackoffMs, minBackoffMs * 2 ** Math.min(state.failures - 1, 16));
    state.state = 'backoff';
    state.nextRestartInMs = delay;
    out(`SYNTHIA_CHILD_EXIT ${child.name} ${reason}; restart #${state.restarts} in ${delay}ms`);
    state.timer = setTimeout(() => launch(child), delay);
    state.timer.unref?.();
  };

  for (const child of spec.children) {
    states.set(child.name, { state: 'pending', pid: null, port: Number(child.port), restarts: 0, failures: 0, generation: 0, error: null, readyAt: null, proc: null, timer: null });
  }
  for (const child of spec.children) {
    try { launch(child); }
    catch (error) { out(`SYNTHIA_SUPERVISOR launch ${child.name} failed: ${error.message}`); }
  }

  return {
    status() {
      const children = {};
      for (const [name, s] of states) {
        children[name] = { state: s.state, pid: s.pid, port: s.port, host: LOOPBACK, restarts: s.restarts, readyAt: s.readyAt, error: s.error };
      }
      return { embedded: true, root: spec.root, children };
    },
    stop(signal = 'SIGTERM') {
      stopping = true;
      for (const s of states.values()) {
        if (s.timer) clearTimeout(s.timer);
        if (s.proc) { try { s.proc.kill(signal); } catch { /* already gone */ } }
      }
    }
  };
}
