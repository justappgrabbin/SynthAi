const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const forms = new Set(['text', 'chair', 'house', 'body', 'person', 'world', 'page']);
const lerp = (a,b,t) => a+(b-a)*t;

// Projection only: the composition graph remains the authority for identity.
export function constituentOccurrences(node) {
  if (!node) throw new Error('Unknown composition');
  if (node.kind === 'occurrence') return [node];
  return node.members.flatMap(({member}) => constituentOccurrences(member));
}
export function wordConstituents(node) {
  const words=[];let current=[];
  for(const occurrence of constituentOccurrences(node)) {
    if (/^\s+$/u.test(occurrence.symbol)) {if(current.length)words.push(current);current=[];}
    else current.push(occurrence);
  }
  if(current.length)words.push(current);
  return words.map((members,index)=>({id:JSON.stringify(members.map(m=>m.id)),membership:index,
    symbol:members.map(m=>m.symbol).join(''),members}));
}
const inside=(x,y,form)=>{
  if(form==='chair')return (x>=265&&x<=315&&y>=180&&y<=380)||(x>=265&&x<=535&&y>=350&&y<=395)||((x>=280&&x<=325||x>=480&&x<=525)&&y>=395&&y<=525);
  if(form==='house')return (x>=225&&x<=575&&y>=320&&y<=525)||(y>=170&&y<=320&&Math.abs(x-400)<(y-170)*1.5);
  if(form==='body'||form==='person')return ((x-400)**2+(y-205)**2<45**2)||(x>=345&&x<=455&&y>=250&&y<=400)||((x>=320&&x<=370||x>=430&&x<=480)&&y>=400&&y<=535)||(y>=285&&y<=330&&x>=255&&x<=545);
  if(form==='world')return y>=420&&y<=540&&x>=90&&x<=710||(x>=140&&x<=260&&y>=300&&y<=420)||(x>=490&&x<=650&&y>=220&&y<=420);
  return x>=225&&x<=575&&y>=170&&y<=525;
};
export function dimensionalOffset(dimension,progress,rules={}) {
  const remaining=1-progress;
  const vector=dimension==='Movement'?[0,100]:dimension==='Being'?[-100,0]:rules[dimension]??[0,0];
  if(!Array.isArray(vector)||vector.length!==2||vector.some(v=>!Number.isFinite(v)))throw new Error('A dimensional direction requires two finite components');
  return {x:vector[0]*remaining,y:vector[1]*remaining};
}
export function morphFrame(node, {form='text', progress=1, resolveState=null,directionRules={},sensory=null}={}) {
  if (!forms.has(form)) throw new Error(`Unsupported form: ${form}`);
  if (!Number.isFinite(progress) || progress<0 || progress>1) throw new Error('Progress must be between zero and one');
  const words=wordConstituents(node);
  const cells=[];
  if(form==='text') words.forEach((word,i)=>cells.push({x:80+(i%7)*95,y:100+Math.floor(i/7)*40,word}));
  else if(words.length)for(let y=170;y<=540;y+=14)for(let x=90;x<=710;x+=28)if(inside(x,y,form))cells.push({x,y,word:words[cells.length%words.length]});
  return cells.map(({x,y,word},index)=>{
    const states=word.members.map(occurrence=>resolveState?resolveState(occurrence,{form,composition:node,sensory}):null);
    for(const state of states)if(state?.holdingStrength!=null&&(!Number.isFinite(state.holdingStrength)||state.holdingStrength<0||state.holdingStrength>1))throw new Error('Resolved holding strength must be between zero and one');
    const support=Math.min(...states.map(state=>state?.holdingStrength??1));
    const dimensions=[...new Set(word.members.map((m,i)=>states[i]?.dimension??m.address?.dimension).filter(Boolean))];
    // Mixed dimensions require the host's composition resolver; no majority vote.
    const dimension=dimensions.length===1?dimensions[0]:null;
    const offset=dimensionalOffset(dimension,progress,directionRules);
    const strain=form==='text'?0:(1-support)*progress;
    return {id:word.id,membership:word.membership,placement:index,symbol:word.symbol,
      constituentIds:word.members.map(m=>m.id),addresses:word.members.map(m=>structuredClone(m.address)),states:structuredClone(states),dimension,
      x:x+offset.x+Math.sin(index*1.7)*strain*24,y:y+offset.y+strain*(550-y),opacity:1,support};
  });
}
export class SwarmMorphView {
  constructor({root,graph,resolveState=null,duration=900,directionRules={},readSensory=null}={}) {
    if(!root||!graph) throw new TypeError('root and composition graph required');
    this.root=root;this.graph=graph;this.resolveState=resolveState;this.duration=duration;this.frame=null;this.directionRules=directionRules;this.revealWords=false;this.request=null;this.readSensory=readSensory;
  }
  setWordFilter(enabled){this.revealWords=Boolean(enabled);if(this.request)return this.render(this.request);}
  render({compositionId,form='text',progress=1}={}) {
    this.request={compositionId,form,progress};
    const node=this.graph.get(compositionId);
    const particles=morphFrame(node,{form,progress,resolveState:this.resolveState,directionRules:this.directionRules,sensory:this.readSensory?.()??null});
    const reveal=this.revealWords||form==='text';
    // Every opaque surface patch is a placement of a word composition.
    // Both modes use identical placements; the filter changes presentation only.
    const patches=particles.map(p=>{
      const attrs=`data-word-id="${esc(p.id)}" data-placement="${p.placement}" data-constituents="${esc(JSON.stringify(p.constituentIds))}"`;
      return `<g ${attrs} transform="translate(${p.x} ${p.y})">${reveal?`<text fill="#ffe7bd" font-family="monospace" font-size="13" textLength="32" lengthAdjust="spacingAndGlyphs">${esc(p.symbol)}</text>`:`<rect x="-1" y="-13" width="31" height="17" fill="rgb(${115+p.placement%17},${65+p.placement%11},${145+p.placement%23})"/><path d="M0 3 V-12 H29" fill="none" stroke="#cf9cdf" stroke-width=".6"/>`}</g>`;
    }).join('');
    this.root.innerHTML=`<svg viewBox="0 0 800 600" role="img" aria-label="${reveal?'Word filter':'Opaque swarm scene'}: ${esc(form)}" style="width:100%;height:100%;min-height:60vh;background:#100b24">${patches}</svg>`;
    return {compositionId,form,particles};
  }
  morph(request) {
    this.stop();
    // Validate before scheduling a frame.
    this.render({...request,progress:0});
    const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(reduced||typeof globalThis.requestAnimationFrame!=='function') return this.render({...request,progress:1});
    let start;
    const tick=time=>{start??=time;const t=Math.min(1,(time-start)/Math.max(1,this.duration));this.render({...request,progress:t*t*(3-2*t)});this.frame=t<1?requestAnimationFrame(tick):null;};
    this.frame=requestAnimationFrame(tick);
  }
  stop(){if(this.frame!==null)globalThis.cancelAnimationFrame?.(this.frame);this.frame=null;}
}
export default SwarmMorphView;
