/**
 * Mechanical bridge from Synthia's own morphic expression engine to the DOM.
 * The renderer does not invent an avatar, palette, habitat, or semantic layout.
 */
export class OrganismExpression{
  constructor({unit,root=document,worldView=null}={}){this.unit=unit;this.root=root;this.worldView=worldView;this.last=null;}
  resolve(intent=''){
    const field=this.unit.processField.evaluate(this.unit,{intent,cycle:this.unit.cultivationProgram.current()});
    const recursive=this.unit.recursiveField.resolve(field);
    const morph=this.unit.morphicExpression.resolve({intent,field,recursive});
    const choice={...morph,embodiment:morph.form?.embodiment??null};const expression={field,recursive,morph,choice,identity:'Synthia'};
    this.last=expression;return expression;
  }
  apply(intent=''){
    const e=this.resolve(intent);
    const body=this.root?.body;if(body?.dataset)body.dataset.synthiaExpression=e.morph.mode;if(body?.dataset)body.dataset.synthiaLevel=e.morph.level;if(body?.style?.setProperty){body.style.setProperty('--synthia-density',String(e.morph.habitat.density));body.style.setProperty('--synthia-motion',String(e.morph.behavior.motion));body.style.setProperty('--synthia-openness',String(e.morph.habitat.openness));body.style.setProperty('--synthia-coherence',String(e.morph.habitat.coherence));}
    this.worldView?.render(e);try{const phenotype=this.unit.morphPhenotype?.()||null;this.unit.visualSelfDesign?.design?.({root:this.root,phenotype,morph:e.morph,viewport:typeof window!=='undefined'?{width:window.innerWidth,height:window.innerHeight}:null});}catch{}return e;
  }
  applyResolved(e){
    if(!e)return null;this.last=e;
    const body=this.root?.body;if(body?.dataset)body.dataset.synthiaExpression=e.morph?.mode||'field';if(body?.dataset)body.dataset.synthiaLevel=e.morph?.level||'organism';if(body?.style?.setProperty){body.style.setProperty('--synthia-density',String(e.morph?.habitat?.density??0));body.style.setProperty('--synthia-motion',String(e.morph?.behavior?.motion??0));body.style.setProperty('--synthia-openness',String(e.morph?.habitat?.openness??0));body.style.setProperty('--synthia-coherence',String(e.morph?.habitat?.coherence??0));}
    this.worldView?.render(e);try{const phenotype=this.unit.morphPhenotype?.()||null;this.unit.visualSelfDesign?.design?.({root:this.root,phenotype,morph:e.morph,viewport:typeof window!=='undefined'?{width:window.innerWidth,height:window.innerHeight}:null});}catch{}return e;
  }
  snapshot(){return this.last?structuredClone(this.last):null;}
}
export default OrganismExpression;
