import { Automaton } from '../../../vendor/ato-core/src/automaton.mjs';
export class LearnedToolCatalog {
  constructor({compiler,coatAuthority}={}){if(!compiler||!coatAuthority)throw new TypeError('COMPILER_AND_COAT_AUTHORITY_REQUIRED');this.compiler=compiler;this.coatAuthority=coatAuthority;this.records=new Map();}
  retain({manifest,plan,coat}){const record=Object.freeze({manifest:structuredClone(manifest),plan:structuredClone(plan),coat:structuredClone(coat)});this.records.set(manifest.id,record);return record;}
  async installAll(mesh){for(const record of this.records.values()){const artifact=this.compiler.artifact(record.plan),verification=await this.coatAuthority.verify(record.coat,artifact);if(!verification.valid)throw new Error(`LEARNED_TOOL_COAT_INVALID:${record.manifest.id}`);if(!mesh.automatons.has(record.manifest.id))mesh.add(new Automaton({...record.manifest,implementation:this.compiler.compile(record.plan),metadata:{...(record.manifest.metadata??{}),learned:true,coatHash:record.coat.coatHash}}));}return this.records.size;}
  snapshot(){return Object.freeze({records:[...this.records.entries()]});}
  restore(snapshot){this.records=new Map(snapshot?.records??[]);return this;}
}
