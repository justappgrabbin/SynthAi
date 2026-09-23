import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const TARGETS = Object.freeze({
  'native-c': ({ source, output }) => ['clang','-O2','-fPIC','-shared',source,'-o',output],
  'wasm-c': ({ source, output }) => ['clang','--target=wasm32-wasi','-O2',source,'-o',output],
  'js-bundle': ({ source, output }) => ['esbuild',source,'--bundle','--platform=node',`--outfile=${output}`],
});

function safeName(value) {
  return String(value ?? 'module').replace(/[^A-Za-z0-9._-]/g, '_');
}

export class TermuxProcessRunner {
  async exec({ argv, cwd = undefined, env = undefined } = {}) {
    if (!Array.isArray(argv) || !argv.length) throw new TypeError('argv required');
    return new Promise((resolve, reject) => {
      const child = spawn(argv[0], argv.slice(1), { cwd, env: env ? { ...process.env, ...env } : process.env, shell: false, stdio: ['ignore','pipe','pipe'] });
      let stdout='', stderr='';
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', code => resolve({ code, stdout, stderr }));
    });
  }
}

export class TermuxCompilerAdapter {
  constructor({
    runner = new TermuxProcessRunner(),
    workspace = process.env.SYNTHAI_COMPILE_WORKSPACE ?? '/data/data/org.synthai.computer/files/compile',
    toolchainPrefix = process.env.PREFIX ?? '/data/data/com.termux/files/usr',
  } = {}) {
    Object.assign(this, { runner, workspace, toolchainPrefix });
    this.id = 'termux-dormant-toolchain';
  }

  async compile(spec = {}) {
    const target = String(spec.target ?? '');
    const builder = TARGETS[target];
    if (!builder) throw new Error(`unsupported Termux compile target: ${target}`);
    if (!spec.id || !spec.sourceHash || !spec.sourcePath) throw new Error('compile spec requires id, sourceHash and sourcePath');

    const moduleDir = path.join(this.workspace, safeName(spec.id), safeName(spec.sourceHash));
    await mkdir(moduleDir, { recursive: true });
    const ext = target === 'native-c' ? '.so' : target === 'wasm-c' ? '.wasm' : '.mjs';
    const output = path.join(moduleDir, safeName(spec.outputName ?? spec.id) + ext);
    const argv = builder({ source: path.resolve(spec.sourcePath), output });

    const env = {
      PREFIX: this.toolchainPrefix,
      PATH: `${this.toolchainPrefix}/bin:${process.env.PATH ?? ''}`,
      ...(spec.env ?? {}),
    };
    const result = await this.runner.exec({ argv, cwd: spec.cwd ? path.resolve(spec.cwd) : moduleDir, env });
    if (result.code !== 0) {
      const error = new Error(`Termux compiler failed for ${spec.id}: ${result.stderr || result.stdout || 'unknown compiler error'}`);
      error.code = 'COMPILE_FAILED';
      error.result = result;
      throw error;
    }
    const bytes = await readFile(output);
    const artifactHash = createHash('sha256').update(bytes).digest('hex');
    return {
      artifactHash,
      artifactRef: output,
      target,
      metadata: { compiler: argv[0], argv, stdout: result.stdout, byteLength: bytes.byteLength },
    };
  }
}

export { TARGETS as TERMUX_COMPILE_TARGETS };
export default TermuxCompilerAdapter;
