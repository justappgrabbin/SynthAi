import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputerRuntime } from '../ComputerRuntime.mjs';
import { ProjectIngester } from '../services/project-ingester.mjs';

test('project ingester analyzes imported app and mounts it into the workspace', async () => {
  const runtime = await new ComputerRuntime().boot();
  const pkg = JSON.stringify({
    name: 'demo-app',
    scripts: { dev: 'vite', build: 'vite build' },
    dependencies: { react: '^19.0.0' },
    devDependencies: { vite: '^7.0.0', '@vitejs/plugin-react': '^5.0.0' },
  });

  await runtime.vfs.write('/home/user/Imports/demo/package.json', pkg, { encoding: 'utf8', size: Buffer.byteLength(pkg) });
  await runtime.vfs.write('/home/user/Imports/demo/src/main.tsx', 'export default function App(){ return null }', { encoding: 'utf8', size: 44 });
  await runtime.vfs.write('/home/user/Imports/demo/index.html', '<div id="root"></div>', { encoding: 'utf8', size: 21 });

  const ingester = new ProjectIngester(runtime);
  const analysis = ingester.analyze('/home/user/Imports/demo.zip');
  assert.equal(analysis.name, 'demo-app');
  assert.equal(analysis.framework, 'React + Vite');
  assert.equal(analysis.runtime, 'node');
  assert.equal(analysis.entrypoint, 'src/main.tsx');
  assert.equal(analysis.fileCount, 3);

  const mounted = await ingester.mount('/home/user/Imports/demo.zip');
  assert.equal(mounted.shell, 'workspace');
  assert.ok(mounted.artifactId);
  assert.ok(mounted.mountId);
  assert.ok(runtime.shellManager.listMounted().some(item => item.appId === mounted.appId));
  assert.equal(runtime.state.get(`ingest.projects.${mounted.appId}`).analysis.projectDigest, analysis.projectDigest);
});
