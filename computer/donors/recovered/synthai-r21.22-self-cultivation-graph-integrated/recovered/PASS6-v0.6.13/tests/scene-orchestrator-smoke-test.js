import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createSynthiaRuntime } from './UPGRADES/bootstrap/createSynthiaRuntime.js';

async function main(){
  console.log('--- scene orchestrator smoke ---');
  const description='Create a five-second video where a gold sphere rises behind a mountain at sunset while the camera slowly pans right.';
  const {runtime}=createSynthiaRuntime();
  const session=await runtime.ingest({intentId:'scene-graph-acceptance',description,side:'FOUR_SIDE',seed:808n});
  const artifact=await runtime.materialize(session.sessionId,'CLI');
  if(!artifact.success) throw new Error('materialize failed: '+artifact.errors.join(', '));
  const scene=JSON.parse(artifact.files.find(f=>f.path==='synthia/scene-graph.json')?.content||'null');
  const route=JSON.parse(artifact.files.find(f=>f.path==='synthia/renderer-route.json')?.content||'null');
  if(!scene) throw new Error('scene graph missing');
  if(scene.entities.find(e=>e.geometry==='sphere')?.material.color!=='#d4af37') throw new Error('gold sphere missing');
  if(!scene.entities.some(e=>e.geometry==='mountain')) throw new Error('mountain missing');
  if(!scene.relations.some(r=>r.type==='behind'&&r.subject==='sphere-1'&&r.object==='mountain-1')) throw new Error('behind relation missing');
  if(scene.environment.kind!=='sunset') throw new Error('sunset environment missing');
  if(scene.camera.motion?.to!==0.1) throw new Error('camera pan missing');
  if(route.selected!=='procedural-raster') throw new Error('renderer routing regression');
  console.log('  graph:',scene.entities.length,'entities,',scene.relations.length,'relation,',scene.timeline.tracks.length,'timeline tracks');
  console.log('  route:',route.selected,'fallbacks:',route.fallbacks.join(', '));
  if(spawnSync('ffmpeg',['-version'],{encoding:'utf8'}).status===0){
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-scene-runtime-'));
    for(const f of artifact.files){const p=path.join(dir,f.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,f.content);}
    const out=path.join(dir,'scene.webm');
    const run=spawnSync(process.execPath,[path.join(dir,'render-scene-video.mjs'),out],{cwd:dir,encoding:'utf8',timeout:120000});
    if(run.status!==0) throw new Error(run.stderr||'scene renderer failed');
    const bytes=fs.readFileSync(out);if(!bytes.subarray(0,4).equals(Buffer.from([26,69,223,163]))) throw new Error('WebM header regression');
    console.log('  render: WebM',bytes.length,'bytes');
  } else if(!artifact.files.some(f=>f.path==='scene.html')) throw new Error('browser fallback missing');
  console.log('--- scene orchestrator smoke complete ---');
}
main().catch(err=>{console.error('SCENE ORCHESTRATOR SMOKE FAILED:',err);process.exit(1);});
