import { VersionLineageRegistry } from 'synthia/vendor/VersionLineageRegistry.js';
import { evaluateIR } from 'synthia/vendor/spine/src/predicate-ir.mjs';
import { validateCanonicalAddress } from 'synthia/vendor/spine/src/canonical-address.mjs';
import { digest } from 'synthia/vendor/ingestion/src/automata/ontological-address.mjs';

// An integration adapter over the supplied lineage registry and predicate IR.
// Qualities and fit predicates are supplied by design; this adapter invents
// neither dimensional qualities nor physical connection laws.
export class LineageAdapter {
 constructor(engine){this.engine=engine;this.registry=new VersionLineageRegistry();this.pieces=new Map();this.consequences=[];}
 async register({id,parents=[],qualities=[],address,source,form='gram',proportion={numerator:'1',denominator:'1'},foundational=false}={}){
  if(!id||this.pieces.has(id))throw Error('Piece needs a unique identity');
  if(!source)throw Error('Piece needs its design/model/source lineage');
  if(!['glyph','gram','bigram','trigram','hexagram','tool','page','automaton'].includes(form))throw Error('Unknown composition form');
  validateCanonicalAddress(address);
  if(!foundational&&!parents.length)throw Error('Derived pieces need their parent lineage');
  const ancestors=parents.map(p=>{const node=this.pieces.get(p);if(!node)throw Error(`Unknown parent ${p}`);return node;});
  const inherited=new Set(ancestors.flatMap(p=>p.qualities));
  if(ancestors.length&&qualities.some(q=>!inherited.has(q)))throw Error('Qualities must be inherited from the source lineage');
  if(BigInt(proportion.numerator)<=0n||BigInt(proportion.denominator)<=0n)throw Error('Proportion must be positive');
  const piece=structuredClone({id,parents,qualities,address,source,form,proportion,foundational});
  const hash=await digest(JSON.stringify(piece));
  this.registry.register({name:id,hash,source,metadata:piece});
  this.pieces.set(id,Object.freeze(piece));
  this.engine.tripleStore.addAll(parents.map(p=>({subject:id,predicate:'descends-from',object:p})).concat(qualities.map(q=>({subject:id,predicate:'inherits-quality',object:q}))));
  return structuredClone(piece);
 }
 fit({left,right,predicate,depth=0,evidence,fitEffect,mismatchEffect}={}){
  const a=this.pieces.get(left),b=this.pieces.get(right);
  if(!a||!b)throw Error('Fit requires two existing pieces');
  if(!predicate||!evidence||fitEffect===undefined||mismatchEffect===undefined)throw Error('Fit requires a design predicate, evidence, and both consequences');
  const fits=Boolean(evaluateIR(predicate,{left:a,right:b,depth}));
  const record=Object.freeze(structuredClone({id:`fit:${this.consequences.length+1}`,left,right,depth,fits,predicate,evidence,effect:fits?fitEffect:mismatchEffect}));
  this.consequences.push(record);
  this.engine.tripleStore.addAll([{subject:left,predicate:fits?'fits-at-depth':'mismatch-at-depth',object:right,provenance:record}]);
  return structuredClone(record);
 }
 snapshot(){return {pieces:[...this.pieces.values()].map(x=>structuredClone(x)),consequences:structuredClone(this.consequences),versions:this.registry.snapshot()};}
}
