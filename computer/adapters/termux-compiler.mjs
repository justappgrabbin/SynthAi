const enc = new TextEncoder();

function safeName(value) {
  return String(value ?? 'module').replace(/[^A-Za-z0-9._-]/g, '_');
}

function fill(value, vars) {
  return String(value)
    .replaceAll('{workspace}', vars.workspace)
    .replaceAll('{input}', vars.input)
    .replaceAll('{output}', vars.output)
    .replaceAll('{id}', vars.id);
}

async function defaultHash(bytes) {
  const data = typeof bytes === 'string' ? enc.encode(bytes) : bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return [...digest].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compiler adapter for a Termux-style native host.
 *
 * The adapter does not pretend Termux is installed. A native host must bind
 * an executor and private filesystem. Tool Factory/ATO provide compile steps,
 * so language/toolchain policy stays outside this transport.
 */
export class TermuxCompilerAdapter {
  constructor({
    executor,
    files,
    workspace = '/data/data/org.synthai.computer/files/compiler',
    hash = defaultHash,
    id = 'termux-compiler-host',
  } = {}) {
    if (typeof executor?.run !== 'function') throw new TypeError('TermuxCompilerAdapter requires executor.run({argv,cwd,env})');
    if (typeof files?.write !== 'function' || typeof files?.read !== 'function') {
      throw new TypeError('TermuxCompilerAdapter requires private files.read/write');
    }
    Object.assign(this, { executor, files, workspace, hash, id });
  }

  async compile(spec = {}) {
    if (!spec.id || !spec.sourceHash) throw new Error('compile spec requires id and sourceHash');
    if (!Array.isArray(spec.steps) || !spec.steps.length) throw new Error('compile spec requires at least one explicit toolchain step');

    const id = safeName(spec.id);
    const extension = String(spec.sourceExtension ?? 'src').replace(/[^A-Za-z0-9]/g, '') || 'src';
    const outputExtension = String(spec.outputExtension ?? spec.target ?? 'bin').replace(/[^A-Za-z0-9]/g, '') || 'bin';
    const vars = {
      id,
      workspace: this.workspace,
      input: spec.sourcePath ?? `${this.workspace}/${id}-${spec.sourceHash.slice(0,12)}.${extension}`,
      output: spec.outputPath ?? `${this.workspace}/${id}-${spec.sourceHash.slice(0,12)}.${outputExtension}`,
    };

    if (spec.sourceText !== undefined) await this.files.write(vars.input, String(spec.sourceText), { private: true });

    const receipts = [];
    for (const [index, step] of spec.steps.entries()) {
      const argv = (step.argv ?? []).map(arg => fill(arg, vars));
      if (!argv.length) throw new Error(`compile step ${index + 1} has no argv`);
      const receipt = await this.executor.run({
        argv,
        cwd: fill(step.cwd ?? this.workspace, vars),
        env: Object.fromEntries(Object.entries(step.env ?? {}).map(([key,value]) => [key, fill(value, vars)])),
        timeoutMs: step.timeoutMs ?? spec.timeoutMs ?? 120000,
      });
      receipts.push(receipt);
      if (receipt?.ok === false || Number(receipt?.exitCode ?? 0) !== 0) {
        const error = new Error(`compiler step failed: ${argv.join(' ')}`);
        error.receipt = receipt;
        throw error;
      }
    }

    const artifact = await this.files.read(vars.output);
    const artifactHash = await this.hash(artifact);
    if (typeof this.files.setReadOnly === 'function') await this.files.setReadOnly(vars.output, true);

    return {
      artifactHash,
      artifactRef: vars.output,
      target: spec.target ?? 'native-host',
      metadata: {
        sourceHash: spec.sourceHash,
        compilerHost: this.id,
        steps: receipts.map((receipt, index) => ({
          index,
          exitCode: receipt?.exitCode ?? 0,
          stdoutHash: receipt?.stdoutHash ?? null,
          stderrHash: receipt?.stderrHash ?? null,
        })),
      },
    };
  }
}

export default TermuxCompilerAdapter;
