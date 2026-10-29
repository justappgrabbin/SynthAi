export class ExternalCapabilityResolver {
  constructor({local,organism,network,mcp,human}){ this.layers=[['local',local],['organism',organism],['network',network],['mcp',mcp],['human',human]]; }
  async resolve(need){
    const attempts=[];
    for(const [layer,resolver] of this.layers){
      if(!resolver?.resolve) continue;
      const result=await resolver.resolve(need); attempts.push({layer,result});
      if(result?.satisfied || (Array.isArray(result?.candidates)&&result.candidates.length)) return {layer,result,attempts};
    }
    return {layer:null,result:null,attempts};
  }
}
