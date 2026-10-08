const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const forms = new Set(['text', 'chair', 'house', 'body', 'world', 'page']);
const lerp = (a,b,t) => a+(b-a)*t;

// Projection only: the composition graph remains the authority for identity.
export function constituentOccurrences(node) {
  if (!node) throw new Error('Unknown composition');
  if (node.kind === 'occurrence') return [node];
  return node.members.flatMap(({member}) => constituentOccurrences(member));
}
export function morphFrame(node, {form='text', progress=1, resolveState=null}={}) {
  if (!forms.has(form)) throw new Error(`Unsupported form: ${form}`);
  if (!Number.isFinite(progress) || progress<0 || progress>1) throw new Error('Progress must be between zero and one');
  const occurrences=constituentOccurrences(node);
  const lines={chair:[[280,200,280,370],[280,370,500,370],[300,370,300,510],[480,370,480,510]],
    house:[[200,340,400,170],[400,170,600,340],[240,340,240,520],[240,520,560,520],[560,520,560,340]],
    body:[[400,210,400,400],[400,280,270,370],[400,280,530,370],[400,400,310,530],[400,400,490,530]],
    page:[[220,160,580,160],[580,160,580,520],[580,520,220,520],[220,520,220,160],[270,270,530,270],[270,350,530,350]]};
  return occurrences.map((occurrence,index)=>{
    const start={x:100+(index%30)*20,y:90+Math.floor(index/30)*26};
    let target=start;
    if(lines[form]) {
      const u=index/Math.max(1,occurrences.length-1)*lines[form].length;
      const segment=lines[form][Math.min(lines[form].length-1,Math.floor(u))];
      const t=Math.min(1,u-Math.min(lines[form].length-1,Math.floor(u)));
      target={x:lerp(segment[0],segment[2],t),y:lerp(segment[1],segment[3],t)};
    } else if(form==='world') {
      const angle=index*2.3999632297, radius=35+220*Math.sqrt(index/Math.max(1,occurrences.length-1));
      target={x:400+Math.cos(angle)*radius,y:340+Math.sin(angle)*radius*.65};
    }
    const state=resolveState ? resolveState(occurrence,{form,composition:node}) : null;
    if(state?.holdingStrength!=null && (!Number.isFinite(state.holdingStrength)||state.holdingStrength<0||state.holdingStrength>1)) throw new Error('Resolved holding strength must be between zero and one');
    // A weak connection remains represented; it never deletes a constituent.
    const support=state?.holdingStrength??1;
    const strain=form==='text'?0:(1-support)*progress;
    return {id:occurrence.id,membership:index,symbol:occurrence.symbol,address:structuredClone(occurrence.address),state:state==null?null:structuredClone(state),
      x:lerp(start.x,target.x,progress)+Math.sin(index*1.7)*strain*24,
      y:lerp(start.y,target.y,progress)+strain*(520-target.y),opacity:.35+.65*support};
  });
}
export class SwarmMorphView {
  constructor({root,graph,resolveState=null,duration=900}={}) {
    if(!root||!graph) throw new TypeError('root and composition graph required');
    this.root=root;this.graph=graph;this.resolveState=resolveState;this.duration=duration;this.frame=null;
  }
  render({compositionId,form='text',progress=1}={}) {
    const node=this.graph.get(compositionId);
    const particles=morphFrame(node,{form,progress,resolveState:this.resolveState});
    this.root.innerHTML=`<svg viewBox="0 0 800 600" role="img" aria-label="Swarm expressing ${esc(form)}" style="width:100%;height:100%;min-height:60vh;background:#100b24;color:#ff77d8"><g fill="currentColor" font-family="monospace" font-size="18">${particles.map(p=>`<text data-occurrence-id="${esc(p.id)}" data-membership="${p.membership}" x="${p.x}" y="${p.y}" opacity="${p.opacity}">${esc(p.symbol)}</text>`).join('')}</g></svg>`;
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
