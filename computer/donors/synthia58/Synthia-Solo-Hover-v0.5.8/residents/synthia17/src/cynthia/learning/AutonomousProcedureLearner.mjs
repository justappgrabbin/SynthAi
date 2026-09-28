export class AutonomousProcedureLearner {
  constructor({nervousSystem,inferer,compiler,installer,catalog,identity}={}){Object.assign(this,{nervousSystem,inferer,compiler,installer,catalog,identity});}
  async learn({sourceText,examples,name=null,confidence=.95,resonance=.9,approval='approve',resolvedAddress=null}={}){
    const sourceBody=typeof sourceText==='string'?sourceText:String(sourceText?.text??sourceText);
    const sourceMetadata={kind:'procedure-source',citation:sourceText?.citation?.()??null,provenance:sourceText?.provenance??null};
    const intake=await this.nervousSystem.organism.mind.ingestText(sourceBody,sourceMetadata);
    const inference=this.inferer.infer(sourceText,examples);
    if(inference.status!=='candidate')return Object.freeze({status:'needs-definition',intake,inference});
    const address=resolvedAddress??intake.analysis.addressed.address;
    const id=name??`learned-${intake.source.id.slice(7)}`;
    const manifest={id,address:{mode:'macro',gate:address.gate,line:address.line,color:address.color,tone:address.tone,base:address.base,dimension:address.dimension},structure:'bigram',activeLevels:[1],functionalLevel:'design',ports:[{id:'in',direction:'input',type:'json'},{id:'out',direction:'output',type:'json'}],metadata:{sourceId:intake.source.id,procedure:sourceBody,citation:sourceMetadata.citation}};
    const artifact=this.compiler.artifact(inference.plan);
    const staged=await this.installer.propose({code:artifact,contract:inference.contract,manifest,identity:this.identity,confidence,resonance});
    const test=await this.installer.test(staged.proposal.id,{examples});
    if(!test.passed)return Object.freeze({status:'verification-failed',intake,inference,staged,test});
    const installation=await this.installer.install(staged.proposal.id,approval,{implementation:this.compiler.compile(inference.plan)});
    if(installation.status==='installed')this.catalog.retain({manifest,plan:inference.plan,coat:staged.coat});
    return Object.freeze({status:installation.status,intake,inference,test,installation,toolId:id});
  }
}
