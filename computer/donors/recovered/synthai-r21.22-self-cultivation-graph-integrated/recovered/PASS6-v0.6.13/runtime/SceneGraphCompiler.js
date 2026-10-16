import { VisualPrimitiveCompiler, COLOR_MAP } from './VisualPrimitiveCompiler.js';
import { RendererRouter } from './RendererRouter.js';

const NUMBER_WORDS = Object.freeze({ one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10 });

class SceneGraphCompiler {
  visualCompiler = new VisualPrimitiveCompiler();
  router = new RendererRouter();

  parse(intent) {
    if (typeof intent !== 'string' || !intent.trim()) return null;
    const lower = intent.toLowerCase();
    const hasSceneVocabulary = /\b(scene|sphere|mountain|camera|sunset|foreground|background|behind|in front|pan|rises?|rise|lighting)\b/.test(lower);
    if (!hasSceneVocabulary) return null;

    const explicitVideo = /\b(video|clip|movie|animation|animated)\b/.test(lower);
    const explicitImage = /\b(image|photo|picture|png|drawing|illustration)\b/.test(lower);
    const temporal = /\b(rises?|rise|moves?|moving|pans?|pan|rotates?|rotate|zooms?|zoom|drifts?|drift|falls?|fall)\b/.test(lower);
    const medium = explicitVideo || (!explicitImage && temporal) ? 'video' : 'image';
    const dims = lower.match(/\b(\d{2,4})\s*[x×]\s*(\d{2,4})\b/);
    const width = dims ? Number(dims[1]) : medium === 'video' ? 640 : 512;
    const height = dims ? Number(dims[2]) : medium === 'video' ? 360 : 512;
    const durationHit = lower.match(/\b(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)[ -]seconds?\b/);
    const durationSeconds = durationHit ? (Number(durationHit[1]) || NUMBER_WORDS[durationHit[1]] || 5) : 5;
    const fpsHit = lower.match(/\b(\d{1,3})\s*fps\b/);
    const fps = fpsHit ? Math.max(1, Math.min(60, Number(fpsHit[1]))) : 30;

    const entities = [];
    if (/\bsphere\b/.test(lower)) {
      entities.push({
        id: 'sphere-1', type: 'object', geometry: 'sphere',
        material: { color: this.colorNear(lower, 'sphere', 'gold'), glow: /\bglow(?:ing)?\b/.test(lower) || /\bgold(?:en)?\b/.test(lower) },
        transform: { x: 0.52, y: medium === 'video' && /\brises?\b/.test(lower) ? 0.72 : 0.38, z: -1, scale: 1 }
      });
    }
    if (/\bmountains?\b/.test(lower)) {
      entities.push({
        id: 'mountain-1', type: 'object', geometry: 'mountain',
        material: { color: '#2b2636', glow: false },
        transform: { x: 0.5, y: 0.68, z: 0, scale: 1 }
      });
    }

    const relations = [];
    if (/\bsphere\b/.test(lower) && /\bmountains?\b/.test(lower)) {
      if (/\bbehind\b/.test(lower)) relations.push({ type: 'behind', subject: 'sphere-1', object: 'mountain-1' });
      if (/\b(?:above|over)\b/.test(lower)) relations.push({ type: 'above', subject: 'sphere-1', object: 'mountain-1' });
    }

    const sunset = /\bsunset\b/.test(lower);
    const environment = sunset
      ? { kind: 'sunset', sky: { top: '#4c2f7a', bottom: '#ffb36b' }, ambient: 0.72 }
      : { kind: 'plain', sky: { top: '#f7f4ec', bottom: '#f7f4ec' }, ambient: 1 };

    const camera = {
      projection: 'orthographic-2d',
      x: 0,
      y: 0,
      zoom: 1,
      motion: null
    };
    if (/\bcamera\b/.test(lower) && /\bpan(?:s|ning)?\b/.test(lower)) {
      const direction = /\bpan(?:s|ning)?\s+(?:slowly\s+)?left\b|\bpan left\b/.test(lower) ? 'left' : 'right';
      camera.motion = { property: 'x', from: 0, to: direction === 'right' ? 0.1 : -0.1, easing: /\bslow(?:ly)?\b/.test(lower) ? 'smoothstep' : 'linear' };
    }

    const tracks = [];
    if (medium === 'video' && /\bsphere\b/.test(lower) && /\brises?\b/.test(lower)) {
      tracks.push({ target: 'sphere-1', property: 'y', from: 0.72, to: 0.34, easing: 'smoothstep' });
    }
    if (medium === 'video' && camera.motion) tracks.push({ target: 'camera', ...camera.motion });

    const features = new Set(['material.solid']);
    for (const entity of entities) features.add(`geometry.${entity.geometry}`);
    if (entities.some(e => e.material.glow)) features.add('material.glow');
    if (sunset) { features.add('lighting.sunset'); features.add('background.gradient'); }
    if (tracks.some(t => t.target !== 'camera' && t.property === 'y')) features.add('timeline.position');
    if (camera.motion) features.add('camera.pan'); else features.add('camera.static');

    return {
      schemaVersion: 1,
      intent: intent.trim(),
      medium,
      canvas: { width, height },
      environment,
      entities,
      relations,
      camera,
      timeline: medium === 'video' ? { durationSeconds, fps, tracks } : null,
      features: [...features].sort(),
      output: medium === 'video'
        ? { format: 'webm', filename: 'scene.webm' }
        : { format: 'png', filename: 'scene.png' }
    };
  }

  colorNear(lower, noun, fallback) {
    const names = Object.keys(COLOR_MAP);
    const pattern = new RegExp(`\\b(${names.join('|')})\\b[^.]{0,24}\\b${noun}\\b|\\b${noun}\\b[^.]{0,24}\\b(${names.join('|')})\\b`);
    const hit = lower.match(pattern);
    return COLOR_MAP[hit?.[1] || hit?.[2]] || COLOR_MAP[fallback] || fallback;
  }

  compile(scene) {
    if (!scene) return [];
    const route = this.router.route(scene);
    const files = [
      { path: 'synthia/scene-graph.json', type: 'json', content: JSON.stringify(scene, null, 2) },
      { path: 'synthia/renderer-route.json', type: 'json', content: JSON.stringify(route, null, 2) },
      { path: 'scene-primitives.mjs', type: 'javascript', content: this.scenePrimitivesModule() },
      { path: 'media-composition.json', type: 'json', content: JSON.stringify(this.mediaComposition(scene, route), null, 2) }
    ];
    if (route.selected === 'procedural-raster') {
      files.push(...(scene.medium === 'video' ? this.videoArtifact(scene) : this.imageArtifact(scene)));
    } else {
      files.push({ path: 'RENDERER-HANDOFF.md', type: 'markdown', content: this.handoff(route) });
    }
    return files;
  }

  mediaComposition(scene, route) {
    return {
      schemaVersion: 1,
      renderer: route.mediaRenderer.renderer,
      scene,
      provenance: { compiler: 'SceneGraphCompiler', deterministic: true }
    };
  }

  scenePrimitivesModule() {
    return `import fs from 'node:fs';\nimport zlib from 'node:zlib';\n\nexport function hex(value){const s=String(value||'#000000').replace('#','');return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)];}\nexport function raster(width,height,bg='#ffffff'){const [r,g,b]=hex(bg);const data=Buffer.alloc(width*height*3);for(let i=0;i<data.length;i+=3){data[i]=r;data[i+1]=g;data[i+2]=b;}return {width,height,data};}\nfunction setPixel(img,x,y,color){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=img.width||y>=img.height)return;const i=(y*img.width+x)*3;img.data[i]=color[0];img.data[i+1]=color[1];img.data[i+2]=color[2];}\nexport function verticalGradient(img,top,bottom){const a=hex(top),b=hex(bottom);for(let y=0;y<img.height;y++){const t=img.height<=1?0:y/(img.height-1);const c=[0,1,2].map(i=>Math.round(a[i]*(1-t)+b[i]*t));for(let x=0;x<img.width;x++)setPixel(img,x,y,c);}}\nexport function circle(img,cx,cy,radius,color,glow=false){const rgb=hex(color);if(glow){for(let ring=radius*1.75;ring>radius;ring-=2){const alpha=Math.max(0,1-(ring-radius)/(radius*.75))*.14;for(let y=Math.floor(cy-ring);y<=Math.ceil(cy+ring);y++)for(let x=Math.floor(cx-ring);x<=Math.ceil(cx+ring);x++){if(x<0||y<0||x>=img.width||y>=img.height)continue;const d=Math.hypot(x-cx,y-cy);if(d>ring||d<radius)continue;const i=(y*img.width+x)*3;img.data[i]=Math.round(img.data[i]*(1-alpha)+rgb[0]*alpha);img.data[i+1]=Math.round(img.data[i+1]*(1-alpha)+rgb[1]*alpha);img.data[i+2]=Math.round(img.data[i+2]*(1-alpha)+rgb[2]*alpha);}}}for(let y=Math.floor(cy-radius);y<=Math.ceil(cy+radius);y++)for(let x=Math.floor(cx-radius);x<=Math.ceil(cx+radius);x++)if((x-cx)**2+(y-cy)**2<=radius**2)setPixel(img,x,y,rgb);}\nexport function polygon(img,points,color){const rgb=hex(color);const ys=points.map(p=>p[1]),xs=points.map(p=>p[0]);const minY=Math.max(0,Math.floor(Math.min(...ys))),maxY=Math.min(img.height-1,Math.ceil(Math.max(...ys))),minX=Math.max(0,Math.floor(Math.min(...xs))),maxX=Math.min(img.width-1,Math.ceil(Math.max(...xs)));for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const xi=points[i][0],yi=points[i][1],xj=points[j][0],yj=points[j][1];const hit=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-12)+xi);if(hit)inside=!inside;}if(inside)setPixel(img,x,y,rgb);}}\nfunction crc32(buf){let c=0xffffffff;for(const byte of buf){c^=byte;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}\nfunction chunk(type,data){const t=Buffer.from(type);const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}\nexport function pngBuffer(img){const raw=Buffer.alloc((img.width*3+1)*img.height);for(let y=0;y<img.height;y++){const dst=y*(img.width*3+1);raw[dst]=0;img.data.copy(raw,dst+1,y*img.width*3,(y+1)*img.width*3);}const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(img.width,0);ihdr.writeUInt32BE(img.height,4);ihdr[8]=8;ihdr[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}\nexport function writePng(file,img){fs.writeFileSync(file,pngBuffer(img));}\nexport function smoothstep(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}\nexport function ease(name,t){return name==='smoothstep'?smoothstep(t):Math.max(0,Math.min(1,t));}\nexport function lerp(a,b,t){return a+(b-a)*t;}\n`;
  }

  renderBody(scene, progressExpr='0') {
    const sphere = scene.entities.find(e => e.geometry === 'sphere');
    const mountain = scene.entities.find(e => e.geometry === 'mountain');
    const sphereTrack = scene.timeline?.tracks?.find(t => t.target === sphere?.id && t.property === 'y');
    const cameraTrack = scene.timeline?.tracks?.find(t => t.target === 'camera' && t.property === 'x');
    const lines = [
      `const img=raster(scene.canvas.width,scene.canvas.height);`,
      `verticalGradient(img,scene.environment.sky.top,scene.environment.sky.bottom);`,
      `const p=${progressExpr};`,
      `const cameraX=${cameraTrack ? `lerp(${cameraTrack.from},${cameraTrack.to},ease(${JSON.stringify(cameraTrack.easing)},p))` : 'scene.camera.x'};`
    ];
    if (sphere) {
      const yExpr = sphereTrack ? `lerp(${sphereTrack.from},${sphereTrack.to},ease(${JSON.stringify(sphereTrack.easing)},p))` : `${sphere.transform.y}`;
      lines.push(`{const e=scene.entities.find(e=>e.id==='${sphere.id}');const x=(e.transform.x-cameraX)*scene.canvas.width;const y=(${yExpr}-scene.camera.y)*scene.canvas.height;const r=Math.min(scene.canvas.width,scene.canvas.height)*0.105*e.transform.scale;circle(img,x,y,r,e.material.color,e.material.glow);}`);
    }
    if (mountain) {
      lines.push(`{const e=scene.entities.find(e=>e.id==='${mountain.id}');const w=scene.canvas.width,h=scene.canvas.height,shift=cameraX*w;const points=[[-.08*w-shift,h],[.12*w-shift,.72*h],[.28*w-shift,.52*h],[.38*w-shift,.64*h],[.52*w-shift,.42*h],[.68*w-shift,.62*h],[.82*w-shift,.49*h],[1.08*w-shift,.72*h],[1.08*w-shift,h]];polygon(img,points,e.material.color);}`);
    }
    return lines.join('\n');
  }

  imageArtifact(scene) {
    const source = `#!/usr/bin/env node\nimport { raster,verticalGradient,circle,polygon,writePng,ease,lerp } from './scene-primitives.mjs';\nconst scene=${JSON.stringify(scene)};\n${this.renderBody(scene, '1')}\nconst out=process.argv[2]||scene.output.filename;writePng(out,img);process.stdout.write(out+'\\n');\n`;
    return [
      { path: 'render-scene.mjs', type: 'javascript', content: source },
      { path: 'cli.mjs', type: 'javascript', content: `#!/usr/bin/env node\nimport './render-scene.mjs';\n` },
      { path: 'tests/scene-image.test.mjs', type: 'javascript', content: this.imageTest(scene) }
    ];
  }

  videoArtifact(scene) {
    const source = `#!/usr/bin/env node\nimport fs from 'node:fs';\nimport os from 'node:os';\nimport path from 'node:path';\nimport { spawnSync } from 'node:child_process';\nimport { raster,verticalGradient,circle,polygon,writePng,ease,lerp } from './scene-primitives.mjs';\nconst scene=${JSON.stringify(scene)};\nconst out=process.argv[2]||scene.output.filename;const frames=Math.max(2,Math.round(scene.timeline.durationSeconds*scene.timeline.fps));const dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-scene-'));\nfor(let frame=0;frame<frames;frame++){const progress=frame/(frames-1);${this.renderBody(scene, 'progress')}\nwritePng(path.join(dir,\`frame-\${String(frame).padStart(4,'0')}.png\`),img);}\nconst ffmpeg=process.env.SYNTHIA_FFMPEG||'ffmpeg';let r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-framerate',String(scene.timeline.fps),'-i',path.join(dir,'frame-%04d.png'),'-c:v','libvpx-vp9','-pix_fmt','yuv420p','-an',out],{encoding:'utf8'});if(r.status!==0)r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-framerate',String(scene.timeline.fps),'-i',path.join(dir,'frame-%04d.png'),'-c:v','libvpx','-pix_fmt','yuv420p','-an',out],{encoding:'utf8'});if(r.status!==0){process.stderr.write('WebM encoder unavailable. PNG frames remain in '+dir+'\\n'+(r.stderr||''));process.exit(2);}fs.rmSync(dir,{recursive:true,force:true});process.stdout.write(out+'\\n');\n`;
    const browser = this.browserFallback(scene);
    return [
      { path: 'render-scene-video.mjs', type: 'javascript', content: source },
      { path: 'cli.mjs', type: 'javascript', content: `#!/usr/bin/env node\nimport './render-scene-video.mjs';\n` },
      { path: 'scene.html', type: 'html', content: browser },
      { path: 'tests/scene-video.test.mjs', type: 'javascript', content: this.videoTest(scene) }
    ];
  }

  browserFallback(scene) {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthia Scene Renderer</title></head><body><button id="render">Render WebM</button><canvas id="c" width="${scene.canvas.width}" height="${scene.canvas.height}"></canvas><a id="save" hidden>Save video</a><script>const scene=${JSON.stringify(scene)},c=document.getElementById('c'),x=c.getContext('2d');const lerp=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);function frame(p){const g=x.createLinearGradient(0,0,0,c.height);g.addColorStop(0,scene.environment.sky.top);g.addColorStop(1,scene.environment.sky.bottom);x.fillStyle=g;x.fillRect(0,0,c.width,c.height);const cam=scene.camera.motion?lerp(scene.camera.motion.from,scene.camera.motion.to,smooth(p)):0;const s=scene.entities.find(e=>e.geometry==='sphere');if(s){const track=scene.timeline.tracks.find(t=>t.target===s.id);const sy=track?lerp(track.from,track.to,smooth(p)):s.transform.y;x.beginPath();x.arc((s.transform.x-cam)*c.width,sy*c.height,Math.min(c.width,c.height)*.105,0,Math.PI*2);x.fillStyle=s.material.color;x.shadowBlur=s.material.glow?26:0;x.shadowColor=s.material.color;x.fill();x.shadowBlur=0}const m=scene.entities.find(e=>e.geometry==='mountain');if(m){const sh=cam*c.width;x.beginPath();x.moveTo(-.08*c.width-sh,c.height);[[.12,.72],[.28,.52],[.38,.64],[.52,.42],[.68,.62],[.82,.49],[1.08,.72]].forEach(([a,b])=>x.lineTo(a*c.width-sh,b*c.height));x.lineTo(1.08*c.width-sh,c.height);x.closePath();x.fillStyle=m.material.color;x.fill()}}document.getElementById('render').onclick=async()=>{const stream=c.captureStream(scene.timeline.fps),chunks=[],rec=new MediaRecorder(stream,{mimeType:'video/webm'});rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=()=>{const a=document.getElementById('save');a.href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));a.download=scene.output.filename;a.hidden=false;a.textContent='Save '+scene.output.filename};rec.start();const start=performance.now(),dur=scene.timeline.durationSeconds*1000;await new Promise(done=>{function tick(now){const p=Math.min(1,(now-start)/dur);frame(p);p<1?requestAnimationFrame(tick):setTimeout(done,120)}requestAnimationFrame(tick)});rec.stop()};frame(0);</script></body></html>`;
  }

  imageTest(scene) {
    return `import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..');test('scene graph renders PNG',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scene-png-')),out=path.join(dir,'scene.png');const r=spawnSync(process.execPath,[path.join(root,'render-scene.mjs'),out],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);const b=fs.readFileSync(out);assert.deepEqual([...b.subarray(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(b.readUInt32BE(16),${scene.canvas.width});assert.equal(b.readUInt32BE(20),${scene.canvas.height});});`;
  }

  videoTest(scene) {
    return `import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..');test('scene graph renders WebM timeline',()=>{if(spawnSync('ffmpeg',['-version'],{encoding:'utf8'}).status!==0)return;const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scene-webm-')),out=path.join(dir,'scene.webm');const r=spawnSync(process.execPath,[path.join(root,'render-scene-video.mjs'),out],{cwd:root,encoding:'utf8',timeout:120000});assert.equal(r.status,0,r.stderr);const b=fs.readFileSync(out);assert.deepEqual([...b.subarray(0,4)],[26,69,223,163]);assert.ok(b.length>1000);});`;
  }

  handoff(route) {
    return `# Renderer handoff\n\nThe scene graph contains features not implemented by the deterministic local raster renderer.\n\nSelected route: **${route.selected}**\n\nUnsupported local features: ${route.unsupported.join(', ') || 'none'}\n\nPass \`media-composition.json\` to the existing \`media-renderer\` automaton or a mounted host graphics adapter.\n`;
  }
}

export { SceneGraphCompiler };
export default SceneGraphCompiler;
