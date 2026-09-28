import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SceneGraphCompiler } from './SceneGraphCompiler.js';

const compiler = new SceneGraphCompiler();
const intent = 'Create a five-second video where a gold sphere rises behind a mountain at sunset while the camera slowly pans right.';

function materialize(files, dir){for(const f of files){const p=path.join(dir,f.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,f.content);}}

test('builds a renderer-independent scene graph with relations, camera, and timeline',()=>{
  const scene=compiler.parse(intent);
  assert.equal(scene.medium,'video');
  assert.equal(scene.timeline.durationSeconds,5);
  assert.equal(scene.timeline.fps,30);
  assert.equal(scene.entities.find(e=>e.geometry==='sphere').material.color,'#d4af37');
  assert.ok(scene.entities.some(e=>e.geometry==='mountain'));
  assert.deepEqual(scene.relations.find(r=>r.type==='behind'),{type:'behind',subject:'sphere-1',object:'mountain-1'});
  assert.equal(scene.camera.motion.to,0.1);
  assert.equal(scene.timeline.tracks.find(t=>t.target==='sphere-1').to,0.34);
  assert.equal(scene.environment.kind,'sunset');
});

test('routes supported scene features to deterministic local raster with media-renderer fallback',()=>{
  const scene=compiler.parse(intent);
  const files=compiler.compile(scene);
  const route=JSON.parse(files.find(f=>f.path==='synthia/renderer-route.json').content);
  const composition=JSON.parse(files.find(f=>f.path==='media-composition.json').content);
  assert.equal(route.selected,'procedural-raster');
  assert.ok(route.fallbacks.includes('media-renderer'));
  assert.equal(composition.provenance.compiler,'SceneGraphCompiler');
  assert.equal(composition.scene.relations[0].type,'behind');
  assert.ok(files.some(f=>f.path==='render-scene-video.mjs'));
});

test('compiled scene executes as a real WebM when local encoder is available',()=>{
  if(spawnSync('ffmpeg',['-version'],{encoding:'utf8'}).status!==0) return;
  const scene=compiler.parse(intent),files=compiler.compile(scene);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-scene-compiler-'));materialize(files,dir);
  const out=path.join(dir,'scene.webm');
  const run=spawnSync(process.execPath,[path.join(dir,'render-scene-video.mjs'),out],{cwd:dir,encoding:'utf8',timeout:120000});
  assert.equal(run.status,0,run.stderr);
  const b=fs.readFileSync(out);assert.deepEqual([...b.subarray(0,4)],[26,69,223,163]);assert.ok(b.length>1000);
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',out],{encoding:'utf8'});
  if(probe.status===0) assert.ok(Math.abs(Number(probe.stdout.trim())-5)<0.6);
});
