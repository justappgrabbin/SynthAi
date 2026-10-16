const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const point=(gate,{cx=160,cy=132,spread=116}={})=>{const a=gate*2.399963229728653,r=18+Math.sqrt(gate/64)*spread;return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];};
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));

function surface(morph,field){
  const active=new Set(field?.organism?.activeLoci||[]),relations=field?.relations||[];
  const motion=clamp(morph?.behavior?.motion),coherence=clamp(morph?.habitat?.coherence),openness=clamp(morph?.habitat?.openness),density=clamp(morph?.habitat?.density);
  const lines=relations.slice(0,28).map(r=>{const [x1,y1]=point(r.participants[0]),[x2,y2]=point(r.participants[1]);const bend=(.5-openness)*90;return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q${(160+bend).toFixed(1)} ${(132-bend/2).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" opacity="${(.08+clamp(r.strength)*.44).toFixed(2)}"/>`;}).join('');
  const nodes=[...active].slice(0,16).map(g=>{const [x,y]=point(g,{spread:96+28*openness});const rr=4+10*(g===field.activeGate?1:.35)+4*density;return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" data-gate="${g}"/>`;}).join('');
  if(morph?.mode==='body'){
    const waist=42+34*coherence,top=28+20*openness,bottom=58+24*density;
    return `<g class="morphic-body"><path d="M160 ${24+top/2} C${160-waist} 64 ${160-waist} 190 160 ${238-bottom/4} C${160+waist} 190 ${160+waist} 64 160 ${24+top/2}Z"/><g class="relation-web">${lines}</g><g class="active-nodes">${nodes}</g></g>`;
  }
  if(morph?.mode==='habitat'){
    const rx=110+30*openness,ry=72+38*coherence;return `<g class="morphic-habitat"><ellipse cx="160" cy="132" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}"/><g class="relation-web">${lines}</g><g class="active-nodes">${nodes}</g></g>`;
  }
  if(morph?.mode==='symbol'){
    const turns=3+Math.round(4*motion);let d='';for(let i=0;i<turns*18;i++){const a=i*.34,r=4+i*(5+8*openness)/18,x=160+Math.cos(a)*r,y=132+Math.sin(a)*r;d+=`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)} `;}return `<g class="morphic-symbol"><path d="${d}"/><g class="active-nodes">${nodes}</g></g>`;
  }
  return `<g class="morphic-field"><g class="relation-web">${lines}</g><g class="active-nodes">${nodes}</g></g>`;
}

export class LivingWorldView{
  constructor({root,unit}={}){this.root=root;this.unit=unit;}
  render(expression=null){
    if(!this.root)return;
    const e=expression||globalThis.SynthiaExpression?.resolve?.('')||null;
    const field=e?.field||this.unit.processField?.evaluate?.(this.unit,{cycle:this.unit.cultivationProgram.current()});
    const morph=e?.morph||this.unit.morphicExpression?.resolve?.({field,recursive:this.unit.recursiveField?.resolve?.(field)});
    const cycle=this.unit.cultivationProgram.current();const order=['Space','Evolution','Being','Movement','Design'];const gates=field?.gates||[],relations=field?.relations||[],organism=field?.organism||{};
    const inspector=gates.map(g=>`<tr class="${g.active?'hot':''}"><th>G${g.gate}</th>${order.map(d=>`<td title="${d} · ${esc(g.decisions[d].choice)}">${esc(g.decisions[d].choice)}</td>`).join('')}</tr>`).join('');
    const relationInspector=relations.slice(0,24).map(r=>`<div class="relation-row"><b>G${r.participants[0]} ↔ G${r.participants[1]}</b><span>${esc(r.overlap?.join(', ')||'encounter')} · ${Number(r.strength||0).toFixed(2)}</span></div>`).join('');
    this.root.innerHTML=`<div class="synthia-field" data-morph="${esc(morph?.mode||'field')}">
      <svg class="organism-surface" viewBox="0 0 320 264" role="img" aria-label="Synthia — current organism-level expression">
        ${surface(morph,field)}
      </svg>
      <div class="field-caption"><strong>${esc(cycle?.goal||'Synthia')}</strong><span>${esc(cycle?.inquiry?.question||`Current expression: ${morph?.mode||'field'} · generated from organism state`)}</span></div>
      <details class="process-inspector"><summary>Move inward / inspect recursive levels</summary>
        <div class="organism-facts"><span>64 persistent gate automata</span><span>${relations.length} current relation fields</span><span>${esc(morph?.mode||'field')} at organism level</span></div>
        <div class="dim-key">${order.map(d=>`<span><b>${field?.dimensions?.[d]?.question||''}</b> ${d} · ${field?.dimensions?.[d]?.voices||0} voices</span>`).join('')}</div>
        <details><summary>Process choices</summary><div class="gate-scroll"><table><thead><tr><th>Gate</th>${order.map(d=>`<th>${field?.dimensions?.[d]?.question||d}</th>`).join('')}</tr></thead><tbody>${inspector}</tbody></table></div></details>
        <details><summary>Relations</summary><div class="relation-list">${relationInspector||'<span class="muted">No co-active relation field yet.</span>'}</div></details>
        <details><summary>Recursive scale model</summary><pre>${esc(JSON.stringify(e?.recursive||this.unit.recursiveField?.snapshot?.(),null,2))}</pre></details>
      </details>
    </div>`;
    return {identity:'Synthia',gateCount:gates.length,relationCount:relations.length,morph:morph?.mode||'field'};
  }
}
export default LivingWorldView;
