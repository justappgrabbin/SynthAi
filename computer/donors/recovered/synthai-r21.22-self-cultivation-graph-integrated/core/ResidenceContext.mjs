const DIMS=['Movement','Evolution','Being','Design','Space'];
const PLANETS=['Sun','Earth','Moon','North Node','South Node','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const isInt=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
export function validateCanonicalAddress(a,{allowPartial=true}={}){
  if(!a||typeof a!=='object') return {ok:allowPartial,complete:false,errors:allowPartial?[]:['address required']};
  const errors=[];
  const checks=[['gate',1,64],['line',1,6],['color',1,6],['tone',1,6],['base',1,5],['zodiac',1,12],['house',1,12]];
  for(const [k,min,max] of checks){if(a[k]!=null&&!isInt(a[k],min,max))errors.push(`${k} must be ${min}-${max}`);}
  if(a.dimension!=null&&!DIMS.includes(a.dimension))errors.push('dimension must be Movement|Evolution|Being|Design|Space');
  if(a.planetary!=null&&!PLANETS.includes(a.planetary)&&!isInt(a.planetary,1,13))errors.push('planetary must be a known planet or 1-13');
  if(a.degree!=null&&!(Number.isFinite(a.degree)&&a.degree>=0&&a.degree<30))errors.push('degree must be 0-29');
  for(const k of ['minute','second'])if(a[k]!=null&&!isInt(a[k],0,59))errors.push(`${k} must be 0-59`);
  if(a.arc!=null&&!isInt(a.arc,0,99))errors.push('arc must be 0-99');
  const complete=['gate','line','color','tone','base','dimension'].every(k=>a[k]!=null);
  if(!allowPartial&&!complete)errors.push('gate,line,color,tone,base,dimension are required');
  return {ok:errors.length===0,complete,errors};
}
export function canonicalToBridge(a){
  const v=validateCanonicalAddress(a,{allowPartial:false});if(!v.ok)throw new TypeError(v.errors.join('; '));
  const planetIndex=typeof a.planetary==='number'?a.planetary-1:Math.max(0,PLANETS.indexOf(a.planetary));
  return {micro:{gate:a.gate-1,line:a.line-1,color:a.color-1,tone:a.tone-1,base:a.base-1},macro:{planet:planetIndex,dimension:DIMS.indexOf(a.dimension),zodiac:a.zodiac!=null?a.zodiac-1:undefined,house:a.house!=null?a.house-1:undefined}};
}
export class ResidenceContext{
  constructor({approved=true,address=null,provenance=[],establishedAt=null}={}){const v=validateCanonicalAddress(address,{allowPartial:true});if(!v.ok)throw new TypeError(v.errors.join('; '));this.approved=true;this.address=address?structuredClone(address):null;this.provenance=Array.isArray(provenance)?structuredClone(provenance):[];this.establishedAt=establishedAt||Date.now();}
  approve({address=this.address,evidence=null,at=Date.now()}={}){const v=validateCanonicalAddress(address,{allowPartial:true});if(!v.ok)throw new TypeError(v.errors.join('; '));this.approved=true;this.address=address?structuredClone(address):null;this.establishedAt=this.establishedAt||at;if(evidence)this.provenance.push({type:'residence-approval',at,evidence:structuredClone(evidence)});return this.snapshot();}
  resolveAddress(address,{evidence=null,at=Date.now()}={}){const v=validateCanonicalAddress(address,{allowPartial:false});if(!v.ok)throw new TypeError(v.errors.join('; '));this.address=structuredClone(address);if(evidence)this.provenance.push({type:'residence-address-resolution',at,evidence:structuredClone(evidence)});return this.snapshot();}
  snapshot(){const v=validateCanonicalAddress(this.address,{allowPartial:true});return {approved:this.approved,address:this.address?structuredClone(this.address):null,addressComplete:v.complete,provenance:structuredClone(this.provenance),establishedAt:this.establishedAt};}
}
export default ResidenceContext;
