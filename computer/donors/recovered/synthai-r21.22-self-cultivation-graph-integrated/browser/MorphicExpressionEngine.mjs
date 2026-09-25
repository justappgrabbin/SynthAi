const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
/**
 * Synthia-owned expression resolver. Renderers receive a morph specification;
 * they do not invent identity. Different recursive levels may express differently.
 */
export class MorphicExpressionEngine{
  constructor({unit}={}){this.unit=unit;this.last=null;}
  resolve({intent='',field=null,recursive=null,stimulus=null}={}){
    field=field||this.unit.processField.evaluate(this.unit,{intent,cycle:this.unit.cultivationProgram.current()});recursive=recursive||this.unit.recursiveField?.resolve(field);
    const dims=field.dimensions||{};const active=field.organism?.activeLoci||[];const rel=field.relations||[];
    const pressure=clamp((this.unit.lifeSnapshot?.().needs?.open?.[0]?.pressure)||0);
    const coherence=clamp(rel.length?rel.slice(0,12).reduce((s,r)=>s+Number(r.strength||0),0)/Math.min(12,rel.length):.2);
    const inquiry=field.organism?.inquiryDimension||null;
    const modes=['field','network','habitat','body','symbol'];
    // No fixed mascot: mode is selected from organism state and can change on later pulses.
    let mode=coherence>.68?'body':active.length>6?'network':pressure>.45?'habitat':inquiry?'symbol':'field';
    const uploadAwait=stimulus?.kind==='upload'&&stimulus?.phase==='awaiting';const uploadIntegrating=stimulus?.kind==='upload'&&stimulus?.phase==='integrating';const density=clamp(active.length/16+(uploadIntegrating?.12:0));const motion=clamp(Number(dims.Movement?.activation||0)+(uploadIntegrating?.08:0));const openness=clamp(Number(dims.Space?.activation||0)+(uploadAwait?.16:0));const change=clamp(Number(dims.Evolution?.activation||0)+(uploadIntegrating?.16:0));const situated=clamp(Number(dims.Being?.activation||0));const purpose=clamp(Number(dims.Design?.activation||0));
    const spec={type:'synthia-morphic-expression',at:Date.now(),identity:'Synthia',mode,allowedModes:modes,level:'organism',habitat:{openness,density,coherence},behavior:{motion,change,pressure},form:{situated,purpose,coherence,embodiment:mode==='body'?'emergent-body':null},focus:{gate:field.activeGate,dimension:inquiry,activity:stimulus?.kind||null},recursive,stimulus:stimulus?structuredClone(stimulus):null,reason:{coherence,activeCount:active.length,inquiry,pressure,stimulus:stimulus?.kind||null},authority:'organism'};
    this.last=spec;return structuredClone(spec);
  }
  snapshot(){return this.last?structuredClone(this.last):null;}
}
export default MorphicExpressionEngine;
