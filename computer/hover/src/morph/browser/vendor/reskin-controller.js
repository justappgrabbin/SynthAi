/* Synthia Morph Reskin Controller v0.1
 * Bridges YOU-N-I-VERSE House's articulated Three.js rig to the existing Morph engines.
 * Physics/state remain owned by the original House agent; this layer only changes embodiment.
 */
(function(root){
  'use strict';
  const SR=()=>root.SynthiaSpriteRuntime;
  const ML=()=>root.MorphEngineLib;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const cloneLm=(src)=>Object.fromEntries(Object.entries(src).map(([k,v])=>[k,[v[0],v[1]]]));

  const state={
    canvas:null,ctx:null,sourceCanvas:null,camera:null,agents:null,
    bitmap:null,frames:[],grid:null,custom:false,showRig:false,
    lastFacing:new Map(),status:null,frameCountInput:null
  };

  function rotatePoint(anchor,p,angle){
    const x=p[0]-anchor[0],y=p[1]-anchor[1];
    const c=Math.cos(angle),s=Math.sin(angle);
    return [anchor[0]+x*c-y*s,anchor[1]+x*s+y*c];
  }

  function rotateChain(lm,a,b,c,upper,lower){
    const B=rotatePoint(lm[a],lm[b],upper);
    const baseFore=[lm[c][0]-lm[b][0],lm[c][1]-lm[b][1]];
    const foreTarget=[B[0]+baseFore[0],B[1]+baseFore[1]];
    const C=rotatePoint(B,foreTarget,upper+lower);
    lm[b]=B;lm[c]=C;
  }

  function makeWalkPose(phase){
    const base=ML().poseIdle();
    const lm=cloneLm(base);
    const s=Math.sin(phase*Math.PI*2);
    const c=Math.cos(phase*Math.PI*2);
    const arm=0.50*s;
    const leg=-0.46*s;
    rotateChain(lm,'shoulder_l','elbow_l','wrist_l',arm,0.08*c);
    rotateChain(lm,'shoulder_r','elbow_r','wrist_r',-arm,-0.08*c);
    const kneeBend=0.18*Math.max(0,-c);
    rotateChain(lm,'hip_l','knee_l','ankle_l',leg,kneeBend);
    rotateChain(lm,'hip_r','knee_r','ankle_r',-leg,0.18*Math.max(0,c));
    const bob=Math.abs(s)*2.5;
    ['head','hair','neck','shoulder_l','shoulder_r','torso','joint_core','waist','hip_l','hip_r','skirt_l','skirt_r'].forEach(k=>lm[k][1]-=bob);
    lm.hair[0]+=s*3;lm.skirt_l[0]-=s*4;lm.skirt_r[0]-=s*3;
    return lm;
  }

  function buildDefaultSurfaceSheet(){
    const lib=ML();
    const canonical=lib.renderCharacter(lib.poseIdle(),'reskin-canonical');
    const atlas=lib.extractAtlas(canonical);
    const count=8,w=lib.W,h=lib.H;
    const sheet=document.createElement('canvas');sheet.width=w*count;sheet.height=h;
    const sctx=sheet.getContext('2d');
    for(let i=0;i<count;i++){
      const pose=makeWalkPose(i/count);
      const frame=lib.reconstruct(atlas,pose,w,h);
      sctx.drawImage(frame.canvas,i*w,0);
    }
    state.bitmap=sheet;
    state.grid={cols:count,rows:1,frameWidth:w,frameHeight:h};
    state.frames=SR().sliceSheet(sheet,state.grid);
    state.custom=false;
    updateStatus('SURFACE MORPH · 8 rig-driven frames');
  }

  function makeUi(parent){
    const wrap=document.createElement('div');
    wrap.id='morph-reskin-ui';
    wrap.innerHTML=`<button id="morph-toggle" type="button">MORPH</button>
      <div id="morph-panel">
        <div class="mr-title">RESKIN RUNTIME</div>
        <label class="mr-file">SPRITE SHEET<input id="morph-file" type="file" accept="image/*"></label>
        <label class="mr-row">Frames <input id="morph-frame-count" type="number" min="0" max="64" value="0" inputmode="numeric"><span>0 = infer</span></label>
        <label class="mr-check"><input id="morph-show-rig" type="checkbox"> show physical rig</label>
        <button id="morph-reset" type="button">Use Morph surface skin</button>
        <div id="morph-status">booting…</div>
      </div>`;
    parent.appendChild(wrap);
    state.status=wrap.querySelector('#morph-status');
    state.frameCountInput=wrap.querySelector('#morph-frame-count');
    wrap.querySelector('#morph-toggle').onclick=()=>wrap.classList.toggle('open');
    wrap.querySelector('#morph-show-rig').onchange=(e)=>{state.showRig=e.target.checked;syncRigVisibility();};
    wrap.querySelector('#morph-reset').onclick=()=>{buildDefaultSurfaceSheet();syncRigVisibility();};
    wrap.querySelector('#morph-file').onchange=async(e)=>{
      const file=e.target.files?.[0];if(!file)return;
      try{
        const bmp=await SR().loadBitmap(file);
        const preferred=parseInt(state.frameCountInput.value||'0',10)||0;
        const grid=SR().inferGrid(bmp.width,bmp.height,preferred);
        state.bitmap=bmp;state.grid=grid;state.frames=SR().sliceSheet(bmp,grid);state.custom=true;
        updateStatus(`${file.name} · ${grid.cols}×${grid.rows} · ${state.frames.length} frames`);
        syncRigVisibility();
      }catch(err){updateStatus('sheet error: '+err.message);}
    };
  }

  function injectCss(){
    if(document.getElementById('morph-reskin-style'))return;
    const style=document.createElement('style');style.id='morph-reskin-style';
    style.textContent=`#morph-skin-canvas{position:absolute;left:0;top:0;pointer-events:none;z-index:35}
    #morph-reskin-ui{position:absolute;left:10px;bottom:68px;z-index:400;font-family:'Space Mono',monospace;color:#ddd}
    #morph-toggle{border:1px solid rgba(168,85,247,.45);background:rgba(4,4,10,.88);color:#c084fc;border-radius:9px;padding:7px 10px;font:700 9px 'Space Mono',monospace;letter-spacing:.12em}
    #morph-panel{display:none;margin-top:6px;width:210px;background:rgba(4,4,10,.95);border:1px solid rgba(168,85,247,.35);border-radius:11px;padding:10px;backdrop-filter:blur(18px);box-shadow:0 12px 30px rgba(0,0,0,.4)}
    #morph-reskin-ui.open #morph-panel{display:block}.mr-title{font-size:9px;color:#c084fc;letter-spacing:.16em;margin-bottom:8px}.mr-file{display:block;border:1px dashed rgba(34,211,238,.35);border-radius:8px;padding:8px;text-align:center;color:#67e8f9;font-size:9px;cursor:pointer}.mr-file input{display:none}.mr-row,.mr-check{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:9px;color:#999}.mr-row input{width:48px;background:#090913;border:1px solid #27273a;color:#eee;border-radius:6px;padding:4px}.mr-row span{font-size:8px;color:#555}.mr-check input{width:auto}#morph-reset{width:100%;margin-top:8px;background:#151522;border:1px solid #33334a;color:#bbb;border-radius:7px;padding:6px;font:9px 'Space Mono',monospace}#morph-status{margin-top:7px;font-size:8px;line-height:1.5;color:#777;word-break:break-word}`;
    document.head.appendChild(style);
  }

  function attach({canvas,camera,agents}){
    state.sourceCanvas=canvas;state.camera=camera;state.agents=agents;
    const parent=canvas.parentElement;parent.style.position='relative';
    const skin=document.createElement('canvas');skin.id='morph-skin-canvas';
    parent.insertBefore(skin,canvas.nextSibling);state.canvas=skin;state.ctx=skin.getContext('2d');
    injectCss();makeUi(parent);resize();
    new ResizeObserver(resize).observe(canvas);
    return api;
  }

  function resize(){
    if(!state.canvas||!state.sourceCanvas)return;
    const w=Math.max(1,state.sourceCanvas.clientWidth),h=Math.max(1,state.sourceCanvas.clientHeight);
    const dpr=Math.min(root.devicePixelRatio||1,2);
    state.canvas.width=Math.round(w*dpr);state.canvas.height=Math.round(h*dpr);
    state.canvas.style.width=w+'px';state.canvas.style.height=h+'px';
    state.ctx.setTransform(dpr,0,0,dpr,0,0);state.dpr=dpr;state.cssW=w;state.cssH=h;
  }

  function updateStatus(text){if(state.status)state.status.textContent=text;}

  function setRigVisible(agent,visible){
    if(!agent?.mesh)return;
    agent.mesh.userData._morphRigVisible=!!visible;
    agent.mesh.traverse(obj=>{
      if(!obj.isMesh||obj===agent.auraMesh||!obj.material)return;
      const mats=Array.isArray(obj.material)?obj.material:[obj.material];
      mats.forEach(mat=>{
        if(mat.userData._morphOpacity===undefined)mat.userData._morphOpacity=mat.opacity===undefined?1:mat.opacity;
        mat.transparent=true;mat.opacity=visible?mat.userData._morphOpacity:0;mat.depthWrite=visible;
      });
    });
  }
  function syncRigVisibility(){if(!state.agents)return;state.agents.forEach(a=>setRigVisible(a,state.showRig));}

  function project(v){
    const p=v.clone().project(state.camera);
    return {x:(p.x*0.5+0.5)*state.cssW,y:(-p.y*0.5+0.5)*state.cssH,z:p.z};
  }

  function screenPose(agent){
    const base=agent.mesh.localToWorld(new THREE.Vector3(0,0,0));
    const center=agent.mesh.localToWorld(new THREE.Vector3(0,0.95,0));
    const top=agent.mesh.localToWorld(new THREE.Vector3(0,1.9,0));
    const pb=project(base),pc=project(center),pt=project(top);
    const height=clamp(Math.abs(pb.y-pt.y)*1.18,34,210);
    let facing=state.lastFacing.get(agent.id)||1;
    if(agent.vel&&agent.vel.lengthSq()>1e-6){
      const next=project(center.clone().add(agent.vel.clone().multiplyScalar(4)));
      if(Math.abs(next.x-pc.x)>0.2)facing=next.x>=pc.x?1:-1;
      state.lastFacing.set(agent.id,facing);
    }
    return{x:pc.x,y:pc.y,height,facing,depth:state.camera.position.distanceTo(center)};
  }

  function frameSelection(agent,t){
    const n=Math.max(1,state.frames.length);
    const mapped=agent.state==='walking'?'walk':agent.state==='talking'?'talk':agent.state==='meditating'||agent.state==='conflicting'?'express':'idle';
    let speed=0,base=0;
    if(mapped==='walk')speed=8;
    else if(mapped==='talk')speed=2.5;
    else if(mapped==='express')speed=1.3;
    else speed=.35;
    const raw=(t*speed+(agent.id||0)*0.73)%n;
    if(mapped==='idle'&&!state.custom){base=0;return{i:0,j:1%n,t:(Math.sin(t*1.5+(agent.id||0))+1)*0.08,mapped,phase:0};}
    const i=Math.floor(raw)%n,j=(i+1)%n,frac=raw-Math.floor(raw);
    return{i,j,t:frac,mapped,phase:(raw%n)/n};
  }

  function render(t){
    if(!state.ctx||!state.bitmap||!state.frames.length||!state.agents)return;
    const ctx=state.ctx;ctx.clearRect(0,0,state.cssW,state.cssH);
    const list=[];state.agents.forEach(agent=>{if(agent.mesh)list.push({agent,sp:screenPose(agent)});});
    list.sort((a,b)=>b.sp.depth-a.sp.depth);
    for(const{agent,sp}of list){
      if(!state.showRig && agent.mesh.userData._morphRigVisible!==false) setRigVisible(agent,false);
      if(state.showRig && agent.mesh.userData._morphRigVisible!==true) setRigVisible(agent,true);
      const sel=frameSelection(agent,t);const a=state.frames[sel.i],b=state.frames[sel.j];
      const aspect=a.sw/a.sh,w=sp.height*aspect,x=sp.x-w/2,y=sp.y-sp.height/2;
      SR().drawInterpolated(ctx,state.bitmap,a,b,sel.t,x,y,{width:w,height:sp.height,flipX:sp.facing,time:t,phase:sel.phase,walk:sel.mapped==='walk'?1:0,talk:sel.mapped==='talk'?1:0,express:sel.mapped==='express'?1:0});
    }
  }

  function boot(){
    if(!ML()||!SR())throw new Error('MorphReskin requires MorphEngineLib + SynthiaSpriteRuntime');
    buildDefaultSurfaceSheet();syncRigVisibility();
    return api;
  }

  const api={attach,boot,render,resize,syncRigVisibility,get state(){return state;}};
  root.MorphReskin=api;
})(typeof window!=='undefined'?window:globalThis);
