import { createHash } from 'node:crypto';
import { extname, posix } from 'node:path';

const textOf = (record) => record?.meta?.encoding === 'base64' ? null : String(record?.content ?? '');
const clean = (value) => String(value || '').replaceAll('\\', '/').replace(/\/+/g, '/');

const parseJson = (text) => {
  try { return JSON.parse(text); } catch { return null; }
};

function pickRoot(path) {
  const normalized = clean(path);
  if (normalized.toLowerCase().endsWith('.zip')) return normalized.slice(0, -4) + '/';
  const last = normalized.lastIndexOf('/');
  return last >= 0 ? normalized.slice(0, last + 1) : '/';
}

function detectFramework(pkg, files) {
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const names = new Set(Object.keys(deps));
  if (names.has('next')) return 'Next.js';
  if (names.has('@vitejs/plugin-react') || names.has('vite')) return names.has('react') ? 'React + Vite' : 'Vite';
  if (names.has('react')) return 'React';
  if (names.has('vue')) return 'Vue';
  if (names.has('svelte')) return 'Svelte';
  if (names.has('@capacitor/core')) return 'Capacitor';
  if (names.has('expo')) return 'Expo';
  if (files.some(f => /(^|\/)index\.html$/i.test(f.relativePath))) return 'Static Web';
  if (files.some(f => /(^|\/)(pyproject\.toml|requirements\.txt)$/i.test(f.relativePath))) return 'Python';
  if (files.some(f => /\.py$/i.test(f.relativePath))) return 'Python';
  return 'Unknown';
}

function detectRuntime(pkg, files) {
  if (files.some(f => /(^|\/)(pyproject\.toml|requirements\.txt|Pipfile)$/i.test(f.relativePath)) || files.some(f => /\.py$/i.test(f.relativePath))) return 'python';
  if (pkg) return 'node';
  if (files.some(f => /(^|\/)index\.html$/i.test(f.relativePath))) return 'browser';
  return 'unknown';
}

function scoreEntry(relativePath, runtime) {
  const path = relativePath.toLowerCase();
  let score = 0;
  if (runtime === 'browser') {
    if (path === 'index.html') score += 100;
    if (/public\/index\.html$/.test(path)) score += 80;
  }
  if (runtime === 'node') {
    if (/^(src\/)?main\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path)) score += 100;
    if (/^(src\/)?index\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path)) score += 90;
    if (/server\.(js|mjs|cjs|ts)$/.test(path)) score += 70;
  }
  if (runtime === 'python') {
    if (/^(src\/)?main\.py$/.test(path)) score += 100;
    if (/^(src\/)?app\.py$/.test(path)) score += 90;
    if (/__main__\.py$/.test(path)) score += 80;
  }
  if (/readme/i.test(path)) score -= 20;
  return score;
}

export class ProjectIngester {
  constructor(computer) {
    this.computer = computer;
  }

  analyze(path) {
    const root = pickRoot(path);
    const records = this.computer.vfs.list(root);
    if (!records.length) throw new Error(`No imported project files found under ${root}`);

    const files = records.map((record) => ({
      path: record.path,
      relativePath: record.path.startsWith(root) ? record.path.slice(root.length) : record.path,
      size: record.meta?.size ?? Buffer.byteLength(String(record.content ?? '')),
      digest: record.meta?.digest ?? null,
      encoding: record.meta?.encoding ?? 'utf8',
      extension: extname(record.path).toLowerCase(),
    })).filter(file => file.relativePath);

    const packageRecord = records.find(record => record.path.toLowerCase() === (root + 'package.json').toLowerCase())
      ?? records.find(record => /\/package\.json$/i.test(record.path));
    const packageText = packageRecord ? textOf(packageRecord) : null;
    const pkg = packageText ? parseJson(packageText) : null;

    const runtime = detectRuntime(pkg, files);
    const framework = detectFramework(pkg, files);
    const candidates = files
      .map(file => ({ path: file.relativePath, score: scoreEntry(file.relativePath, runtime) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    let entrypoint = null;
    const pkgEntry = pkg?.main || pkg?.module || pkg?.browser;
    if (typeof pkgEntry === 'string' && files.some(file => file.relativePath === clean(pkgEntry))) entrypoint = clean(pkgEntry);
    if (!entrypoint) entrypoint = candidates[0]?.path ?? null;

    const extensionCounts = {};
    for (const file of files) {
      const key = file.extension || '[none]';
      extensionCounts[key] = (extensionCounts[key] || 0) + 1;
    }

    const packageManager = files.some(f => f.relativePath === 'pnpm-lock.yaml') ? 'pnpm'
      : files.some(f => f.relativePath === 'yarn.lock') ? 'yarn'
      : files.some(f => f.relativePath === 'package-lock.json') ? 'npm'
      : files.some(f => f.relativePath === 'bun.lockb') ? 'bun'
      : runtime === 'python' ? 'python'
      : null;

    const digest = createHash('sha256')
      .update(root)
      .update(files.map(f => `${f.relativePath}:${f.digest || f.size}`).sort().join('\n'))
      .digest('hex');

    const name = String(pkg?.name || posix.basename(root.replace(/\/$/, '')) || 'imported-app');
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'imported-app';

    return {
      schema: 'synthia.project-analysis.v1',
      name,
      slug,
      root,
      sourcePath: clean(path),
      framework,
      runtime,
      packageManager,
      entrypoint,
      fileCount: files.length,
      totalBytes: files.reduce((n, f) => n + (f.size || 0), 0),
      extensionCounts,
      scripts: pkg?.scripts || {},
      dependencies: Object.keys(pkg?.dependencies || {}),
      devDependencies: Object.keys(pkg?.devDependencies || {}),
      files,
      projectDigest: digest,
      analyzedAt: Date.now(),
    };
  }

  async mount(path, { name = null, shell = 'workspace' } = {}) {
    const analysis = this.analyze(path);
    const appName = String(name || analysis.name);
    const appId = `imported-${analysis.slug}-${analysis.projectDigest.slice(0, 8)}`;

    const artifact = await this.computer.intake.ingest({
      name: `${analysis.slug}.synthia-app.json`,
      text: JSON.stringify({ ...analysis, appId, appName }, null, 2),
      type: 'application/vnd.synthia.project+json',
      source: 'project-ingester',
      tags: ['imported-app', analysis.runtime, analysis.framework].filter(Boolean),
    });

    const contract = await this.computer.mountApplication(appId, { artifactId: artifact.id, shell });
    const record = {
      appId,
      appName,
      artifactId: artifact.id,
      mountId: contract.mountId,
      shell,
      analysis,
      mountedAt: Date.now(),
    };
    await this.computer.state.set(`ingest.projects.${appId}`, record, { source: 'project-ingester' });
    this.computer.bus.emit('project:ingested-mounted', record);
    return record;
  }

  listMounted() {
    return Object.values(this.computer.state.get('ingest.projects', {})).filter(Boolean);
  }
}
