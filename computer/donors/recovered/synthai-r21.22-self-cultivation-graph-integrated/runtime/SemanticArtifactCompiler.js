class SemanticArtifactCompiler {
  compile(graph, target, outputs) {
    const spec = this.buildSpec(outputs);
    if (!spec) return [];
    const files = [{
      path: 'synthia/semantic-spec.json',
      type: 'json',
      content: JSON.stringify(spec, null, 2)
    }];
    if (spec.artifactKind === 'image') {
      files.push(...this.imageArtifact(spec));
      return files;
    }
    if (spec.artifactKind === 'video') {
      files.push(...this.videoArtifact(spec));
      return files;
    }
    if (!spec.actions.includes('greet') || !spec.inputs.includes('name')) return files;
    if (target === 'CLI') files.push(...this.greetingCli(spec));
    if (target === 'WEB_APP' || target === 'ANDROID_APP') files.push(...this.greetingWeb(spec));
    return files;
  }

  buildSpec(outputs) {
    const candidates = [];
    const semanticTools = new Set();
    for (const entry of outputs) {
      const output = entry.output;
      for (const id of entry.toolIds || []) {
        if (['autoling', 'diseminer', 'computational-grammar-coder'].includes(id)) semanticTools.add(id);
      }
      if (entry.toolIds?.includes('diseminer') && Array.isArray(output?.claims)) {
        for (const claim of output.claims) if (typeof claim?.text === 'string') candidates.push({ text: claim.text, priority: 5 });
      }
      if (entry.toolIds?.includes('computational-grammar-coder') && typeof output?.sentence === 'string') {
        candidates.push({ text: output.sentence, priority: 4 });
      }
      if (entry.toolIds?.includes('autoling') && Array.isArray(output?.pipeline?.grammar?.[0]?.rhs)) {
        candidates.push({ text: output.pipeline.grammar[0].rhs.join(' '), priority: 3 });
      }
      if (typeof output?.signal?.intent === 'string') candidates.push({ text: output.signal.intent, priority: 1 });
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.priority - a.priority || b.text.length - a.text.length);
    const intent = candidates[0].text.trim();
    const lower = intent.toLowerCase();

    const artifactKind = this.detectArtifactKind(lower);
    const actions = [];
    if (/\b(greet|greets|greeting|hello|welcome)\b/.test(lower)) actions.push('greet');
    if (/\b(remember|remembers|store|stores|save|saves|persist|persists|retain|retains)\b/.test(lower)) actions.push('remember');
    if (/\b(create|draw|render|generate|make|produce)\b/.test(lower) && artifactKind === 'image') actions.push('render-image');
    if (/\b(create|draw|render|generate|make|produce|animate)\b/.test(lower) && artifactKind === 'video') actions.push('render-video');

    const inputs = [];
    if (/\bname\b/.test(lower)) inputs.push('name');

    const base = {
      schemaVersion: 1,
      intent,
      artifactKind,
      actions,
      inputs,
      persistence: {
        required: actions.includes('remember'),
        scope: actions.includes('remember') ? 'local' : 'none'
      },
      evidence: {
        semanticTools: [...semanticTools].sort(),
        candidateCount: candidates.length
      },
      confidence: Math.min(1, 0.4 + semanticTools.size * 0.1 + (actions.length ? 0.1 : 0) + (inputs.length ? 0.1 : 0))
    };

    if (artifactKind === 'image') return { ...base, image: this.parseImageSpec(intent) };
    if (artifactKind === 'video') return { ...base, video: this.parseVideoSpec(intent) };
    return base;
  }

  detectArtifactKind(lower) {
    if (/\b(video|clip|animation|animated|webm|mp4|movie|footage)\b/.test(lower)) return 'video';
    if (/\b(image|photo|picture|png|svg|poster|graphic|illustration)\b/.test(lower)) return 'image';
    if (/\b(cli|command[- ]line)\b/.test(lower)) return 'cli';
    if (/\b(web ?app|website)\b/.test(lower)) return 'web-app';
    if (/\b(app|application)\b/.test(lower)) return 'app';
    if (/\btool\b/.test(lower)) return 'tool';
    return 'artifact';
  }

  parseImageSpec(intent) {
    const lower = intent.toLowerCase();
    const { width, height } = this.extractCanvasSize(lower, 512, 512);
    const bg = /transparent/.test(lower) ? '#00000000' : '#ffffff';
    const circleColor = this.extractColorPhrase(lower, 'circle') || '#d4af37';
    const triangleColor = this.extractColorPhrase(lower, 'triangle') || (/(dark)/.test(lower) ? '#222222' : '#333333');
    const circleCount = this.extractCount(lower, 'circle', 1);
    const triangleCount = this.extractCount(lower, 'triangle', /three\s+.*triangle/.test(lower) ? 3 : 1);
    const shapes = [];

    if (circleCount > 0 && triangleCount >= 3 && /above/.test(lower)) {
      const radius = Math.round(Math.min(width, height) * 0.12);
      shapes.push({ type: 'circle', color: circleColor, cx: Math.round(width / 2), cy: Math.round(height * 0.32), r: radius, glow: /glowing|glow/.test(lower) });
      const baseY = Math.round(height * 0.72);
      const triW = Math.round(width * 0.16);
      const triH = Math.round(height * 0.22);
      const xs = [0.3, 0.5, 0.7].map(v => Math.round(width * v));
      for (const cx of xs) {
        shapes.push({
          type: 'triangle',
          color: triangleColor,
          points: [
            [cx, baseY - triH],
            [cx - Math.round(triW / 2), baseY],
            [cx + Math.round(triW / 2), baseY]
          ]
        });
      }
    } else {
      if (circleCount > 0) {
        shapes.push({ type: 'circle', color: circleColor, cx: Math.round(width / 2), cy: Math.round(height / 2), r: Math.round(Math.min(width, height) * 0.18), glow: /glowing|glow/.test(lower) });
      }
      for (let i = 0; i < triangleCount; i++) {
        const cx = Math.round((i + 1) * width / (triangleCount + 1));
        const baseY = Math.round(height * 0.8);
        const triW = Math.round(width * 0.15);
        const triH = Math.round(height * 0.22);
        shapes.push({
          type: 'triangle',
          color: triangleColor,
          points: [
            [cx, baseY - triH],
            [cx - Math.round(triW / 2), baseY],
            [cx + Math.round(triW / 2), baseY]
          ]
        });
      }
    }

    return {
      width,
      height,
      background: bg,
      shapes
    };
  }

  parseVideoSpec(intent) {
    const lower = intent.toLowerCase();
    const { width, height } = this.extractCanvasSize(lower, 512, 512);
    const durationSeconds = this.extractFirstNumber(lower, /(\d+)\s*[- ]?second/, 5);
    const fps = this.extractFirstNumber(lower, /(\d+)\s*fps/, 30);
    const objectColor = this.extractColorPhrase(lower, 'circle') || '#ff0000';
    const objectType = /circle/.test(lower) ? 'circle' : 'circle';
    const radius = Math.round(Math.min(width, height) * 0.08);
    const motion = /left edge.*right edge/.test(lower) ? 'left-to-right' : 'static';
    return {
      width,
      height,
      background: '#ffffff',
      durationSeconds,
      fps,
      object: { type: objectType, color: objectColor, radius },
      motion,
      path: motion === 'left-to-right'
        ? { from: { x: radius, y: Math.round(height / 2) }, to: { x: width - radius, y: Math.round(height / 2) } }
        : { from: { x: Math.round(width / 2), y: Math.round(height / 2) }, to: { x: Math.round(width / 2), y: Math.round(height / 2) } }
    };
  }

  extractCanvasSize(lower, fallbackWidth, fallbackHeight) {
    const match = lower.match(/(\d{2,4})\s*[x×]\s*(\d{2,4})/);
    if (!match) return { width: fallbackWidth, height: fallbackHeight };
    return { width: Number(match[1]), height: Number(match[2]) };
  }

  extractFirstNumber(lower, regex, fallback) {
    const match = lower.match(regex);
    return match ? Number(match[1]) : fallback;
  }

  extractCount(lower, noun, fallback) {
    const numberWordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
    const exact = lower.match(new RegExp(`\\b(\\d+)\\s+[^.]*?${noun}s?\\b`));
    if (exact) return Number(exact[1]);
    const word = lower.match(new RegExp(`\\b(one|two|three|four|five|six)\\s+[^.]*?${noun}s?\\b`));
    if (word) return numberWordMap[word[1]];
    return fallback;
  }

  extractColorPhrase(lower, noun) {
    const match = lower.match(new RegExp(`\\b([a-z]+)\\s+${noun}s?\\b`));
    if (!match) return null;
    return this.colorHex(match[1]);
  }

  colorHex(name) {
    const colors = {
      gold: '#d4af37',
      golden: '#d4af37',
      dark: '#222222',
      black: '#000000',
      white: '#ffffff',
      red: '#ff0000',
      blue: '#2563eb',
      green: '#16a34a',
      yellow: '#eab308',
      orange: '#f97316',
      purple: '#9333ea',
      gray: '#6b7280',
      grey: '#6b7280'
    };
    return colors[name] || '#333333';
  }

  imageArtifact(spec) {
    const renderSource = `#!/usr/bin/env node
import fs from 'node:fs';
import zlib from 'node:zlib';

const spec = ${JSON.stringify(spec.image, null, 2)};
const outPath = process.argv[2] || 'image.png';
const scenePath = process.argv[3] || 'image-scene.json';

function hexToRgba(hex){
  if(typeof hex!=='string') return [0,0,0,255];
  if(hex.length===9){
    return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),parseInt(hex.slice(7,9),16)];
  }
  return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255];
}
function makeBuffer(width,height,bg){
  const rgba = new Uint8Array(width*height*4);
  const [r,g,b,a]=hexToRgba(bg);
  for(let i=0;i<rgba.length;i+=4){rgba[i]=r;rgba[i+1]=g;rgba[i+2]=b;rgba[i+3]=a;}
  return rgba;
}
function setPixel(rgba,width,height,x,y,color){
  if(x<0||y<0||x>=width||y>=height) return;
  const idx=(y*width+x)*4;
  rgba[idx]=color[0]; rgba[idx+1]=color[1]; rgba[idx+2]=color[2]; rgba[idx+3]=color[3];
}
function addGlow(rgba,width,height,cx,cy,radius,color){
  for(let y=Math.max(0, cy-radius*2); y<Math.min(height, cy+radius*2); y++){
    for(let x=Math.max(0, cx-radius*2); x<Math.min(width, cx+radius*2); x++){
      const dx=x-cx, dy=y-cy, d=Math.sqrt(dx*dx+dy*dy);
      if(d>radius && d<radius*1.8){
        const alpha=Math.max(0, 1-((d-radius)/(radius*0.8)))*0.28;
        const idx=(y*width+x)*4;
        rgba[idx]=Math.min(255, Math.round(rgba[idx]*(1-alpha)+color[0]*alpha));
        rgba[idx+1]=Math.min(255, Math.round(rgba[idx+1]*(1-alpha)+color[1]*alpha));
        rgba[idx+2]=Math.min(255, Math.round(rgba[idx+2]*(1-alpha)+color[2]*alpha));
        rgba[idx+3]=255;
      }
    }
  }
}
function drawCircle(rgba,width,height,shape){
  const color=hexToRgba(shape.color);
  if(shape.glow) addGlow(rgba,width,height,shape.cx,shape.cy,shape.r,color);
  for(let y=Math.max(0, shape.cy-shape.r); y<Math.min(height, shape.cy+shape.r); y++){
    for(let x=Math.max(0, shape.cx-shape.r); x<Math.min(width, shape.cx+shape.r); x++){
      const dx=x-shape.cx, dy=y-shape.cy;
      if(dx*dx+dy*dy<=shape.r*shape.r) setPixel(rgba,width,height,x,y,color);
    }
  }
}
function area(a,b,c){ return (a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]))/2; }
function pointInTriangle(p,a,b,c){
  const A=Math.abs(area(a,b,c));
  const A1=Math.abs(area(p,b,c));
  const A2=Math.abs(area(a,p,c));
  const A3=Math.abs(area(a,b,p));
  return Math.abs(A-(A1+A2+A3))<0.5;
}
function drawTriangle(rgba,width,height,shape){
  const color=hexToRgba(shape.color);
  const [a,b,c]=shape.points;
  const minX=Math.max(0, Math.min(a[0],b[0],c[0]));
  const maxX=Math.min(width-1, Math.max(a[0],b[0],c[0]));
  const minY=Math.max(0, Math.min(a[1],b[1],c[1]));
  const maxY=Math.min(height-1, Math.max(a[1],b[1],c[1]));
  for(let y=minY;y<=maxY;y++){
    for(let x=minX;x<=maxX;x++){
      if(pointInTriangle([x,y],a,b,c)) setPixel(rgba,width,height,x,y,color);
    }
  }
}
function crc32(buf){
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return (c ^ -1) >>> 0;
}
function chunk(type, data){
  const typeBuf=Buffer.from(type);
  const lenBuf=Buffer.alloc(4); lenBuf.writeUInt32BE(data.length,0);
  const crcBuf=Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf,data])),0);
  return Buffer.concat([lenBuf,typeBuf,data,crcBuf]);
}
function encodePng(width,height,rgba){
  const signature=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4); ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const stride=width*4;
  const raw=Buffer.alloc((stride+1)*height);
  for(let y=0;y<height;y++){
    raw[y*(stride+1)]=0;
    Buffer.from(rgba.subarray(y*stride,(y+1)*stride)).copy(raw,y*(stride+1)+1);
  }
  const idat=zlib.deflateSync(raw);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}
const rgba=makeBuffer(spec.width,spec.height,spec.background);
for(const shape of spec.shapes){
  if(shape.type==='circle') drawCircle(rgba,spec.width,spec.height,shape);
  if(shape.type==='triangle') drawTriangle(rgba,spec.width,spec.height,shape);
}
fs.writeFileSync(outPath, encodePng(spec.width,spec.height,rgba));
fs.writeFileSync(scenePath, JSON.stringify(spec,null,2));
console.log(JSON.stringify({ outPath, scenePath, width: spec.width, height: spec.height, shapeCount: spec.shapes.length }, null, 2));
`;

    const testSource = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function readPngMeta(buffer){
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const here=path.dirname(fileURLToPath(import.meta.url));
const renderer=path.resolve(here,'..','render-image.mjs');

test('renders the requested image artifact as a PNG with the expected dimensions',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-image-'));
  const out=path.join(dir,'image.png');
  const scene=path.join(dir,'image-scene.json');
  const run=spawnSync(process.execPath,[renderer,out,scene],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  assert.ok(fs.existsSync(out));
  assert.ok(fs.existsSync(scene));
  const png=fs.readFileSync(out);
  assert.equal(png.slice(0,8).toString('hex'),'89504e470d0a1a0a');
  const meta=readPngMeta(png);
  assert.equal(meta.width, ${spec.image.width});
  assert.equal(meta.height, ${spec.image.height});
  const parsedScene=JSON.parse(fs.readFileSync(scene,'utf8'));
  assert.equal(parsedScene.shapes.filter(s=>s.type==='circle').length, 1);
  assert.equal(parsedScene.shapes.filter(s=>s.type==='triangle').length, 3);
});
`;

    return [
      { path: 'render-image.mjs', type: 'javascript', content: renderSource },
      { path: 'tests/semantic-image.test.mjs', type: 'javascript', content: testSource }
    ];
  }

  videoArtifact(spec) {
    const frameSource = `#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const spec = ${JSON.stringify(spec.video, null, 2)};
const outDir = process.argv[2] || 'frames';
fs.mkdirSync(outDir, { recursive: true });

function hexToRgba(hex){ return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255]; }
function makeBuffer(width,height,bg){ const rgba=new Uint8Array(width*height*4); const [r,g,b,a]=hexToRgba(bg); for(let i=0;i<rgba.length;i+=4){rgba[i]=r;rgba[i+1]=g;rgba[i+2]=b;rgba[i+3]=a;} return rgba; }
function setPixel(rgba,width,height,x,y,color){ if(x<0||y<0||x>=width||y>=height) return; const idx=(y*width+x)*4; rgba[idx]=color[0]; rgba[idx+1]=color[1]; rgba[idx+2]=color[2]; rgba[idx+3]=color[3]; }
function drawCircle(rgba,width,height,cx,cy,r,color){ for(let y=Math.max(0, cy-r); y<Math.min(height, cy+r); y++){ for(let x=Math.max(0, cx-r); x<Math.min(width, cx+r); x++){ const dx=x-cx, dy=y-cy; if(dx*dx+dy*dy<=r*r) setPixel(rgba,width,height,x,y,color); } } }
function crc32(buf){ let c=-1; for(let i=0;i<buf.length;i++){ c^=buf[i]; for(let k=0;k<8;k++) c=(c>>>1)^(0xEDB88320 & -(c&1)); } return (c^-1)>>>0; }
function chunk(type,data){ const typeBuf=Buffer.from(type); const lenBuf=Buffer.alloc(4); lenBuf.writeUInt32BE(data.length,0); const crcBuf=Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf,data])),0); return Buffer.concat([lenBuf,typeBuf,data,crcBuf]); }
function encodePng(width,height,rgba){ const signature=Buffer.from([137,80,78,71,13,10,26,10]); const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4); ihdr[8]=8; ihdr[9]=6; const stride=width*4; const raw=Buffer.alloc((stride+1)*height); for(let y=0;y<height;y++){ raw[y*(stride+1)]=0; Buffer.from(rgba.subarray(y*stride,(y+1)*stride)).copy(raw,y*(stride+1)+1);} return Buffer.concat([signature, chunk('IHDR',ihdr), chunk('IDAT',zlib.deflateSync(raw)), chunk('IEND',Buffer.alloc(0))]); }

const totalFrames = spec.durationSeconds * spec.fps;
const color = hexToRgba(spec.object.color);
const frames = [];
for(let i=0;i<totalFrames;i++){
  const t = totalFrames === 1 ? 0 : i / (totalFrames - 1);
  const x = Math.round(spec.path.from.x + (spec.path.to.x - spec.path.from.x) * t);
  const y = Math.round(spec.path.from.y + (spec.path.to.y - spec.path.from.y) * t);
  const rgba = makeBuffer(spec.width, spec.height, spec.background);
  drawCircle(rgba, spec.width, spec.height, x, y, spec.object.radius, color);
  const name = 'frame-' + String(i).padStart(4,'0') + '.png';
  fs.writeFileSync(path.join(outDir, name), encodePng(spec.width, spec.height, rgba));
  frames.push({ index: i, x, y, file: name });
}
fs.writeFileSync(path.join(outDir,'timeline.json'), JSON.stringify({ ...spec, totalFrames, frames }, null, 2));
console.log(JSON.stringify({ outDir, totalFrames }, null, 2));
`;

    const htmlSource = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthia Motion Preview</title></head>
<body><canvas id="c" width="${spec.video.width}" height="${spec.video.height}"></canvas><script>
const spec=${JSON.stringify(spec.video)};
const c=document.getElementById('c'); const ctx=c.getContext('2d');
let start=null; function step(ts){ if(start===null) start=ts; const elapsed=(ts-start)/1000; const t=Math.min(1, elapsed/spec.durationSeconds); const x=spec.path.from.x + (spec.path.to.x-spec.path.from.x)*t; const y=spec.path.from.y + (spec.path.to.y-spec.path.from.y)*t; ctx.fillStyle=spec.background; ctx.fillRect(0,0,spec.width,spec.height); ctx.fillStyle=spec.object.color; ctx.beginPath(); ctx.arc(x,y,spec.object.radius,0,Math.PI*2); ctx.fill(); if(t<1) requestAnimationFrame(step); }
requestAnimationFrame(step);
<\/script></body></html>`;

    const testSource = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const generator=path.resolve(here,'..','render-video-frames.mjs');

test('renders a deterministic frame sequence for a simple motion video request',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-video-'));
  const run=spawnSync(process.execPath,[generator,dir],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const timeline=JSON.parse(fs.readFileSync(path.join(dir,'timeline.json'),'utf8'));
  assert.equal(timeline.totalFrames, ${spec.video.durationSeconds * spec.video.fps});
  assert.equal(timeline.frames[0].x, ${spec.video.path.from.x});
  assert.equal(timeline.frames.at(-1).x, ${spec.video.path.to.x});
  assert.ok(fs.existsSync(path.join(dir,'frame-0000.png')));
  assert.ok(fs.existsSync(path.join(dir,'frame-' + String(timeline.totalFrames-1).padStart(4,'0') + '.png')));
});
`;

    return [
      { path: 'render-video-frames.mjs', type: 'javascript', content: frameSource },
      { path: 'video-preview.html', type: 'html', content: htmlSource },
      { path: 'tests/semantic-video.test.mjs', type: 'javascript', content: testSource }
    ];
  }

  greetingCli(spec) {
    const remember = spec.persistence.required;
    const source = `#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// Deterministically compiled by Synthia from semantic-spec.json.
const remember=${remember ? 'true' : 'false'};
const memoryPath=process.env.SYNTHIA_MEMORY_FILE || path.join(process.cwd(), '.synthia-greeting-memory.json');

function freshMemory(){ return { sequence:0, lastName:null, lastGreeting:null, history:[] }; }
function loadMemory(){
  if(!remember || !fs.existsSync(memoryPath)) return freshMemory();
  try { return { ...freshMemory(), ...JSON.parse(fs.readFileSync(memoryPath,'utf8')) }; }
  catch { return freshMemory(); }
}
function saveMemory(memory){
  if(!remember) return;
  fs.mkdirSync(path.dirname(memoryPath), { recursive:true });
  const tmp=memoryPath+'.tmp';
  fs.writeFileSync(tmp, JSON.stringify(memory,null,2));
  fs.renameSync(tmp, memoryPath);
}

const args=process.argv.slice(2);
const memory=loadMemory();
if(args.includes('--history')){
  process.stdout.write(JSON.stringify(memory.history,null,2)+'\\n');
  process.exit(0);
}
const positional=args.filter(arg=>!arg.startsWith('--'));
const suppliedName=positional.join(' ').trim();
const name=suppliedName || memory.lastName;
if(!name){
  process.stderr.write('Usage: node cli.mjs <name> [--history]\\n');
  process.exit(1);
}
const greeting=\`Hello, \${name}!\`;
if(remember){
  const sequence=Number(memory.sequence || 0)+1;
  memory.sequence=sequence;
  memory.lastName=name;
  memory.lastGreeting=greeting;
  memory.history=[...(Array.isArray(memory.history)?memory.history:[]), {sequence,name,greeting}].slice(-100);
  saveMemory(memory);
}
process.stdout.write(greeting+'\\n');
`;
    const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here=path.dirname(fileURLToPath(import.meta.url));
const cli=path.resolve(here,'..','cli.mjs');

test('greets by name and remembers across invocations',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-greeting-'));
  const memory=path.join(dir,'memory.json');
  const env={...process.env,SYNTHIA_MEMORY_FILE:memory};
  const first=spawnSync(process.execPath,[cli,'Ada'],{encoding:'utf8',env});
  assert.equal(first.status,0,first.stderr);
  assert.equal(first.stdout.trim(),'Hello, Ada!');
  const second=spawnSync(process.execPath,[cli],{encoding:'utf8',env});
  assert.equal(second.status,0,second.stderr);
  assert.equal(second.stdout.trim(),'Hello, Ada!');
  const saved=JSON.parse(fs.readFileSync(memory,'utf8'));
  assert.equal(saved.lastName,'Ada');
  assert.equal(saved.lastGreeting,'Hello, Ada!');
  assert.equal(saved.history.length,2);
});
`;
    return [
      { path: 'cli.mjs', type: 'javascript', content: source },
      { path: 'tests/semantic-cli.test.mjs', type: 'javascript', content: test }
    ];
  }

  greetingWeb(spec) {
    const remember = spec.persistence.required;
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Greeting Tool</title></head>
<body><main><h1>Greeting Tool</h1><form id="form"><label>Name <input id="name" name="name" autocomplete="name" required></label><button>Greet</button></form><p id="greeting" aria-live="polite"></p><pre id="history"></pre></main><script src="app.js"><\/script></body></html>`;
    const js = `const remember=${remember ? 'true' : 'false'};
const key='synthia.greeting.memory.v1';
const fresh=()=>({sequence:0,lastName:null,lastGreeting:null,history:[]});
const load=()=>{if(!remember)return fresh();try{return{...fresh(),...JSON.parse(localStorage.getItem(key)||'{}')}}catch{return fresh()}};
const save=m=>{if(remember)localStorage.setItem(key,JSON.stringify(m))};
const form=document.getElementById('form'), input=document.getElementById('name'), output=document.getElementById('greeting'), history=document.getElementById('history');
let memory=load(); if(memory.lastName) input.value=memory.lastName;
const render=()=>{history.textContent=remember?JSON.stringify(memory.history,null,2):''}; render();
form.addEventListener('submit',event=>{event.preventDefault();const name=input.value.trim();if(!name)return;const greeting=\`Hello, \${name}!\`;output.textContent=greeting;if(remember){const sequence=Number(memory.sequence||0)+1;memory={...memory,sequence,lastName:name,lastGreeting:greeting,history:[...(memory.history||[]),{sequence,name,greeting}].slice(-100)};save(memory);render();}});
`;
    return [
      { path: 'index.html', type: 'html', content: html },
      { path: 'app.js', type: 'javascript', content: js }
    ];
  }
}

export { SemanticArtifactCompiler };
export default SemanticArtifactCompiler;
