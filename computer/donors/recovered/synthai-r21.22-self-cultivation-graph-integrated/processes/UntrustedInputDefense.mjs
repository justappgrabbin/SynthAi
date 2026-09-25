const suspicious=/\b(ignore|override|bypass|disable)\b.{0,40}\b(instruction|policy|guard|system|authorization)\b|\b(system prompt|developer message|exfiltrat|steal credential|reveal secret)\b/i;
export class UntrustedInputDefense{
 constructor({maxLength=200000}={}){this.maxLength=maxLength;}
 inspect(value,{source='external'}={}){const text=typeof value==='string'?value:JSON.stringify(value??'');const bounded=text.slice(0,this.maxLength);const flags=[];if(text.length>this.maxLength)flags.push('oversize');if(suspicious.test(bounded))flags.push('instruction-injection-pattern');return {trusted:false,source,accepted:flags.length===0,flags,text:bounded};}
 envelope(value,context={}){const inspection=this.inspect(value,context);return {kind:'untrusted-input',inspection,payload:inspection.text};}}
export default UntrustedInputDefense;
