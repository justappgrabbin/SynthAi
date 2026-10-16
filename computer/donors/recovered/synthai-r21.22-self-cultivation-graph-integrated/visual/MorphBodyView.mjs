export class MorphBodyView{
  constructor({container,unit,resolver}={}){this.container=container;this.unit=unit;this.resolver=resolver;this.ready=false;this.body={parts:{}};this.overrides={};this._raf=0;this._lastPhenotype=null;}
  async init(){
    if(!this.container)return false;
    this.container.innerHTML='<div class="morph-loading">forming visible body…</div>';
    try{
      const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.161.0/+esm');
      const {OrbitControls}=await import('https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js');
      this.THREE=THREE;
      this.container.innerHTML='<canvas class="morph-canvas"></canvas><div class="morph-hud"></div>';
      this.canvas=this.container.querySelector('canvas');this.hud=this.container.querySelector('.morph-hud');
      this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:true});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
      this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x0b0b0f);
      this.camera=new THREE.PerspectiveCamera(42,1,.1,100);this.camera.position.set(0,1.5,3.8);
      this.controls=new OrbitControls(this.camera,this.canvas);this.controls.enableDamping=true;this.controls.target.set(0,1.05,0);
      this.scene.add(new THREE.AmbientLight(0x88aaff,.38));
      const key=new THREE.DirectionalLight(0xffffff,1.15);key.position.set(2,4,3);this.scene.add(key);
      this.glowLight=new THREE.PointLight(0xffffff,1.4,8);this.glowLight.position.set(0,1.4,.4);this.scene.add(this.glowLight);
      const ground=new THREE.Mesh(new THREE.CircleGeometry(5,64),new THREE.MeshStandardMaterial({color:0x15151a,metalness:.05,roughness:.92}));ground.rotation.x=-Math.PI/2;ground.position.y=.02;this.scene.add(ground);
      this.rig=new THREE.Group();this.scene.add(this.rig);this.ready=true;this.update(true);this.resize();
      new ResizeObserver(()=>this.resize()).observe(this.container);
      this.animate();return true;
    }catch(error){this.container.innerHTML=`<div class="morph-loading">3D body unavailable offline until Three.js is vendored.<br><small>${String(error?.message||error)}</small></div>`;return false;}
  }
  capsule(radius,length){return new this.THREE.CapsuleGeometry(radius,Math.max(.01,length-radius*2),16,10)}
  disposeRig(){if(!this.rig)return;for(const child of [...this.rig.children]){child.geometry?.dispose?.();if(Array.isArray(child.material))child.material.forEach(m=>m.dispose?.());else child.material?.dispose?.();this.rig.remove(child)}this.body.parts={};}
  build(p){
    const T=this.THREE;this.disposeRig();
    const mat=()=>new T.MeshStandardMaterial({color:new T.Color(p.material.baseColor),metalness:.04,roughness:.44,emissive:new T.Color(p.material.glowColor),emissiveIntensity:p.material.emissive});
    const add=(name,geometry,pos,scale=[1,1,1])=>{const mesh=new T.Mesh(geometry,mat());mesh.position.set(...pos);mesh.scale.set(...scale);this.rig.add(mesh);this.body.parts[name]=mesh;return mesh};
    const q=p.proportions;
    add('torso',this.capsule(.23,.68),[0,1.1,0],[q.chest,1,1]);
    add('pelvis',new T.SphereGeometry(.23,20,14),[0,.82,0],[q.hips,1,q.hips]);
    add('neck',this.capsule(.085,.16),[0,1.39,0]);add('head',new T.SphereGeometry(.16,24,18),[0,1.53,0]);
    const sw=.34*q.shoulders;
    for(const [s,n] of [[-1,'L'],[1,'R']]){add(`uArm${n}`,this.capsule(.085,.30),[s*sw,1.27,0]);add(`fArm${n}`,this.capsule(.072,.28),[s*sw,1.04,0]);add(`hand${n}`,new T.SphereGeometry(.068,16,12),[s*sw,.86,.02]);}
    const hw=.18*q.hips;
    for(const [s,n] of [[-1,'L'],[1,'R']]){add(`thigh${n}`,this.capsule(.11,.40),[s*hw,.67,0]);add(`calf${n}`,this.capsule(.09,.38),[s*hw,.38,0]);add(`foot${n}`,new T.BoxGeometry(.17,.06,.28),[s*hw,.13,.11]);}
    this.rig.scale.setScalar(q.height);this.glowLight.color.set(p.material.glowColor);
  }
  update(force=false){if(!this.ready)return;const p=this.resolver.resolve(this.unit,{overrides:this.overrides});const key=JSON.stringify({p:p.proportions,m:p.material,d:p.dominantDimension,s:p.state,g:p.glyphs});if(force||key!==this._renderKey){this.build(p);this._renderKey=key}this._lastPhenotype=p;if(this.hud)this.hud.innerHTML=`<b>${p.structuralKey||'unresolved residence'}</b><br>${p.dominantDimension} · ${p.state}<br><small>${p.glyphs.join(' · ')} · ${p.anatomy.toolCount} tools · perspective ${p.perspective.part}:${p.perspective.whole}</small>`;}
  setOverride(name,value){if(value==null||value==='')delete this.overrides[name];else this.overrides[name]=Number(value);this.update(true)}
  clearOverrides(){this.overrides={};this.update(true)}
  resize(){if(!this.ready)return;const w=Math.max(220,this.container.clientWidth),h=Math.max(280,this.container.clientHeight);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  animate(){if(!this.ready)return;this._raf=requestAnimationFrame(()=>this.animate());const p=this._lastPhenotype||this.resolver.resolve(this.unit);const t=performance.now()/1000;const torso=this.body.parts.torso;if(torso)torso.scale.y=1+p.motion.breathDepth*Math.sin(t*Math.PI*2*p.motion.breathHz);if(this.rig)this.rig.rotation.y=Math.sin(t*.55)*p.motion.sway;if(this.body.parts.head)this.body.parts.head.rotation.y=Math.sin(t*.8)*p.motion.headTurn;this.controls.update();this.renderer.render(this.scene,this.camera)}
}
export default MorphBodyView;
