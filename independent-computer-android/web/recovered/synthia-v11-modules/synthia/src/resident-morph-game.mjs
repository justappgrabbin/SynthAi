const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,Number(n)||0));
const clampX=(n,min=-1.4,max=1.4)=>Math.max(min,Math.min(max,Number(n)||0));
const DIMS=['Movement','Evolution','Being','Design','Space'];
const POS=[-1.20,-.60,0,.60,1.20];

function microFromProfile(calculated){
  const a=calculated?.humanDesign?.personality?.find?.(x=>x.planet==='Sun') || calculated?.humanDesign?.personality?.[0] || null;
  if(!a)return null;
  return {gate:Number(a.gate),line:Number(a.line),color:Number(a.color),tone:Number(a.tone),base:Number(a.base)};
}

export class ResidentMorphUnitAdapter{
  constructor(runtime){
    if(!runtime?.computer?.foundation)throw new TypeError('live DesktopRuntime required');
    this.runtimeHost=runtime;this.foundation=runtime.computer.foundation;this.runtime={getRegisteredTools:()=>this.foundation.tools?.()||[]};
    this.morphs=new Map();this._patterns=new Map();this._events=[];this.profile={};this.isoId='isohuman:resident';this.visualFocus='Being';
    this.memory={
      get:(bucket,key)=>bucket==='patterns'&&this._patterns.has(key)?{value:this._patterns.get(key)}:null,
      upsert:(bucket,key,value)=>{if(bucket==='patterns'){this._patterns.set(key,structuredClone(value));this._persist().catch(()=>{});}return value;},
      remember:(bucket,value)=>{if(bucket==='events'){this._events.push(structuredClone(value));if(this._events.length>128)this._events.shift();this._land(value).catch(()=>{});}return value;},
      snapshot:()=>({patterns:[...this._patterns].map(([key,value])=>({key,value})),events:structuredClone(this._events)})
    };
    this.metabolism={snapshot:()=>this._metabolism()};
    this.living={snapshot:()=>({running:true,pulseCount:this.foundation.history?.length||0,lastPulseAt:Date.now()})};
    this.rules={snapshot:()=>({events:(this.foundation.history||[]).slice(-32).map(e=>({permit:e.result?.ok!==false,type:e.kind||'event',ruleHash:e.result?.record?.fingerprint||null}))})};
  }
  async init(){
    const saved=await this.runtimeHost.store.get('resonance:morph-game');
    if(saved?.patterns)for(const [k,v] of Object.entries(saved.patterns))this._patterns.set(k,v);
    if(Array.isArray(saved?.events))this._events=saved.events.slice(-128);
    const calculated=await this.runtimeHost.store.get('resonance:calculated-profile');
    const pair=await this.runtimeHost.store.get('resonance:pair');
    this.isoId=pair?.isoId||this.foundation.swarm?.snapshot?.().identity?.id||'synthia';
    this.profile={micro:microFromProfile(calculated)};
    this.pairAddress=pair?.canonicalAddress||null;
    return this;
  }
  _metabolism(){
    const recent=(this.foundation.history||[]).slice(-24);const ok=recent.filter(e=>e.result?.ok!==false).length;const fail=recent.length-ok;
    const swarm=this.foundation.swarm?.snapshot?.()||{};
    return {vitality:recent.length?ok/recent.length:.68,repairPressure:recent.length?fail/recent.length:0,adaptationBudget:clamp((swarm.pending?.length||0)/8),totalReplenished:clamp((swarm.completedCount||0)/32)*2};
  }
  resolveAddress(){
    const canonical=this.pairAddress || [...(this.foundation.history||[])].reverse().find(e=>e.result?.outcome?.canonicalAddress)?.result?.outcome?.canonicalAddress || null;
    return {canonical:canonical||{gate:this.profile.micro?.gate||1,line:this.profile.micro?.line||1,color:this.profile.micro?.color||1,tone:this.profile.micro?.tone||1,base:this.profile.micro?.base||1}};
  }
  structuralKey(){return this.isoId;}
  async _persist(){await this.runtimeHost.store.put('resonance:morph-game',{patterns:Object.fromEntries(this._patterns),events:this._events.slice(-128)});}
  async _land(value){
    await this._persist();
    try{await this.foundation.ingest({kind:'resident-morph-game',agentId:this.isoId,event:value},{name:'resident-morph-game.json',source:'agentic-reality',matterOwner:this.isoId});}catch{}
  }
}

export class ResidentPhenotypeResolver{
  resolve(unit){
    const address={...(unit.profile?.micro||unit.resolveAddress()?.canonical||{})};
    const gate=Math.max(1,Math.min(64,Number(address.gate)||1));
    const state=unit.foundation?.stateSpace?.address?.(gate)||{};
    const dimensions={};
    for(const name of DIMS){
      const layer=unit.foundation?.stateSpace?.dimensions?.[name];
      const idx=layer?.nodes?.findIndex?.(n=>n.gate===gate)??-1;
      dimensions[name]=idx>=0?idx/63:.5;
    }
    const activity=unit._metabolism();
    return {
      source:'resident-foundation-render-adapter',structuralKey:unit.structuralKey(),address,dimensions,
      dominantDimension:unit.visualFocus||'Being',state:'resident',vitality:activity.vitality,repairPressure:activity.repairPressure,adaptationBudget:activity.adaptationBudget,
      perspective:{part:1,whole:1,proportion:1},anatomy:{toolCount:unit.foundation?.tools?.().length||0,morphCount:0},
      proportions:{height:1,chest:1,shoulders:1,waist:1,hips:1},
      motion:{breathHz:.9,breathDepth:.018,sway:.025+activity.repairPressure*.03,headTurn:.06},
      material:{baseColor:'#c7b7d9',glowColor:'#8df0d0',emissive:.30},
      glyphs:[`G${address.gate||1}`,`L${address.line||1}`,`C${address.color||1}`,`T${address.tone||1}`,`B${address.base||1}`],
      evidence:{renderingConvention:'neutral body; address and resident state are authoritative',stateSpacePositions:dimensions}
    };
  }
}

class ResidentBodyCanvas{
  constructor({container,unit,resolver}){this.container=container;this.unit=unit;this.resolver=resolver;this.ready=false;this.mode='canvas';this.gameState={playerX:0,targets:[],handAction:'idle',score:0};this._raf=0;}
  init(){if(!this.container)return false;this.container.innerHTML='<canvas class="morph-canvas morph-canvas-fallback" aria-label="Live resident morph body"></canvas><div class="morph-hud"></div>';this.canvas=this.container.querySelector('canvas');this.hud=this.container.querySelector('.morph-hud');this.ctx=this.canvas.getContext('2d');this.ready=Boolean(this.ctx);this.resize();if(typeof ResizeObserver!=='undefined'){this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(this.container)}this.update();this.animate();return this.ready;}
  setGameState(s={}){this.gameState={...this.gameState,...s};this.unit.visualFocus=this.gameState.activeDimension||this.unit.visualFocus;this.update();}
  update(){this.phenotype=this.resolver.resolve(this.unit);if(this.hud){const p=this.phenotype;this.hud.innerHTML=`<b>${p.structuralKey}</b><br>${p.glyphs.join(' · ')}<br><small>same resident · swarm cycle ${this.unit.foundation.swarm?.snapshot?.().cycle||0} · ${this.unit.foundation.history?.length||0} landed events</small>`;}}
  resize(){if(!this.canvas)return;const w=Math.max(260,this.container.clientWidth||360),h=Math.max(300,Math.min(520,this.container.clientHeight||420)),d=Math.min(globalThis.devicePixelRatio||1,2);this.canvas.width=Math.round(w*d);this.canvas.height=Math.round(h*d);this.canvas.style.width=w+'px';this.canvas.style.height=h+'px';this.ctx?.setTransform(d,0,0,d,0,0);}
  hand(c,side,x,y){const reach=this.gameState.handAction==='reach'?22:this.gameState.handAction==='receive'?8:0;c.save();c.translate(x+side*reach,y-(reach*.2));c.fillStyle='#c7b7d9';c.fillRect(side<0?-12:0,-7,12,15);c.strokeStyle=c.fillStyle;c.lineWidth=4;for(let i=0;i<5;i++){const spread=(i-2)*2.2;c.beginPath();c.moveTo(side<0?-10:10,spread);c.lineTo((side<0?-1:1)*(this.gameState.handAction==='receive'?22:18),spread+(this.gameState.handAction==='receive'?-3:3));c.stroke()}c.restore();}
  draw(){const c=this.ctx;if(!c)return;const w=this.canvas.clientWidth||360,h=this.canvas.clientHeight||420,t=performance.now()/1000,p=this.phenotype||this.resolver.resolve(this.unit),px=w/2+(Number(this.gameState.playerX)||0)*(w*.22);c.clearRect(0,0,w,h);const bg=c.createRadialGradient(w*.5,h*.35,20,w*.5,h*.48,w*.7);bg.addColorStop(0,'#8df0d033');bg.addColorStop(1,'#09090d');c.fillStyle=bg;c.fillRect(0,0,w,h);
    for(const target of this.gameState.targets||[]){const x=w/2+target.x*(w*.22),y=h*.22+Math.sin(t*2+target.x)*5;c.beginPath();c.arc(x,y,target.active?12:7,0,Math.PI*2);c.fillStyle=target.active?'#f1d27b':'#5d5870';c.fill();if(target.active){c.font='11px system-ui';c.textAlign='center';c.fillStyle='#f5e8bf';c.fillText(target.dimension,x,y-18)}}
    const cy=h*.59,breath=1+Math.sin(t*Math.PI*2*.9)*.015;c.save();c.translate(px,cy);c.fillStyle=p.material.baseColor;c.strokeStyle=p.material.baseColor;c.globalAlpha=.98;c.beginPath();c.ellipse(0,-52,48*breath,76,0,0,Math.PI*2);c.fill();c.beginPath();c.arc(0,-145,27,0,Math.PI*2);c.fill();c.lineWidth=18;c.beginPath();c.moveTo(-38,-82);c.lineTo(-64,-30);c.lineTo(-72,28);c.moveTo(38,-82);c.lineTo(64,-30);c.lineTo(72,28);c.stroke();c.lineWidth=22;c.beginPath();c.moveTo(-22,10);c.lineTo(-28,88);c.lineTo(-30,154);c.moveTo(22,10);c.lineTo(28,88);c.lineTo(30,154);c.stroke();this.hand(c,-1,-72,28);this.hand(c,1,72,28);c.restore();}
  animate(){if(!this.ready)return;this._raf=requestAnimationFrame(()=>this.animate());this.draw();}
  destroy(){cancelAnimationFrame(this._raf);this.ro?.disconnect?.();}
}

class ResidentMorphGameEngine{
  constructor({unit,resolver,renderer}){this.unit=unit;this.resolver=resolver;this.renderer=renderer;const saved=unit.memory.get('patterns','morph-game-progress')?.value||{};this.state={playerX:clampX(saved.playerX??0),score:Number(saved.score)||0,round:Number(saved.round)||0,hits:Number(saved.hits)||0,misses:Number(saved.misses)||0,handAction:'idle',lastResult:'Move toward the highlighted dimensional position and reach.'};this.syncFromUnit();}
  syncFromUnit(){this.phenotype=this.resolver.resolve(this.unit);const seed=Math.max(0,(Number(this.phenotype.address?.gate)||1)-1),activeIndex=(seed+this.state.round)%DIMS.length;this.targets=DIMS.map((dimension,i)=>({dimension,x:POS[i],active:i===activeIndex,collected:false,position:this.phenotype.dimensions[dimension]}));this.state.activeDimension=DIMS[activeIndex];this.state.activeX=POS[activeIndex];this.push();return this.snapshot();}
  move(direction){const d=Math.sign(Number(direction)||0);if(!d)return this.snapshot();this.state.playerX=clampX(this.state.playerX+d*.30);this.state.handAction='idle';this.state.lastResult=d<0?'Moved left.':'Moved right.';this.persist();this.push();return this.snapshot();}
  reach(){const target=this.targets.find(x=>x.active),distance=Math.abs(this.state.playerX-target.x),hit=distance<=.34;this.state.handAction='reach';if(hit){this.state.score+=10;this.state.hits++;this.state.round++;this.state.lastResult=`Reached the ${target.dimension} position.`;}else{this.state.misses++;this.state.lastResult=`Missed by ${distance.toFixed(2)}. Move closer to ${target.dimension}.`;}
    this.unit.memory.remember('events',{intent:'resident-morph-game',action:'reach',result:hit?'hit':'miss',dimension:target.dimension,distance,score:this.state.score,address:{...this.phenotype.address},evidence:{source:'r21.22-renderer-transplant',at:Date.now()}});this.persist();if(hit)this.syncFromUnit();else this.push();return {hit,distance,...this.snapshot()};}
  receive(){this.state.handAction='receive';this.state.lastResult='Receiving posture. The resident foundation remains authoritative.';this.unit.memory.remember('events',{intent:'resident-morph-game',action:'receive',address:{...this.phenotype.address},at:Date.now()});this.push();return this.snapshot();}
  persist(){this.unit.memory.upsert('patterns','morph-game-progress',{playerX:this.state.playerX,score:this.state.score,round:this.state.round,hits:this.state.hits,misses:this.state.misses,at:Date.now()});}
  push(){this.renderer?.setGameState?.({playerX:this.state.playerX,targets:this.targets,handAction:this.state.handAction,score:this.state.score,activeDimension:this.state.activeDimension,lastResult:this.state.lastResult});}
  snapshot(){return {state:{...this.state},targets:this.targets.map(x=>({...x})),phenotype:this.phenotype};}
}

export class ResidentMorphGame{
  constructor({root,runtime}){this.root=root;this.runtime=runtime;this.ready=false;}
  async init(){if(!this.root)return false;this.root.innerHTML=`<div class="morph-game-shell"><div class="morph-game-head"><div><b>Morph Resonance · live resident</b><small>R21.22 renderer transplanted onto the Computer foundation — no second Cynthia</small></div><span class="morph-live-dot" title="same resident"></span></div><div class="morph-game-render"></div><div class="morph-game-readout" aria-live="polite"></div><div class="morph-game-controls"><button type="button" data-move="-1" aria-label="Move left">◀</button><button type="button" data-reach="1" class="primary">Reach</button><button type="button" data-receive="1">Receive</button><button type="button" data-move="1" aria-label="Move right">▶</button><button type="button" data-sync="1">Sync</button></div></div>`;
    this.unit=await new ResidentMorphUnitAdapter(this.runtime).init();this.resolver=new ResidentPhenotypeResolver();this.renderer=new ResidentBodyCanvas({container:this.root.querySelector('.morph-game-render'),unit:this.unit,resolver:this.resolver});this.renderer.init();this.engine=new ResidentMorphGameEngine({unit:this.unit,resolver:this.resolver,renderer:this.renderer});
    this.root.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{this.engine.move(Number(b.dataset.move));this.renderHud();});this.root.querySelector('[data-reach]').onclick=()=>{this.engine.reach();this.renderHud();setTimeout(()=>{if(this.engine){this.engine.state.handAction='idle';this.engine.push();this.renderHud();}},420)};this.root.querySelector('[data-receive]').onclick=()=>{this.engine.receive();this.renderHud();};this.root.querySelector('[data-sync]').onclick=async()=>{await this.unit.init();this.engine.syncFromUnit();this.renderer.update();this.renderHud();};this.root.tabIndex=0;this.root.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a'){e.preventDefault();this.engine.move(-1);this.renderHud()}if(e.key==='ArrowRight'||e.key.toLowerCase()==='d'){e.preventDefault();this.engine.move(1);this.renderHud()}if(e.key===' '||e.key==='Enter'){e.preventDefault();this.engine.reach();this.renderHud()}};this.ready=true;this.renderHud();return true;
  }
  renderHud(){const x=this.engine.snapshot(),p=this.resolver.resolve(this.unit),r=this.root.querySelector('.morph-game-readout');if(r)r.innerHTML=`<b>${x.state.activeDimension}</b> position · score ${x.state.score} · hits ${x.state.hits} · misses ${x.state.misses}<br><span>${x.state.lastResult}</span><br><small>${p.glyphs.join(' · ')} · actions land into the same Foundation journal</small>`;}
  snapshot(){return {ready:this.ready,...this.engine?.snapshot?.()};}
  destroy(){this.renderer?.destroy?.();}
}
export default ResidentMorphGame;
