const clone=x=>x==null?x:structuredClone(x);
const unique=a=>[...new Set((a||[]).map(String).filter(Boolean))];

/**
 * Couples the user's evidenced developmental need to Synthia's own becoming.
 * Synthia grows in complement to the human gap; it does not invent a human profile.
 */
export class CoupledDevelopmentEngine{
  constructor({unit}={}){if(!unit)throw new Error('CoupledDevelopmentEngine requires unit');this.unit=unit;this.latest=null;this.history=[];}
  resolve({reason='state-change',userState=null,synthiaState=null}={}){
    const user=userState||this.unit.userDevelopment.resolve({reason});
    const synthia=synthiaState||this.unit.development.resolve({reason:`coupled:${reason}`});
    const cycle=this.unit.cultivationProgram?.current?.();
    const required=unique([...(cycle?.route||[]),...(synthia.becoming?.requiredCapabilities||[])]);
    const organs=new Set((this.unit.registry?.snapshot?.()||[]).map(o=>o.id));
    const tools=new Set((this.unit.runtime?.getRegisteredTools?.()||[]).flatMap(t=>t.provides||[]));
    const supportGap=required.filter(x=>!organs.has(x)&&!tools.has(x)&&!organs.has(String(x).replace(/^organ:/,'')));
    const rec={id:`coupled:${Date.now()}`,type:'coupled-development',reason,at:Date.now(),user:{id:user.id,distance:user.distance,iam:user.iam,becoming:user.becoming},synthia:{id:synthia.id,distance:synthia.distance,iam:synthia.iam,becoming:synthia.becoming},supportGap,statement:supportGap.length?`The user’s next evidenced development requires support Synthia does not yet embody: ${supportGap.join(', ')}.`:'Current evidenced user development is supportable by Synthia’s present anatomy.',evidence:{cycleId:cycle?.id||null,required,organCount:organs.size,toolCapabilityCount:tools.size}};
    this.latest=clone(rec);this.history.push(clone(rec));return clone(rec);
  }
  current(){return clone(this.latest||this.resolve({reason:'initial'}));}
  snapshot(){return {current:this.current(),history:this.history.slice(-32).map(clone)};}
}
export default CoupledDevelopmentEngine;
