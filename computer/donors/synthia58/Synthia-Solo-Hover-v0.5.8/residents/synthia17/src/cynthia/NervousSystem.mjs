import { bootstrapATO } from '../../vendor/ato-core/src/bootstrap.mjs';
import { createPrimaryAutomata } from '../../vendor/ato-core/src/families.mjs';
import { OrganismRuntime } from './OrganismRuntime.mjs';
import { EventLedger } from './EventLedger.mjs';
import { VisualPrimitiveCompiler } from '../runtime/VisualPrimitiveCompiler.js';
import { SceneGraphCompiler } from '../runtime/SceneGraphCompiler.js';
import { ResultFeedbackLoop } from './ResultFeedbackLoop.mjs';
import { BrowserHandOrgan } from './organs/BrowserHandOrgan.mjs';
import { MorphEvolutionEngine } from './morph/MorphEvolutionEngine.mjs';
import { BusinessOrientationEngine } from './business/BusinessOrientationEngine.mjs';
import { PersonalSynthRegistry } from './identity/PersonalSynthRegistry.mjs';

const routes = Object.freeze([
  {id:'browser-hand',test:/\b(browser|website|web page|go online|fill (?:out )?(?:an )?(?:application|form)|book (?:an )?appointment|add to cart)\b/i},
  {id:'media-compiler',test:/\b(video|clip|movie|animation|animated|scene|camera|sphere|mountain)\b/i},
  {id:'visual',test:/\b(draw|image|picture|photo|illustrat|render|shape|circle|triangle|geometry)\b/i},
  {id:'code',test:/\b(code|script|function|module|implement|program|app)\b/i},
  {id:'historical-monte-carlo',test:/\b(monte carlo|simulate|probab|variants?|trajectory)\b/i},
  {id:'iching-grammar',test:/\b(i ching|yijing|hexagram|trigram|yin|yang)\b/i},
  {id:'computational-grammar-coder',test:/\b(grammar|sentence|word|lingu|language)\b/i},
  {id:'diseminer',test:/\b(mean|meaning|claim|concept|understand|infer|relationship)\b/i},
]);

export class NervousSystem {
  constructor(options={}) {
    this.organism=options.organism??new OrganismRuntime(options);
    this.ato=options.ato??bootstrapATO();
    for(const tool of createPrimaryAutomata()) if(!this.ato.mesh.automatons.has(tool.id)) this.ato.mesh.add(tool);
    this.ledger=options.ledger??new EventLedger();
    this.visualCompiler=new VisualPrimitiveCompiler();
    this.sceneCompiler=new SceneGraphCompiler();
    this.feedback=new ResultFeedbackLoop();
    this.browserHand=new BrowserHandOrgan();
    this.morph=new MorphEvolutionEngine({organism:this.organism,availableCapabilities:['sensory-ingestion','scene-export','browser-hand','review-gate','continuous-identity']});
    this.business=new BusinessOrientationEngine();
    this.personalSynths=new PersonalSynthRegistry();
    for(const id of this.ato.mesh.automatons.keys()) this.organism.mind.pressure.register(`ato:${id}`,{competence:.65});
    this.organism.mind.pressure.register('ato:media-compiler',{competence:.8});
    this.organism.mind.pressure.register('ato:browser-hand',{competence:.75});
  }

  select(text) { return routes.find(route=>route.test.test(text))?.id??'autoling'; }

  async process(input,context={}) {
    const text=typeof input==='string'?input:String(input.text??JSON.stringify(input));
    this.ledger.append('input-preserved',{kind:typeof input,chars:text.length});
    const intake=await this.organism.ingest(input,context);
    this.ledger.append('analysis-complete',{sourceId:intake.source.id,address:intake.analysis.addressed.address});
    if (this.toolField) {
      const address = intake.analysis.addressed.address;
      for (const pair of context.connections || []) {
        if (Array.isArray(pair) && pair.length >= 2) this.toolField.observeConnection(pair[0], pair[1], { active:true });
      }
      const connectionIds = (context.connections || []).filter(value => typeof value === 'string');
      const field = this.toolField.activate({
        address,
        activeGates:[address?.gate, ...(context.activeGates || [])].filter(Boolean),
        connections:connectionIds,
        role:context.role || 'agent',
      });
      this.ledger.append('tool-field-active',{gate:address?.gate ?? null,tools:field.tools.map(tool=>tool.id),programs:field.programs.map(program=>program.id)});
    }
    const toolId=this.select(text), pressureId=`ato:${toolId}`;
    this.organism.mind.pressure.press(pressureId,{need:1,unresolved:.8,salience:.7});
    const tool=this.ato.mesh.automatons.get(toolId);
    const toolInput=this.#inputFor(toolId,text,intake);
    let output;
    try {
      if(toolId==='media-compiler') output=this.#compileMedia(text);
      else if(toolId==='browser-hand') output=await this.browserHand.act({message:text,executor:context.browserExecutor});
      else output=await tool.call(toolInput,{sourceId:intake.source.id});
      this.organism.mind.pressure.record(pressureId,true);
    }
    catch(error){this.organism.mind.pressure.record(pressureId,false);this.ledger.append('tool-failed',{toolId,error:error.message});throw error;}
    finally{this.organism.mind.pressure.release(pressureId);}
    this.ledger.append('tool-complete',{toolId,sourceId:intake.source.id});
    this.organism.episodes.remember({id:`outcome:${intake.source.id}:${toolId}`,input:text,fields:intake.analysis.addressed.analysis??{},outcome:{status:'complete',toolId}});
    return Object.freeze({intake,route:Object.freeze({toolId,pressure:this.organism.mind.pressure.memoryStrength(pressureId)}),output,events:this.ledger.replay()});
  }

  #inputFor(toolId,text,intake){
    if(toolId==='visual') return {width:640,height:360,background:'#0b1320',shapes:[]};
    if(toolId==='code') return {name:intake.analysis.procedures.steps[0]?.action??'generatedTool',params:['input'],body:'return input;'};
    if(toolId==='historical-monte-carlo') return {variants:{observed:1,counterfactual:1},seed:7,generations:8};
    if(toolId==='iching-grammar') return {lines:this.organism.stateField.describe(intake.analysis.addressed.address.gate).lines};
    if(toolId==='computational-grammar-coder') return text;
    if(toolId==='diseminer') return {operation:'ingest',text,context:{sourceId:intake.source.id}};
    return {operation:'recognize',text};
  }

  #compileMedia(text){const scene=this.sceneCompiler.parse(text);if(scene)return Object.freeze({kind:'scene-artifact-bundle',spec:scene,files:this.sceneCompiler.compile(scene)});const visual=this.visualCompiler.parse(text);return Object.freeze({kind:'visual-artifact-bundle',spec:visual,files:this.visualCompiler.compile(visual)});}
}
