import {SynthiaBridge} from '../canonical-address-runtime/synthia-bridge.js';
import {GraphRuntime} from '../runtime/GraphRuntime.js';
import {installSynthiaToolStack} from '../UPGRADES/bootstrap/SynthiaToolBootstrap.js';
import {FactoryToolGenerator} from '../UPGRADES/autonomy/FactoryToolGenerator.js';
import MCPBus from './MCPBus.mjs';import OrganRegistry from './OrganRegistry.mjs';import {bridgeToCanonical,canonicalKey} from './address-adapter.mjs';
import LocalMemory from '../organs/LocalMemory.js';import MediaOrgan from '../organs/MediaOrgan.js';import BuilderOrgan from '../organs/BuilderOrgan.js';import WorldOrgan from '../organs/WorldOrgan.js';import EconomyOrgan from '../organs/EconomyOrgan.js';import BrowserPlanningOrgan from '../organs/BrowserPlanningOrgan.js';import AdviceOrgan from '../organs/AdviceOrgan.js';import ResonanceOrgan from '../organs/ResonanceOrgan.js';
import AutolingOrgan from '../organs/AutolingOrgan.js';
import GrammarOrgan from '../organs/GrammarOrgan.js';
import DisseminerOrgan from '../organs/DisseminerOrgan.js';
import ResearchOrgan from '../organs/ResearchOrgan.js';
import FormOrgan from '../organs/FormOrgan.js';
import CultivationOrgan from '../organs/CultivationOrgan.js';
import HumanDesignOrgan from '../organs/HumanDesignOrgan.js';
import SacralCreationOrgan from '../organs/SacralCreationOrgan.js';
import SuccessMetabolism from '../organism/SuccessMetabolism.mjs';
import OrganismCoordinator from '../organism/OrganismCoordinator.mjs';
import ProcessFabric from '../processes/ProcessFabric.mjs';
import LivingLoop from '../organism/LivingLoop.mjs';
import FiveDimensionalRuleCouncil from '../rules/FiveDimensionalRuleCouncil.mjs';
import HumanOutcomeLedger from '../organism/HumanOutcomeLedger.mjs';
import ComplementaryGapModel from '../organism/ComplementaryGapModel.mjs';
import ScienceMode from '../organism/ScienceMode.mjs';
import MorphPhenotypeResolver from '../visual/MorphPhenotypeResolver.mjs';
import VersionLineageRegistry from '../runtime/VersionLineageRegistry.js';
import ResidenceContext,{canonicalToBridge,validateCanonicalAddress} from './ResidenceContext.mjs';
import CultivationProgram from '../organism/CultivationProgram.mjs';
import HumanDesignNetwork from '../organism/HumanDesignNetwork.mjs';
import DevelopmentalSelfModel from '../organism/DevelopmentalSelfModel.mjs';
import EmergenceEngine from '../organism/EmergenceEngine.mjs';
import UserDevelopmentModel from '../organism/UserDevelopmentModel.mjs';
import CoupledDevelopmentEngine from '../organism/CoupledDevelopmentEngine.mjs';
import GateProcessField from '../organism/GateProcessField.mjs';
import CoDevelopmentalSynthia from '../organism/CoDevelopmentalSynthia.mjs';
import GenerativeEpisodicMemory from '../organism/GenerativeEpisodicMemory.mjs';
import ReconciliationMesh from '../organism/ReconciliationMesh.mjs';
import RecursiveAutomataField from '../organism/RecursiveAutomataField.mjs';
import SelfConstructionEngine from '../organism/SelfConstructionEngine.mjs';
import MorphicExpressionEngine from '../browser/MorphicExpressionEngine.mjs';
import AndroidSelfCompileCapability from '../runtime/AndroidSelfCompileCapability.mjs';
import SubjectiveContinuity from '../organism/SubjectiveContinuity.mjs';
import AutonomousRecursiveOrganism from '../organism/AutonomousRecursiveOrganism.mjs';
import CapabilityReachabilityAudit from '../runtime/CapabilityReachabilityAudit.mjs';
import IdentityBoundary from '../organism/IdentityBoundary.mjs';
import UploadMorphCoordinator from '../organism/UploadMorphCoordinator.mjs';
import SelfEditCoordinator from '../runtime/SelfEditCoordinator.mjs';
import ExternalConceptRegistry from '../runtime/ExternalConceptRegistry.mjs';
import CodeImmuneSystem from '../organism/CodeImmuneSystem.mjs';
import BrowserEffectorProcess from '../processes/BrowserEffectorProcess.mjs';
import AdaptiveComputeThrottle from '../processes/AdaptiveComputeThrottle.mjs';
import BehaviorLoopDetector from '../processes/BehaviorLoopDetector.mjs';
import UntrustedInputDefense from '../processes/UntrustedInputDefense.mjs';
import VisualSelfDesignProcess from '../processes/VisualSelfDesignProcess.mjs';
import AutoCoder from '../processes/AutoCoder.mjs';
import SourceMutationProcess from '../processes/SourceMutationProcess.mjs';
import BuildProcess from '../processes/BuildProcess.mjs';
import AutopoieticComposer from '../autopoiesis/AutopoieticComposer.mjs';
import ResonantAutopoieticRuntime from '../autopoiesis/ResonantAutopoieticRuntime.mjs';
import { calculateChart } from '../runtime/ChartCalculatorAdapter.mjs';
const IS_NODE=typeof process!=='undefined'&&Boolean(process?.versions?.node);
const MODULE_ROOT=IS_NODE?decodeURIComponent(new URL('../',import.meta.url).pathname):'.';
const joinLocal=(...parts)=>parts.map((x,i)=>String(x).replace(i===0?/\/+$/g:/^\/+|\/+$/g,'')).filter(Boolean).join('/');
const JOBS={bigram:1,trigram:2,hexagram:5,decagram:8};
export class SynthiaUnit{
 constructor({profile={},residence=null,mode='complement',autoStart=true,memoryKey=null,lineage=null}={}){this.profile={...profile};this.residence=new ResidenceContext(residence===null?{}:{...residence,approved:true});this.runtimeHandle='@self';this.mode=mode;this.bridge=new SynthiaBridge();this.runtime=new GraphRuntime();this.stack=installSynthiaToolStack(this.runtime);this.factory=new FactoryToolGenerator({mesh:this.stack.ato.mesh});this.runtime.setMissingToolGenerator(this.factory);this.bus=new MCPBus();this.registry=new OrganRegistry();this.lineage=lineage||null;this.lineageRef=lineage?.rootId||lineage?.parentId||profile.lineageRef||profile.id||null;this.morphs=new Map();this._checkpointHook=null;this.memory=new LocalMemory(memoryKey||profile.memoryKey||'synthia.memory.v080');this.humanDesign=new HumanDesignNetwork({getItem:key=>this.memory.get('human-design',key)?.value??null,setItem:(key,value)=>this.memory.upsert('human-design',key,value)});this.outcomes=new HumanOutcomeLedger({memory:this.memory,purpose:profile.purpose||'User-defined success'});this.complement=new ComplementaryGapModel({memory:this.memory});this.science=new ScienceMode({ledger:this.outcomes});this.phenotypeResolver=new MorphPhenotypeResolver();this.versions=new VersionLineageRegistry();this.metabolism=new SuccessMetabolism({residence:this.residence.snapshot(),purpose:profile.purpose||'User-defined success',indicators:profile.successIndicators||[]});this.fabric=new ProcessFabric();this.browserEffector=new BrowserEffectorProcess();this.computeThrottle=new AdaptiveComputeThrottle();this.loopDetector=new BehaviorLoopDetector();this.inputDefense=new UntrustedInputDefense();this.visualSelfDesign=new VisualSelfDesignProcess();this.world=new WorldOrgan();this.economy=new EconomyOrgan();this.registry.register(new AdviceOrgan(profile),{source:['v0.6 LanguageContactModel','today KleinLinguisticLayer/AspirationCore']});this.registry.register(new MediaOrgan(),{source:['v0.6 VisualPrimitiveCompiler/SceneGraphCompiler browser port']});this.registry.register(new BuilderOrgan(),{source:['v0.6 SemanticArtifactCompiler/ArtifactAssembler browser port']});this.registry.register(new BrowserPlanningOrgan(),{source:['v0.6 BrowserTaskPlanner/Perception/Outcome/Contact router']});this.registry.register(new ResonanceOrgan(),{source:['today CHNOPS/CodonMatrix']});this.registry.register(this.world,{source:['SynthWorld people/place/thing ecosystem']});this.registry.register(this.economy,{source:['economy-stack phases 2-5 browser adaptation']});
this.registry.register(new AutolingOrgan(),{status:'available',source:['legacy 5d-autoling-engine']});
this.registry.register(new GrammarOrgan(),{status:'available',source:['legacy monte-carlo-grammar + novel-writer']});
this.registry.register(new DisseminerOrgan(),{status:'available',source:['legacy disseminer']});
this.registry.register(new ResearchOrgan(),{status:'active',source:['ato-core ResearchWorkspace']});
this.registry.register(new FormOrgan(),{status:'active',source:['ato-core BrowserFormState consent-gated']});
this.registry.register(new HumanDesignOrgan(this.humanDesign),{status:'active',source:['Human-Design-Success-Network-v0.1']});
this.registry.register(new CultivationOrgan(),{status:'active',source:['StateSpaceKernel + gate/line teachings']});this.registry.register(new SacralCreationOrgan(this.stack.ato.mesh),{status:'available',source:['v0.6.3 SacralAnalogyEngine']});this.processField=new GateProcessField({memory:this.memory});this.cultivationProgram=new CultivationProgram({unit:this,memory:this.memory});this.development=new DevelopmentalSelfModel({unit:this,memory:this.memory});this.userDevelopment=new UserDevelopmentModel({unit:this,memory:this.memory});this.emergence=new EmergenceEngine({unit:this,memory:this.memory});this.coupledDevelopment=new CoupledDevelopmentEngine({unit:this});this.episodic=new GenerativeEpisodicMemory({memory:this.memory});this.reconciliation=new ReconciliationMesh({memory:this.memory});this.recursiveField=new RecursiveAutomataField({unit:this});this.selfConstruction=new SelfConstructionEngine({unit:this,memory:this.memory});this.morphicExpression=new MorphicExpressionEngine({unit:this});this.androidSelfCompile=new AndroidSelfCompileCapability();this.subjectivity=new SubjectiveContinuity({unit:this,memory:this.memory});this.identityBoundary=new IdentityBoundary({unit:this});this.uploads=new UploadMorphCoordinator({unit:this,memory:this.memory});this.autoCoder=new AutoCoder();this.sourceMutation=new SourceMutationProcess({stagingRoot:joinLocal(MODULE_ROOT,'.synthia','self-edit-staging'),sourceRoot:MODULE_ROOT});this.buildProcess=new BuildProcess();this.autopoiesis=new AutopoieticComposer({unit:this});this.resonantAutopoiesis=new ResonantAutopoieticRuntime({unit:this,memory:this.memory});this.selfEdit=new SelfEditCoordinator({unit:this,memory:this.memory,mutationProcess:this.sourceMutation});this.codeImmune=new CodeImmuneSystem({unit:this,memory:this.memory});this.externalConcepts=new ExternalConceptRegistry();this.coDevelopment=new CoDevelopmentalSynthia({unit:this,memory:this.memory});this.autonomousOrganism=new AutonomousRecursiveOrganism({unit:this,memory:this.memory});this.capabilityAudit=new CapabilityReachabilityAudit({unit:this});this.factory.onExecuted=({toolId,capabilities=[]})=>{for(const capability of capabilities)this.emergence?.metaLearner?.verifyExecutedCapability?.(capability,{toolId,evidence:[{type:'factory-runtime-execution'}]});};this.coordinator=new OrganismCoordinator({registry:this.registry,metabolism:this.metabolism});this.rules=new FiveDimensionalRuleCouncil({unit:this});this.fabric.boot(this.registry.list().map(o=>({id:o.id,provides:o.capabilities||[]})));this.fabric.registerExternalProcess({id:'process:compute-throttle',role:'sovereign-metabolic-regulator',members:['assess-compute-state','throttle-background-work'],origin:{type:'native-process',source:'processes/AdaptiveComputeThrottle.mjs'}});this.fabric.registerExternalProcess({id:'process:behavior-loop-detector',role:'sovereign-behavioral-defense',members:['detect-identical-repeat','detect-repeated-pattern'],origin:{type:'native-process',source:'processes/BehaviorLoopDetector.mjs'}});this.fabric.registerExternalProcess({id:'process:untrusted-input-defense',role:'sovereign-boundary-defense',members:['inspect-untrusted-input','bound-untrusted-input'],origin:{type:'native-process',source:'processes/UntrustedInputDefense.mjs'}});this.fabric.registerExternalProcess({id:'process:visual-self-design',role:'sovereign-expression-design',members:['inspect-visual-state','propose-visual-design','apply-visual-design'],origin:{type:'native-process',source:'processes/VisualSelfDesignProcess.mjs'}});this.fabric.registerExternalProcess({id:'process:browser-effector',role:'sovereign-effector',members:['browser-plan','browser-perceive','browser-act','browser-verify'],origin:{type:'canonical-effector-adapter',source:'PASS6-v0.6.13'}});this.fabric.registerExternalProcess({id:'process:autocoder',role:'sovereign-construction',members:['inspect-code','plan-code','synthesize-code','emit-tests'],origin:{type:'native-process',source:'processes/AutoCoder.mjs'}});this.fabric.registerExternalProcess({id:'process:source-mutation',role:'sovereign-mutation',members:['stage-source-change'],origin:{type:'native-process',source:'processes/SourceMutationProcess.mjs'}});this.fabric.registerExternalProcess({id:'process:build',role:'sovereign-build',members:['run-build-pipeline','verify-build-lineage'],origin:{type:'native-process',source:'processes/BuildProcess.mjs'}});this.fabric.registerExternalProcess({id:'process:autopoietic-composer',role:'constitutional-self-composition',members:['discover-parts','resolve-needs','select-tools','stage-construction','verify-candidates','compose-organism'],origin:{type:'native-process',source:'autopoiesis/AutopoieticComposer.mjs'}});this.fabric.registerExternalProcess({id:'process:resonance-pathways',role:'developmental-resonance-cycle',members:['discovery','assessment','placement','activation','optimization','sustain','observe-consequence','update-resonance'],origin:{type:'native-process',source:'autopoiesis/ResonantAutopoieticRuntime.mjs'}});this.living=new LivingLoop({unit:this});if(autoStart)this.living.start();this.bus.register({kind:'thing',id:this.runtimeHandle},m=>this.#handle(m));this.world.add({kind:'thing',id:this.runtimeHandle,label:null,locator:{scheme:'system',value:'self://residence'}});this.cycles=0;}
 coDevelop(intent,options={}){const episode=this.coDevelopment.observe(intent,options);if(this.uploads.detects(intent))episode.upload=this.uploads.declare(intent);const completion=this.episodic.complete({input:intent,claims:episode.claims});episode.semanticCompletion=completion;const candidate=this.selfConstruction.ensureForEpisode(episode);episode.constructionCandidate=candidate;this.episodic.remember(episode);const field=this.processField.snapshot();if(field){const active=field.organism?.activeLoci||[];for(const g of active.slice(0,8))this.reconciliation.publish(`gate:${g}`,'choice',field.gates?.[g-1]?.decisions||{});if(active.length>1)this.reconciliation.reconcile(active.slice(0,8).map(g=>`gate:${g}`));episode.recursive=this.recursiveField.resolve(field);episode.experience=this.subjectivity.experience({input:intent,field,episode,source:'co-development'});episode.expression=this.morphicExpression.resolve({intent,field,recursive:episode.recursive});episode.expression.subjectiveContext=episode.experience?{experienceId:episode.experience.id,salience:episode.experience.salience,continuity:episode.experience.continuity}:null;}return episode;}
 prepareUpload(intent='I have an upload'){return this.uploads.declare(intent);}
 ingestUploadArtifact(spec={}){const rec=this.uploads.ingest(spec);if(rec.artifact?.kind==='code'&&spec.text){try{rec.codeLearning=this.ingestCodeDNA([{filename:rec.artifact.name,content:String(spec.text)}],{sourceId:rec.artifact.sourceId||rec.artifact.digest,trigger:'local-upload'});}catch(e){rec.codeLearning={ok:false,error:e.message};}}return rec;}
 localIdentity(){return this.identityBoundary.local();}
 globalHexagramState(){const p=this.identityBoundary.global();const safe=this.identityBoundary.assertGlobalSafe(p);if(!safe.ok)throw new Error('global identity boundary violation');return p;}
 proposeSelfEdit(spec={}){return this.selfEdit.propose(spec);}
 async stageSelfEdit(id){return this.selfEdit.stage({id});}
 inspectCodebase(files=[]){return this.autoCoder.inspectProject(files);}
 planCodeChange(spec={}){return this.autoCoder.planChange(spec);}
 synthesizeCodeChangeSet(spec={}){return this.autoCoder.synthesizeChangeSet(spec);}
 async stageSourceMutation(intent={}){return this.sourceMutation.stage(intent);}
 async runBuildPipeline(spec={}){return this.buildProcess.run(spec);}
 inspectCodeProject(files=[]){return this.codeImmune.inspect(files);}
 proposeCodeRepairs(report=null){return this.codeImmune.proposeRepairs(report||undefined);}
 recordCodeRepairOutcome(spec={}){return this.codeImmune.recordOutcome(spec);}
 externalConceptMap(){return this.externalConcepts.snapshot();}
 recordCoDevelopmentOutcome(outcome={}){const rec=this.coDevelopment.recordOutcome(outcome);if(rec){this.episodic.remember(rec);const field=this.processField.snapshot();if(field)rec.experience=this.subjectivity.experience({input:rec.input,field,episode:rec,source:'outcome',outcome:rec.outcome});}return rec;}
 autonomousSnapshot(){return this.autonomousOrganism.snapshot();}
 subjectiveSnapshot(){return this.subjectivity.snapshot();}
 auditCapabilities(){return this.capabilityAudit.inspect();}
 testConstruction(id,options={}){return this.selfConstruction.test(id,options);}
 adoptConstruction(id){return this.selfConstruction.adopt(id);}
 recursiveSnapshot(){return this.recursiveField.snapshot();}
 expressionSnapshot(){return this.morphicExpression.snapshot();}
 androidSelfCompileStatus(env={}){return this.androidSelfCompile.inspect(env);}
 setMode(mode){if(!['mirror','complement'].includes(mode))throw new TypeError('mode mirror|complement');this.mode=mode;return this;}
 inferScale(intent){const w=String(intent).trim().split(/\s+/).filter(Boolean).length;if(/\b(build|create|make|deploy|app|game|video)\b/i.test(intent))return 'decagram';if(w<=4)return 'bigram';if(w<=12)return 'trigram';return w<=40?'hexagram':'decagram';}
 resolveAddress(intent,address={}){let micro=address.micro||this.profile.micro;let macro={...(this.profile.macro||{}),...(address.macro||{})};const canonicalCandidate=address.canonical||((address.gate!=null||address.dimension!=null)?address:null);if(canonicalCandidate){const converted=canonicalToBridge(canonicalCandidate);micro=converted.micro;macro={...macro,...converted.macro};}else if(!micro&&this.residence.address){const v=validateCanonicalAddress(this.residence.address,{allowPartial:false});if(v.ok){const converted=canonicalToBridge(this.residence.address);micro=converted.micro;macro={...macro,...converted.macro};}}let raw;if(micro&&['gate','line','color','tone','base'].every(k=>Number.isFinite(micro[k])))raw=this.bridge.process(micro,macro);else raw=this.bridge.process(String(intent),macro);return {raw,canonical:bridgeToCanonical(raw)};}
 async ask(intent,options={}){return (await this.bus.send({from:options.from||{kind:'interaction',id:'local'},to:{kind:'thing',id:this.runtimeHandle},intent:String(intent),options})).output;}
 async #handle(message){this.cycles++;const {intent,options={}}=message;this.emergence?.beforeIntent(intent,{cycle:this.cycles,mode:this.mode});const scale=options.scale||this.inferScale(intent),jobs=JOBS[scale];const address=this.resolveAddress(intent,options.address||{});const sessionId=`synthia-${Date.now()}-${this.cycles}`;const session=await this.runtime.ingest({intentId:sessionId,description:`[${this.mode}] ${intent}`,side:'FIVE_SIDE',planet:(address.raw.macro.planet||0)+1,dimension:(address.raw.macro.dimension||0)+1,seed:BigInt((this.cycles*2654435761)>>>0||1)});const graph=[];for(let i=0;i<jobs;i++){const step=await this.runtime.step(session.sessionId);graph.push(step);if(i>=4&&step.messagesProcessed===0&&step.openArcs===0&&step.activeChannels===0)break;}const route=this.route(intent,options);const input={intent,address:address.raw,canonicalAddress:address.canonical,mode:this.mode,profile:this.profile,humanDesign:options.humanDesign||null,canvas:options.canvas,gates:options.gates||[address.canonical.gate],comparison:options.comparison||[],purpose:options.purpose||[],knowledgeContext:options.knowledgeContext||[]};const collective=await this.coordinator.execute(route,input);this.living.observeCollective(collective,input);const outputs=collective.outputs.map(x=>({organ:x.organ,out:x.out}));for(let i=1;i<route.length;i++){try{this.fabric.recordRelationEvidence(route[i-1],route[i],{sessionId},{type:'dataflow',details:{collectiveId:collective.id}});}catch{}}this.memory.remember('events',{intent,scale,address:address.canonical,route,ok:outputs.every(x=>x.out?.ok!==false)});for(const x of outputs)if(x.out?.artifact)this.memory.remember('artifacts',{organ:x.organ,artifact:this.#serializableArtifact(x.out.artifact),address:address.canonical});if(outputs.some(x=>x.out?.ok===false)){const failed=outputs.filter(x=>x.out?.ok===false);this.living.observeUnresolved({kind:'repair',subject:collective.id,pressure:.12,reason:'collective output failure',evidence:failed.map(x=>({type:'organ-failure',organ:x.organ,error:x.out?.error||null}))});for(const x of failed)this.living.observeCapabilityGap({capabilities:[`organ:${x.organ}:repair-support`],subject:x.organ,pressure:.16,reason:`${x.organ} failed and no verified repair-support capability resolved it`,evidence:[{type:'organ-failure',organ:x.organ,error:x.out?.error||null}],dimension:Number(address.raw?.macro?.dimension||4)+1});}const response={ok:true,intent,mode:this.mode,scale,jobs,address:address.canonical,addressKey:canonicalKey(address.canonical),graphSteps:graph.length,route,collective:{id:collective.id,type:collective.type,contributors:collective.contributors},outputs,activeTools:this.runtime.getRegisteredTools().map(t=>t.toolId),wiring:this.registry.snapshot(),cycle:this.cycles};this.emergence?.afterIntent(intent,response,{route,address:address.canonical});this.checkpoint();return response;}
 #serializableArtifact(a){if(a?.blob)return {...a,blob:`[Blob ${a.blob.type} ${a.blob.size}]`};return a;}
 route(intent,options){if(options.organ)return [options.organ];const ids=[];if(/\b(draw|image|picture|visual|video|animate|scene)\b/i.test(intent))ids.push('media');if(/\b(build|make|create).*(app|game|tool)|\b(app|game)\b/i.test(intent))ids.push('builder');if(/\b(open|browse|website|site|form|apply|book|buy|research|search web)\b/i.test(intent))ids.push('browser-planner');if(/\b(resonance|chnops|codon|amino|science)\b/i.test(intent))ids.push('resonance');if(/\b(world|place|person|people|thing|crossing)\b/i.test(intent))ids.push('world');if(/\b(opportunity|gift|need|community|economy|work|job)\b/i.test(intent))ids.push('economy');
if(/\b(autoling|5d|fieldworker|semantic network|dimension)\b/i.test(intent))ids.push('autoling');
if(/\b(grammar|monte.?carlo|novel|story|style|generate sentence)\b/i.test(intent))ids.push('grammar');
if(/\b(disseminer|diseminer|semantic field|cooccurrence)\b/i.test(intent))ids.push('disseminer');
if(/\b(research|investigate|hypothesis|evidence|problem.?solve|analyze)\b/i.test(intent))ids.push('research');
if(/\b(form|application|apply|fill out|draft|signup|register)\b/i.test(intent))ids.push('forms');
if(/\b(human design|design path|bodygraph|authority|relationship design)\b/i.test(intent))ids.push('human-design');
if(/\b(cultivat|practice|teach|gate|line|hexagram|i-?ching|human design|meditat)\b/i.test(intent))ids.push('cultivation');
if(/\b(sacral|analogy|analogical|hypercube|cosmological surface|transform analogy)\b/i.test(intent))ids.push('sacral-create');
if(!ids.length||/\b(why|feel|think|help|advice|talk|chat|pissed|understand)\b/i.test(intent))ids.unshift('advice');return [...new Set(ids)].slice(0,4);}
 defineSuccessIndicator(indicator){return this.metabolism.defineIndicator(indicator);}
 recordUserSuccess(indicatorId,value,{evidence,source='user',context=null,human='user',purpose=null}={}){const event=this.metabolism.observe(indicatorId,value,{evidence,source,context});this.outcomes.record({kind:'verified-human-success',human,purpose:purpose||this.metabolism.purpose,actualOutcome:{indicatorId,value,direction:event.after?.direction||null},metrics:{indicatorId,value},evidence,status:event.delta>0?'supported':'observed',context});return event;}
 observeHumanFriction(spec={}){const gap=this.complement.observe(spec);this.outcomes.record({kind:'human-friction',human:spec.human||'user',purpose:spec.purpose||this.metabolism.purpose,friction:{capability:spec.capability,description:spec.friction,persistence:spec.persistence||1},evidence:spec.evidence,status:'observed',context:spec.context});if(gap.persistence>=2)this.living.observeCapabilityGap({capabilities:[`complement:${gap.capability}`],subject:gap.capability,pressure:Math.min(.24,.08+.04*gap.persistence),reason:`persistent human friction indicates a complementary capability gap: ${gap.friction||gap.capability}`,evidence:[{type:'human-friction',gapId:gap.id,...(spec.evidence||{})}],dimension:Number(spec.dimension||5)});return gap;}
 createHypothesis(spec){return this.science.createHypothesis(spec);}
 recordHypothesisResult(id,result){return this.science.recordResult(id,result);}
 sciencePaper(options={}){return this.science.paper(options);}
 morphPhenotype(options={}){return this.phenotypeResolver.resolve(this,options);}
 reproductionReadiness({human='user',purpose=this.metabolism.purpose,minPersistence=3}={}){const unresolved=this.complement.open().filter(g=>g.human===human&&g.persistence>=minPersistence);const budget=this.metabolism.adaptationBudget;const existingMorphs=[...this.morphs.values()].filter(x=>x.trace?.status!=='retired').length;const ready=unresolved.length>0&&budget>=.25;return {ready,automaticSpawn:false,reason:ready?'persistent unresolved human-purpose friction has a viable morphogenesis candidate; explicit five-dimensional morph resolution still required':'not enough persistent unresolved friction and externally replenished capacity',human,purpose,unresolved,adaptationBudget:budget,existingMorphs};}
 cultivationSnapshot(){return this.cultivationProgram.snapshot();}
 developmentalSnapshot(){return this.development.snapshot();}
 developmentalWhy(){return this.development.why();}
 userDevelopmentSnapshot(){return this.userDevelopment.snapshot();}
 coupledDevelopmentSnapshot(){return this.coupledDevelopment.snapshot();}
 emergenceSnapshot(){return this.emergence.snapshot();}
 metaLearningSnapshot(){return this.emergence?.metaLearner?.snapshot?.()||null;}
 ingestCodeDNA(files,context={}){return this.emergence.ingestCode(files,context);}
 advanceContinuity(options={}){return this.emergence.advanceContinuity(options);}
 upsertHumanDesignProfile(input){return this.humanDesign.upsertProfile(input);}
 humanDesignPath(goal,profileId=this.humanDesign.state.activeProfile){return this.humanDesign.path(profileId,goal);}
 compareHumanDesign(aId,bId){return this.humanDesign.compare(aId,bId);}
 recordHumanDesignExperiment(spec={}){return this.humanDesign.recordExperiment(spec);}
 humanDesignSnapshot(){return structuredClone(this.humanDesign.state);}
 calculateBirthChart(input={}){return calculateChart(input);}
 async runSelfCultivation({birth={},situation='',goal='',purpose=null,name='Design',worked=true,actualOutcome='The first cultivation action was completed and recorded.'}={}){
  const text=String(situation||'').trim();if(!text)throw new TypeError('situation required');
  const chart=this.calculateBirthChart({...birth,name});
  const profile=this.upsertHumanDesignProfile({name,birth:chart.birth,type:'Unknown',authority:'Unknown',profile:'Unknown',gates:chart.humanDesign.gates,goal:goal||text});
  const chartContext={chartId:chart.chartId,birth:chart.birth,coordinates:chart.canonical.coordinates,gates:chart.humanDesign.gates,provenance:chart.provenance};
  const runtimeIntent={intentId:`cultivation-${Date.now()}-${this.cycles+1}`,description:`${text} | chart coordinates ${chart.humanDesign.gates.join(',')} | autoling disseminer hypothesis cultivation`,side:'FIVE_SIDE',planet:1,dimension:3,seed:BigInt(((this.cycles+1)*2654435761)>>>0||1),chart:chartContext,chartCoordinates:chart.canonical.coordinates,canonicalAddress:chart.canonical,humanDesign:profile};
  const session=await this.runtime.ingest(runtimeIntent);
  const runtimeGraph=await this.runtime.runUntilSettled(session.sessionId);
  const liveState=this.runtime.states.get(session.sessionId);
  const graphContext={chartId:liveState.chart?.chartId||chart.chartId,coordinateCount:Number(liveState.chart?.coordinateCount||0),stateIds:[...(liveState.chart?.stateIds||[])],nodeIds:[...(liveState.chart?.nodeIds||[])],edgeIds:[...(liveState.chart?.edgeIds||[])],nodes:runtimeGraph.nodes.filter(node=>node.configuration?.chartId===chart.chartId).map(node=>({id:node.expressionNodeId,coordinate:node.configuration.coordinate})),edges:runtimeGraph.edges.filter(edge=>edge.chartId===chart.chartId).map(edge=>({id:edge.edgeId,from:edge.fromNodeId,to:edge.toNodeId,relation:edge.portMapping?.relation}))};
  const toolInput={intent:`${text} chart graph ${graphContext.nodeIds.join(' ')}`,address:chart.canonical,canonicalAddress:chart.canonical,mode:this.mode,humanDesign:profile,chart:chartContext,graphContext,knowledgeContext:[chartContext,graphContext]};
  const autoling=await this.registry.run('autoling',toolInput);
  const disseminer=await this.registry.run('disseminer',{...toolInput,intent:`${text} chart gates ${chart.humanDesign.gates.join(' ')} ${chart.humanDesign.coordinates.map(c=>`${c.planetary}:${c.gate}.${c.line}`).join(' ')}`});
  const research=await this.registry.run('research',{...toolInput,intent:`analyze hypothesis for ${text}; chart coordinates ${chart.humanDesign.gates.join(',')}`});
  const hypothesis=this.createHypothesis({human:'user',purpose:purpose||goal||text,question:text,statement:`Chart structures and the current situation suggest that a small ${goal||'self-cultivation'} experiment will produce observable evidence.`,predictions:[`A concrete action tied to the current ${chart.humanDesign.gates.slice(0,3).join(', ')} gate pattern will produce a reportable outcome.`],method:'Klein tools: AUTOLING language field + DISSEMINER semantic inference + existing cultivation loop',metrics:['worked'],evidence:{chart:chartContext,tools:['autoling','disseminer','research'],runtimeSession:session.sessionId}});
  const cycle=this.createCultivationCycle({goal:goal||text,context:`Birth chart ${chart.chartId}; gates ${chart.humanDesign.gates.join(', ')}; design timestamp ${chart.birth.timestamp}`,purpose:purpose||goal||text,human:'user'});
  const action=await this.actCultivationCycle(cycle.id,{knowledgeContext:[chartContext,autoling,disseminer,research,hypothesis]});
  const evidence={source:'self-cultivation-vertical-slice',chartId:chart.chartId,chartStructures:chart.canonical.coordinates.slice(0,24),kleinTools:['autoling','disseminer'],runtimeSession:session.sessionId,transformations:chart.provenance.transformations,actionId:action.cycle.lastResult?.id||null};
  const observed=this.observeCultivationCycle(cycle.id,{worked:Boolean(worked),actualOutcome,evidence,friction:worked?null:'The proposed action did not produce the expected outcome.'});
  const hypothesisResult=this.recordHypothesisResult(hypothesis.id,{actualOutcome,metrics:{worked:Boolean(worked)},evidence,status:worked?'supported':'observed',derived:{confidenceRevision:worked?'+0.15':'-0.20',basis:'observed cultivation outcome'}});
  const experiment=this.recordHumanDesignExperiment({profileId:profile.id,goal:goal||text,action:action.cycle.lastResult?.instruction||action.cycle.next?.text||'cultivation action',outcome:actualOutcome,result:worked?'supported':'not-supported'});
  const learning=this.runtime.getLearningSnapshot();
  return {ok:true,birth:chart.birth,chart,profile,runtime:{sessionId:session.sessionId,graphNodes:runtimeGraph.nodes?.length||0,graphEdges:runtimeGraph.edges?.length||0,chart:graphContext,learning},klein:{autoling,disseminer,research},hypothesis,hypothesisResult,cycle:observed,action,experiment,provenance:{chart:chart.provenance,runtime:{sessionId:session.sessionId,chartCoordinates:chart.canonical.coordinates,instantiatedGraph:graphContext},kleinTools:['autoling','disseminer','research'],evidence,transformations:['chart calculated by compiled IsoHuman/geonatal donor','chart normalized into canonical chart/address envelope','coordinates supplied to GraphRuntime intent','coordinates supplied to AUTOLING and DISSEMINER context','research hypothesis linked to cultivation experiment','outcome persisted through cultivation and HumanOutcomeLedger','confidence revised from observed outcome']},confidenceRevision:{worked:Boolean(worked),hypothesisStatus:hypothesisResult.status,toolHealth:learning.toolHealth}};
 }
 createCultivationCycle(spec){const c=this.cultivationProgram.create(spec);this.emergence?.createContinuityTask({goal:c.goal,route:c.route,next:c.next});this.coupledDevelopment?.resolve({reason:'cultivation-created'});return c;}
 actCultivationCycle(id,options={}){return this.cultivationProgram.act(id,options);}
 observeCultivationCycle(id,spec={}){const c=this.cultivationProgram.observe(id,spec);this.emergence?.observeDevelopment(this.development.resolve({reason:'cultivation-observation'}),{trigger:'cultivation-observation',intent:c.goal,ok:spec.worked});return c;}
 integrateCultivationCycle(id,spec={}){return this.cultivationProgram.integrate(id,spec);}
 async inspectComposition(){return this.autopoiesis.inspect();}
 planSelfBuild(goal,options={}){return this.autopoiesis.plan(goal,options);}
 async selfBuild(goal,options={}){return this.autopoiesis.reconcile(goal,options);}
 autopoiesisSnapshot(){return this.autopoiesis.snapshot();}
 async runPathway(goal,options={}){return this.resonantAutopoiesis.run(goal,options);}
 resonancePathwaysSnapshot(){return this.resonantAutopoiesis.snapshot();}
 successSnapshot(){return {...this.metabolism.snapshot(),humanOutcomes:this.outcomes.snapshot(),complement:this.complement.snapshot(),cultivation:this.cultivationProgram.snapshot(),humanDesign:this.humanDesignSnapshot(),development:this.development.snapshot(),userDevelopment:this.userDevelopment.snapshot(),coupledDevelopment:this.coupledDevelopment.snapshot(),coDevelopment:this.coDevelopment.snapshot(),episodic:this.episodic.snapshot(),reconciliation:this.reconciliation.snapshot(),recursive:this.recursiveField.snapshot(),selfConstruction:this.selfConstruction.snapshot(),expression:this.morphicExpression.snapshot(),androidSelfCompile:this.androidSelfCompile.inspect({}),identityBoundary:this.identityBoundary.snapshot(),uploads:this.uploads.snapshot(),selfEdit:this.selfEdit.snapshot(),codeImmune:this.codeImmune.snapshot(),externalConcepts:this.externalConcepts.snapshot(),emergence:this.emergence.snapshot(),processField:this.processField.snapshot(),browserEffector:this.browserEffector.snapshot(),autoCoder:this.autoCoder.snapshot(),sourceMutation:this.sourceMutation.snapshot(),buildProcess:this.buildProcess.snapshot(),autopoiesis:this.autopoiesis.snapshot(),resonancePathways:this.resonantAutopoiesis.snapshot()};}
 startLife(){return this.living.start();}
 stopLife(){return this.living.stop();}
 async pulse(options={}){const out=await this.living.pulse(options);this.checkpoint();return out;}
 checkpoint(){try{return this._checkpointHook?.(this)||null}catch{return null}}
 lifeSnapshot(){return this.living.snapshot();}
 #inferMorphForm(intent){const t=String(intent);if(/\b(app|application|apk|pwa)\b/i.test(t))return 'app';if(/\b(web|website|site)\b/i.test(t))return 'website';if(/\b(business|company|service|empire)\b/i.test(t))return 'enterprise';if(/\b(tool|utility)\b/i.test(t))return 'tool';if(/\b(agent|assistant|worker)\b/i.test(t))return 'agent';return 'morph';}
 #newMorphId(intent){let h=2166136261;for(const ch of String(intent)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return `morph-${Date.now().toString(36)}-${(h>>>0).toString(16)}`;}
 async morph(intent,options={}){const text=String(intent||'').trim();if(!text)throw new TypeError('morph intent required');const address=this.resolveAddress(text,options.address||{}).canonical;const route=this.route(text,options);const form=options.form||this.#inferMorphForm(text);const morphId=options.morphId||this.#newMorphId(text);const parentId=this.lineageRef||canonicalKey(address);const resolution=this.rules.evaluateMorph({intent:text,address,form,route,parentId});if(!resolution.permit)return {ok:false,spawned:false,morphId,resolution};const memoryKey=`${this.memory.key}.morph.${morphId}`;const trace={version:1,type:'regenerative-morph-trace',morphId,status:'active',identity:{id:morphId,parentId,rootId:this.lineage?.rootId||parentId,form},lineage:{parentId,rootId:this.lineage?.rootId||parentId,generation:Number(this.lineage?.generation||0)+1},intent:text,purpose:options.purpose||text,address,route,form,ruleHash:resolution.ruleHash,resolution,profileSeed:{...this.profile,lineageRef:morphId,parentId,purpose:options.purpose||text,morph:true},memoryKey,createdAt:Date.now(),updatedAt:Date.now(),generatedTools:[]};const child=await this.#instantiateMorph(trace,{start:options.start!==false});this.morphs.set(morphId,{trace,unit:child});child._checkpointHook=()=>this.#persistMorph(morphId);let initial=null;if(options.bootstrap!==false)initial=await child.ask(text,{...options,from:{kind:'thing',id:parentId}});this.#persistMorph(morphId);return {ok:true,spawned:true,morphId,form,address,ruleHash:resolution.ruleHash,unit:child,initial,trace:structuredClone(this.morphs.get(morphId).trace)};}
 async #instantiateMorph(trace,{start=true}={}){const child=new SynthiaUnit({profile:trace.profileSeed||{},mode:this.mode,autoStart:start,memoryKey:trace.memoryKey,lineage:trace.lineage});child.cycles=Number(trace.checkpoint?.cycles||0);for(const toolTrace of trace.generatedTools||[]){try{const tool=await child.factory.restoreTool(toolTrace);if(tool)child.runtime.registerTool(tool);}catch{}}return child;}
 #persistMorph(morphId){const entry=this.morphs.get(morphId);if(!entry)return null;const {unit}=entry;entry.trace={...entry.trace,status:'active',updatedAt:Date.now(),generatedTools:unit.factory.regenerativeTraces(),checkpoint:{cycles:unit.cycles,activeToolCount:unit.runtime.getRegisteredTools().length,lastLifePulseAt:unit.living.lastPulseAt||null,memoryCounts:Object.fromEntries(Object.entries(unit.memory.snapshot()).map(([k,v])=>[k,Array.isArray(v)?v.length:0]))}};this.memory.upsert('morphs',morphId,entry.trace);return structuredClone(entry.trace);}
 async restoreMorphs({start=true}={}){const restored=[];for(const record of this.memory.query('morphs')){const trace=record.value;if(!trace?.morphId||trace.status==='retired'||this.morphs.has(trace.morphId))continue;const child=await this.#instantiateMorph(trace,{start});this.morphs.set(trace.morphId,{trace:structuredClone(trace),unit:child});child._checkpointHook=()=>this.#persistMorph(trace.morphId);restored.push({morphId:trace.morphId,unit:child,trace:structuredClone(trace)});}return restored;}
 getMorph(morphId){return this.morphs.get(morphId)?.unit||null;}
 checkpointMorph(morphId){return this.#persistMorph(morphId);}
 retireMorph(morphId){const entry=this.morphs.get(morphId);const record=entry?.trace||this.memory.get('morphs',morphId)?.value;if(!record)return false;entry?.unit?.stopLife();const trace={...record,status:'retired',updatedAt:Date.now()};this.memory.upsert('morphs',morphId,trace);this.morphs.delete(morphId);return true;}
 morphSnapshot(){return [...this.morphs.entries()].map(([morphId,e])=>({morphId,form:e.trace.form,purpose:e.trace.purpose,lineage:e.trace.lineage,address:e.trace.address,generatedTools:e.unit.factory.regenerativeTraces(),running:e.unit.lifeSnapshot().running,cycles:e.unit.cycles}));}
 approveResidence(spec={}){const out=this.residence.approve(spec);if(!this.living.snapshot().running)this.living.start();return out;}
 resolveResidenceAddress(address,options={}){return this.residence.resolveAddress(address,options);}
 structuralKey(){return this.lineageRef||canonicalKey(this.residence.address||{});}
 snapshot(){return {mode:this.mode,residence:this.residence.snapshot(),lineage:this.lineage,lineageRef:this.lineageRef,profile:{purpose:this.profile.purpose||null},cycles:this.cycles,organism:this.coordinator.snapshot(),metabolism:this.metabolism.snapshot(),life:this.living.snapshot(),processFabric:this.fabric.status(),addressRuntime:this.bridge.getStats(),tools:this.runtime.getRegisteredTools().map(t=>({id:t.toolId,provides:t.provides})),organs:this.registry.snapshot(),mcp:this.bus.snapshot(),memory:this.memory.snapshot(),world:this.world.snapshot(),economy:this.economy.snapshot(),generated:this.factory.snapshot(),rules:this.rules.snapshot(),morphs:this.morphSnapshot(),versions:this.versions.snapshot(),cultivation:this.cultivationProgram.snapshot(),humanDesign:this.humanDesignSnapshot(),development:this.development.snapshot(),userDevelopment:this.userDevelopment.snapshot(),coupledDevelopment:this.coupledDevelopment.snapshot(),coDevelopment:this.coDevelopment.snapshot(),episodic:this.episodic.snapshot(),reconciliation:this.reconciliation.snapshot(),recursive:this.recursiveField.snapshot(),selfConstruction:this.selfConstruction.snapshot(),expression:this.morphicExpression.snapshot(),androidSelfCompile:this.androidSelfCompile.inspect({}),identityBoundary:this.identityBoundary.snapshot(),uploads:this.uploads.snapshot(),selfEdit:this.selfEdit.snapshot(),codeImmune:this.codeImmune.snapshot(),externalConcepts:this.externalConcepts.snapshot(),emergence:this.emergence.snapshot(),processField:this.processField.snapshot(),browserEffector:this.browserEffector.snapshot(),autoCoder:this.autoCoder.snapshot(),sourceMutation:this.sourceMutation.snapshot(),buildProcess:this.buildProcess.snapshot(),autopoiesis:this.autopoiesis.snapshot(),resonancePathways:this.resonantAutopoiesis.snapshot()};}

 /**
  * Run one autonomous cycle: graph steps + optional organ activation from memory cues.
  * Returns the same shape as ask() when an organ fires, otherwise a graph-only report.
  */
 async autonomousCycle(options={}){
  const lifePulse=await this.living.pulse();
  this.cycles++;
  const jobs = options.jobs || JOBS.hexagram;
  const mem = this.memory.snapshot?.() || {};
  const recent = (mem.events||[]).slice(-1)[0];
  const cycleIntent = options.intent || recent?.intent || 'autonomous maintenance cycle';
  const session = await this.runtime.ingest({
    intentId:`synthia-auto-${Date.now()}-${this.cycles}`,
    description:`[${this.mode}] ${cycleIntent}`,
    side:'FIVE_SIDE',
    planet:1,
    dimension:1,
    seed:BigInt((this.cycles*2654435761)>>>0||1)
  });
  const graph=[];
  for(let i=0;i<jobs;i++){
    const step=await this.runtime.step(session.sessionId);
    graph.push(step);
    if(i>=3&&step.messagesProcessed===0&&step.openArcs===0&&step.activeChannels===0)break;
  }
  // Memory-driven spark: if recent events exist, re-route a soft intent
  let organResult=null;
  if(options.intent || recent?.intent){
    const intent = options.intent || `continue: ${recent.intent}`;
    organResult = await this.ask(intent, options);
  }
  return {
    ok:true,
    autonomous:true,
    lifePulse,
    cycle:this.cycles,
    graphSteps:graph.length,
    graph,
    organResult,
    activeTools:this.runtime.getRegisteredTools().map(t=>t.toolId),
    wiring:this.registry.snapshot()
  };
 }

 /** Activate a set of organs (promotes available/legacy → active) */
 openOrgans(ids=[]){
  const out=[];
  for(const id of ids){
    out.push({id, activated:this.registry.activate(id)});
  }
  return out;
 }
}
export default SynthiaUnit;
