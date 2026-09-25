import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createSynthiaRuntime } from './UPGRADES/bootstrap/createSynthiaRuntime.js';

async function build(intentId,description){
  const {runtime}=createSynthiaRuntime();
  const session=await runtime.ingest({intentId,description,side:'FOUR_SIDE',seed:777n});
  const artifact=await runtime.materialize(session.sessionId,'CLI');
  if(!artifact.success) throw new Error('materialize failed: '+artifact.errors.join(', '));
  return artifact;
}
function writeArtifact(artifact){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-visual-runtime-'));for(const f of artifact.files){const p=path.join(dir,f.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,f.content);}return dir;}

async function main(){
  console.log('--- visual orchestrator smoke ---');
  const image=await build('visual-image','Create a 512×512 image containing a glowing gold circle above three dark triangles.');
  const imageSpec=JSON.parse(image.files.find(f=>f.path==='synthia/visual-spec.json')?.content||'null');
  if(!imageSpec || imageSpec.width!==512 || imageSpec.height!==512 || imageSpec.objects.find(o=>o.shape==='triangle')?.count!==3) throw new Error('image semantic spec regression');
  const imageDir=writeArtifact(image), png=path.join(imageDir,'proof.png');
  let r=spawnSync(process.execPath,[path.join(imageDir,'render-image.mjs'),png],{cwd:imageDir,encoding:'utf8'});
  if(r.status!==0) throw new Error(r.stderr||'image renderer failed');
  const pngBytes=fs.readFileSync(png); if(pngBytes.readUInt32BE(16)!==512||pngBytes.readUInt32BE(20)!==512) throw new Error('PNG dimension regression');
  console.log('  image: PNG',pngBytes.length,'bytes, 512x512');

  const video=await build('visual-video','Create a five-second video of a red circle moving smoothly from the left edge to the right edge.');
  const videoSpec=JSON.parse(video.files.find(f=>f.path==='synthia/visual-spec.json')?.content||'null');
  if(!videoSpec || videoSpec.timeline?.durationSeconds!==5 || videoSpec.timeline?.motion?.[0]?.from!=='left' || videoSpec.timeline?.motion?.[0]?.to!=='right') throw new Error('video semantic spec regression');
  const videoDir=writeArtifact(video), webm=path.join(videoDir,'proof.webm');
  if(spawnSync('ffmpeg',['-version'],{encoding:'utf8'}).status===0){
    r=spawnSync(process.execPath,[path.join(videoDir,'render-video.mjs'),webm],{cwd:videoDir,encoding:'utf8',timeout:120000});
    if(r.status!==0) throw new Error(r.stderr||'video renderer failed');
    const webmBytes=fs.readFileSync(webm); if(!webmBytes.subarray(0,4).equals(Buffer.from([26,69,223,163]))) throw new Error('WebM header regression');
    const p=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',webm],{encoding:'utf8'});
    const duration=p.status===0?Number(p.stdout.trim()):NaN;
    if(Number.isFinite(duration)&&Math.abs(duration-5)>.6) throw new Error('WebM duration regression: '+duration);
    console.log('  video: WebM',webmBytes.length,'bytes, duration',Number.isFinite(duration)?duration:'unprobed');
  } else {
    if(!video.files.find(f=>f.path==='video.html')) throw new Error('no browser video fallback');
    console.log('  video: ffmpeg absent; browser MediaRecorder fallback present');
  }
  console.log('--- visual orchestrator smoke complete ---');
}
main().catch(err=>{console.error('VISUAL ORCHESTRATOR SMOKE FAILED:',err);process.exit(1);});
