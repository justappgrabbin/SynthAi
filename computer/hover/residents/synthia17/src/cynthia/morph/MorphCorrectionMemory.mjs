export class MorphCorrectionMemory {
  constructor(){this.records=[];}
  remember({subjectId,trait,expected,observed,sourceId}={}){if(!subjectId||!trait)throw new TypeError('MORPH_CORRECTION_SUBJECT_AND_TRAIT_REQUIRED');const record=Object.freeze({id:`correction:${this.records.length+1}`,subjectId:String(subjectId),trait:String(trait),expected:structuredClone(expected),observed:structuredClone(observed),sourceId:sourceId??null,weight:this.records.filter(item=>item.subjectId===subjectId&&item.trait===trait).length+1});this.records.push(record);return record;}
  forSubject(subjectId){return Object.freeze(this.records.filter(item=>item.subjectId===subjectId));}
  snapshot(){return Object.freeze({records:structuredClone(this.records)});}
  restore(snapshot){this.records=(snapshot?.records??[]).map(Object.freeze);return this;}
}
