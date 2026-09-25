const COLOR_MAP = Object.freeze({
  red: '#ff2d2d', gold: '#d4af37', golden: '#d4af37', yellow: '#ffd54a',
  black: '#111111', dark: '#252525', white: '#ffffff', blue: '#2d6cff',
  green: '#2fbf71', purple: '#8f5cff', orange: '#ff8a2d', pink: '#ff5ca8'
});

class VisualPrimitiveCompiler {
  parse(intent) {
    const lower = intent.toLowerCase();
    const medium = /\b(video|clip|movie|animation|animated)\b/.test(lower) ? 'video'
      : /\b(image|photo|picture|png|drawing|illustration)\b/.test(lower) ? 'image' : null;
    if (!medium) return null;

    const dims = lower.match(/\b(\d{2,4})\s*[x×]\s*(\d{2,4})\b/);
    const width = dims ? Number(dims[1]) : medium === 'image' ? 512 : 320;
    const height = dims ? Number(dims[2]) : medium === 'image' ? 512 : 180;
    const colors = Object.keys(COLOR_MAP).filter(name => new RegExp(`\\b${name}\\b`).test(lower));
    const colorFor = (near, fallback) => {
      const pattern = new RegExp(`\\b(${Object.keys(COLOR_MAP).join('|')})\\b[^.]{0,32}\\b${near}\\b|\\b${near}\\b[^.]{0,32}\\b(${Object.keys(COLOR_MAP).join('|')})\\b`);
      const hit = lower.match(pattern);
      return COLOR_MAP[hit?.[1] || hit?.[2]] || COLOR_MAP[fallback] || fallback;
    };
    const wordNumber = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10 };
    const countNear = (noun, fallback=1) => {
      const hit = lower.match(new RegExp(`\\b(\\d+|one|two|three|four|five|six|seven|eight|nine|ten)\\s+(?:\\w+\\s+){0,2}${noun}s?\\b`));
      if (!hit) return fallback;
      return Number(hit[1]) || wordNumber[hit[1]] || fallback;
    };
    const durationHit = lower.match(/\b(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)[ -]seconds?\b/);
    const durationSeconds = durationHit ? (Number(durationHit[1]) || wordNumber[durationHit[1]] || 5) : 5;
    const fpsHit = lower.match(/\b(\d{1,3})\s*fps\b/);
    const fps = fpsHit ? Math.max(1, Math.min(60, Number(fpsHit[1]))) : 30;

    const objects = [];
    if (/\bcircle\b/.test(lower)) objects.push({
      id: 'circle-1', shape: 'circle', count: 1,
      color: colorFor('circle', colors[0] || (medium === 'video' ? 'red' : 'gold')),
      glow: /\bglow(?:ing)?\b/.test(lower),
      relation: /\babove\b/.test(lower) ? 'above' : null
    });
    if (/\btriangles?\b/.test(lower)) objects.push({
      id: 'triangle-group-1', shape: 'triangle', count: countNear('triangle', 1),
      color: colorFor('triangle', 'dark'), glow: false,
      relation: /\b(?:below|under)\b/.test(lower) ? 'below' : (/\babove\b/.test(lower) ? 'below-circle' : null)
    });

    const motion = [];
    if (medium === 'video' && /\b(left(?: edge)?)\b/.test(lower) && /\b(right(?: edge)?)\b/.test(lower)) {
      motion.push({ objectId: objects.find(o=>o.shape==='circle')?.id || 'circle-1', property: 'x', from: 'left', to: 'right', easing: /\bsmooth(?:ly)?\b/.test(lower) ? 'smoothstep' : 'linear' });
    }

    return {
      schemaVersion: 1,
      medium, width, height,
      background: '#f7f4ec',
      objects,
      timeline: medium === 'video' ? { durationSeconds, fps, motion } : null,
      output: medium === 'image' ? { format: 'png', filename: 'output.png' } : { format: 'webm', filename: 'output.webm' }
    };
  }

  compile(visual) {
    if (!visual) return [];
    const files = [
      { path: 'synthia/visual-spec.json', type: 'json', content: JSON.stringify(visual, null, 2) },
      { path: 'visual-primitives.mjs', type: 'javascript', content: this.primitivesModule() }
    ];
    if (visual.medium === 'image') files.push(...this.imageArtifact(visual));
    if (visual.medium === 'video') files.push(...this.videoArtifact(visual));
    return files;
  }

  primitivesModule() {
    return `import fs from 'node:fs';\nimport zlib from 'node:zlib';\n\nexport function hex(value){const s=String(value||'#000000').replace('#','');return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)];}\nexport function raster(width,height,bg='#ffffff'){const [r,g,b]=hex(bg);const data=Buffer.alloc(width*height*3);for(let i=0;i<data.length;i+=3){data[i]=r;data[i+1]=g;data[i+2]=b;}return {width,height,data};}\nfunction setPixel(img,x,y,color){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=img.width||y>=img.height)return;const i=(y*img.width+x)*3;img.data[i]=color[0];img.data[i+1]=color[1];img.data[i+2]=color[2];}\nexport function circle(img,cx,cy,radius,color,glow=false){const rgb=hex(color);if(glow){for(let ring=radius*1.8;ring>radius;ring-=2){const alpha=Math.max(0,1-(ring-radius)/(radius*.8))*.12;const minX=Math.floor(cx-ring),maxX=Math.ceil(cx+ring),minY=Math.floor(cy-ring),maxY=Math.ceil(cy+ring);for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const d=Math.hypot(x-cx,y-cy);if(d<=ring&&d>=radius){const i=(y*img.width+x)*3;if(x>=0&&y>=0&&x<img.width&&y<img.height){img.data[i]=Math.round(img.data[i]*(1-alpha)+rgb[0]*alpha);img.data[i+1]=Math.round(img.data[i+1]*(1-alpha)+rgb[1]*alpha);img.data[i+2]=Math.round(img.data[i+2]*(1-alpha)+rgb[2]*alpha);}}}}}\nfor(let y=Math.floor(cy-radius);y<=Math.ceil(cy+radius);y++)for(let x=Math.floor(cx-radius);x<=Math.ceil(cx+radius);x++)if((x-cx)**2+(y-cy)**2<=radius**2)setPixel(img,x,y,rgb);}\nexport function triangle(img,ax,ay,bx,by,cx,cy,color){const rgb=hex(color);const minX=Math.floor(Math.min(ax,bx,cx)),maxX=Math.ceil(Math.max(ax,bx,cx)),minY=Math.floor(Math.min(ay,by,cy)),maxY=Math.ceil(Math.max(ay,by,cy));const edge=(x1,y1,x2,y2,x,y)=>(x-x1)*(y2-y1)-(y-y1)*(x2-x1);for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const e1=edge(ax,ay,bx,by,x,y),e2=edge(bx,by,cx,cy,x,y),e3=edge(cx,cy,ax,ay,x,y);if((e1>=0&&e2>=0&&e3>=0)||(e1<=0&&e2<=0&&e3<=0))setPixel(img,x,y,rgb);}}\nfunction crc32(buf){let c=0xffffffff;for(const byte of buf){c^=byte;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}\nfunction chunk(type,data){const t=Buffer.from(type);const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}\nexport function pngBuffer(img){const raw=Buffer.alloc((img.width*3+1)*img.height);for(let y=0;y<img.height;y++){const dst=y*(img.width*3+1);raw[dst]=0;img.data.copy(raw,dst+1,y*img.width*3,(y+1)*img.width*3);}const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(img.width,0);ihdr.writeUInt32BE(img.height,4);ihdr[8]=8;ihdr[9]=2;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}\nexport function writePng(file,img){fs.writeFileSync(file,pngBuffer(img));}\nexport function smoothstep(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}\n`;
  }

  renderPlan(visual, frameExpr='0') {
    const circleObj = visual.objects.find(o=>o.shape==='circle');
    const triObj = visual.objects.find(o=>o.shape==='triangle');
    const lines = [`const img=raster(spec.width,spec.height,spec.background);`];
    if (circleObj) {
      const hasMotion = visual.timeline?.motion?.some(m=>m.objectId===circleObj.id && m.property==='x');
      const x = hasMotion ? `(radius + (spec.width-2*radius)*smoothstep(${frameExpr}))` : `spec.width*0.5`;
      const y = triObj ? `spec.height*0.32` : `spec.height*0.5`;
      lines.push(`const radius=Math.max(14,Math.round(Math.min(spec.width,spec.height)*0.12));`);
      lines.push(`circle(img,${x},${y},radius,${JSON.stringify(circleObj.color)},${circleObj.glow?'true':'false'});`);
    }
    if (triObj) {
      lines.push(`{const count=${triObj.count};const y=spec.height*0.72;const span=spec.width*0.62;const cell=span/count;const start=spec.width*0.19;for(let i=0;i<count;i++){const cx=start+cell*(i+.5),r=Math.min(cell*.34,spec.height*.11);triangle(img,cx,y-r,cx-r,y+r,cx+r,y+r,${JSON.stringify(triObj.color)});}}`);
    }
    return lines.join('\n');
  }

  imageArtifact(visual) {
    const spec = JSON.stringify(visual);
    const render = `#!/usr/bin/env node\nimport { raster,circle,triangle,writePng } from './visual-primitives.mjs';\nconst spec=${spec};\n${this.renderPlan(visual)}\nconst out=process.argv[2]||spec.output.filename;writePng(out,img);process.stdout.write(out+'\\n');\n`;
    const cli = `#!/usr/bin/env node\nimport './render-image.mjs';\n`;
    const test = `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport os from 'node:os';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\nimport { spawnSync } from 'node:child_process';\nconst here=path.dirname(fileURLToPath(import.meta.url));const root=path.resolve(here,'..');\ntest('renders a real PNG with requested dimensions',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-image-'));const out=path.join(dir,'test.png');const r=spawnSync(process.execPath,[path.join(root,'render-image.mjs'),out],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);const b=fs.readFileSync(out);assert.deepEqual([...b.subarray(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(b.readUInt32BE(16),${visual.width});assert.equal(b.readUInt32BE(20),${visual.height});assert.ok(b.length>500);});\n`;
    return [
      { path:'render-image.mjs', type:'javascript', content:render },
      { path:'cli.mjs', type:'javascript', content:cli },
      { path:'tests/visual-image.test.mjs', type:'javascript', content:test }
    ];
  }

  videoArtifact(visual) {
    const spec = JSON.stringify(visual);
    const renderPlan = this.renderPlan(visual, 'progress');
    const render = `#!/usr/bin/env node\nimport fs from 'node:fs';\nimport os from 'node:os';\nimport path from 'node:path';\nimport { spawnSync } from 'node:child_process';\nimport { raster,circle,triangle,writePng,smoothstep } from './visual-primitives.mjs';\nconst spec=${spec};\nconst out=process.argv[2]||spec.output.filename;\nconst frames=Math.max(2,Math.round(spec.timeline.durationSeconds*spec.timeline.fps));\nconst dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-video-'));\nfor(let frame=0;frame<frames;frame++){const progress=frame/(frames-1);${renderPlan}\nwritePng(path.join(dir,\`frame-\${String(frame).padStart(4,'0')}.png\`),img);}\nconst ffmpeg=process.env.SYNTHIA_FFMPEG||'ffmpeg';\nlet r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-framerate',String(spec.timeline.fps),'-i',path.join(dir,'frame-%04d.png'),'-c:v','libvpx-vp9','-pix_fmt','yuv420p','-an',out],{encoding:'utf8'});\nif(r.status!==0)r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-framerate',String(spec.timeline.fps),'-i',path.join(dir,'frame-%04d.png'),'-c:v','libvpx','-pix_fmt','yuv420p','-an',out],{encoding:'utf8'});\nif(r.status!==0){process.stderr.write('WebM encoder unavailable. PNG frames remain in '+dir+'\\n'+(r.stderr||''));process.exit(2);}\nfs.rmSync(dir,{recursive:true,force:true});process.stdout.write(out+'\\n');\n`;
    const cli = `#!/usr/bin/env node\nimport './render-video.mjs';\n`;
    const browser = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthia Video Renderer</title></head><body><button id="render">Render WebM</button><canvas id="c" width="${visual.width}" height="${visual.height}"></canvas><a id="save" hidden>Save video</a><script>const spec=${spec};const c=document.getElementById('c'),x=c.getContext('2d');function smooth(t){return t*t*(3-2*t)}function frame(p){x.fillStyle=spec.background;x.fillRect(0,0,c.width,c.height);const r=Math.max(14,Math.round(Math.min(c.width,c.height)*.12));const cx=r+(c.width-2*r)*smooth(p);x.beginPath();x.arc(cx,c.height*.5,r,0,Math.PI*2);x.fillStyle='${visual.objects.find(o=>o.shape==='circle')?.color || '#ff2d2d'}';x.fill()}document.getElementById('render').onclick=async()=>{const stream=c.captureStream(spec.timeline.fps),chunks=[],rec=new MediaRecorder(stream,{mimeType:'video/webm'});rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=()=>{const a=document.getElementById('save');a.href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));a.download=spec.output.filename;a.hidden=false;a.textContent='Save '+spec.output.filename};rec.start();const start=performance.now(),dur=spec.timeline.durationSeconds*1000;await new Promise(done=>{function tick(now){const p=Math.min(1,(now-start)/dur);frame(p);p<1?requestAnimationFrame(tick):setTimeout(done,120)}requestAnimationFrame(tick)});rec.stop()};frame(0);</script></body></html>`;
    const test = `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport os from 'node:os';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\nimport { spawnSync } from 'node:child_process';\nconst here=path.dirname(fileURLToPath(import.meta.url));const root=path.resolve(here,'..');\ntest('renders a playable WebM timeline',()=>{const probe=spawnSync('ffmpeg',['-version'],{encoding:'utf8'});if(probe.status!==0)return;const dir=fs.mkdtempSync(path.join(os.tmpdir(),'synthia-webm-'));const out=path.join(dir,'test.webm');const r=spawnSync(process.execPath,[path.join(root,'render-video.mjs'),out],{cwd:root,encoding:'utf8',timeout:120000});assert.equal(r.status,0,r.stderr);const b=fs.readFileSync(out);assert.deepEqual([...b.subarray(0,4)],[26,69,223,163]);assert.ok(b.length>1000);const p=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',out],{encoding:'utf8'});if(p.status===0){const d=Number(p.stdout.trim());assert.ok(d>${Math.max(0,visual.timeline.durationSeconds-0.4)}&&d<${visual.timeline.durationSeconds+0.6},'duration '+d);}});\n`;
    return [
      { path:'render-video.mjs', type:'javascript', content:render },
      { path:'cli.mjs', type:'javascript', content:cli },
      { path:'video.html', type:'html', content:browser },
      { path:'tests/visual-video.test.mjs', type:'javascript', content:test }
    ];
  }
}

export { VisualPrimitiveCompiler, COLOR_MAP };
export default VisualPrimitiveCompiler;
