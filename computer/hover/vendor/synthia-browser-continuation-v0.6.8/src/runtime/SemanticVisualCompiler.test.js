import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SemanticArtifactCompiler } from './SemanticArtifactCompiler.js';

const compiler = new SemanticArtifactCompiler();
function semanticOutputs(intent){return [
  { nodeId:'a', toolIds:['autoling'], channelIds:[], capabilities:['semantic.intent.analysis'], output:{pipeline:{grammar:[{rhs:intent.split(' ')}]}} },
  { nodeId:'d', toolIds:['diseminer'], channelIds:[], capabilities:['semantic.intent.analysis'], output:{claims:[{text:intent}]} },
  { nodeId:'c', toolIds:['computational-grammar-coder'], channelIds:[], capabilities:['semantic.intent.analysis'], output:{sentence:intent} }
];}
function materialize(files, dir){for(const f of files){const p=path.join(dir,f.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,f.content);}}

test('semantic visual compiler emits and executes the requested PNG',()=>{
  const intent='Create a 512×512 image containing a glowing gold circle above three dark triangles.';
  const files=compiler.compile({graphId:'image'},'CLI',semanticOutputs(intent));
  const semantic=JSON.parse(files.find(f=>f.path==='synthia/semantic-spec.json').content);
  const visual=JSON.parse(files.find(f=>f.path==='synthia/visual-spec.json').content);
  assert.ok(semantic.actions.includes('render-image'));
  assert.equal(visual.width,512); assert.equal(visual.height,512);
  assert.equal(visual.objects.find(o=>o.shape==='triangle').count,3);
  assert.equal(visual.objects.find(o=>o.shape==='circle').glow,true);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-image-compiler-'));materialize(files,dir);
  const out=path.join(dir,'proof.png');
  const run=spawnSync(process.execPath,[path.join(dir,'render-image.mjs'),out],{cwd:dir,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const b=fs.readFileSync(out); assert.deepEqual([...b.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(b.readUInt32BE(16),512); assert.equal(b.readUInt32BE(20),512); assert.ok(b.length>500);
});

test('semantic visual compiler emits and executes a five-second moving-circle WebM',()=>{
  const intent='Create a five-second video of a red circle moving smoothly from the left edge to the right edge.';
  const files=compiler.compile({graphId:'video'},'CLI',semanticOutputs(intent));
  const semantic=JSON.parse(files.find(f=>f.path==='synthia/semantic-spec.json').content);
  const visual=JSON.parse(files.find(f=>f.path==='synthia/visual-spec.json').content);
  assert.ok(semantic.actions.includes('render-video'));
  assert.equal(visual.timeline.durationSeconds,5); assert.equal(visual.timeline.fps,30);
  assert.deepEqual(visual.timeline.motion[0],{objectId:'circle-1',property:'x',from:'left',to:'right',easing:'smoothstep'});
  const hasFfmpeg=spawnSync('ffmpeg',['-version'],{encoding:'utf8'}).status===0;
  if(!hasFfmpeg) return;
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-video-compiler-'));materialize(files,dir);
  const out=path.join(dir,'proof.webm');
  const run=spawnSync(process.execPath,[path.join(dir,'render-video.mjs'),out],{cwd:dir,encoding:'utf8',timeout:120000});
  assert.equal(run.status,0,run.stderr);
  const b=fs.readFileSync(out); assert.deepEqual([...b.subarray(0,4)],[26,69,223,163]); assert.ok(b.length>1000);
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',out],{encoding:'utf8'});
  if(probe.status===0) assert.ok(Math.abs(Number(probe.stdout.trim())-5)<0.6);
});
