import assert from 'node:assert/strict';
import BrowserEffectorProcess from '../processes/BrowserEffectorProcess.mjs';
import SynthiaUnit from '../core/SynthiaUnit.mjs';

class FakeExecutor {
  static isAvailable(){ return true; }
  constructor(){ this.started=false; this.url='about:blank'; this.submissions=0; }
  async start(){ this.started=true; return this; }
  async stop(){ this.started=false; }
  async navigate(url){ this.url=url; return {ok:true,url}; }
  async inspectPage(){ return { title:'Jobs', url:this.url, forms:[{id:'apply',fields:[{name:'name',label:'Name',type:'text'}]}], actions:[] }; }
  async clickAction(actionId){ return {ok:true,actionId}; }
  async setField(name,value){ return {ok:true,name,value}; }
  async fillDraft(draft){ return {ok:true,draft}; }
  async select(name,value){ return {ok:true,name,value}; }
  async upload(name,filePath){ return {ok:true,name,filePath}; }
  async submitForm(formId){ this.submissions++; return {ok:true,formId}; }
}

const arms=new BrowserEffectorProcess({executor:new FakeExecutor()});
const route=arms.route('open the job application and fill out the form');
assert.equal(route.kind,'browser');
assert.equal(route.task,'form-workflow');
const plan=arms.plan('open the job application and fill out the form',route);
assert.equal(plan.kind,'form-workflow');
assert.equal(arms.available(),true);
const blocked=await arms.submitForm('apply');
assert.equal(blocked.status,'authorization-required');
assert.equal(arms.executor.submissions,0);
const submitted=await arms.submitForm('apply',{authorized:true});
assert.equal(submitted.ok,true);
assert.equal(arms.executor.submissions,1);

// Synthia mounts the same sovereign effector capability without owning its implementation.
const unit=new SynthiaUnit({autoStart:false});
assert.ok(unit.browserEffector instanceof BrowserEffectorProcess);
assert.equal(typeof unit.autoCoder?.synthesizeChangeSet,'function');
assert.equal(typeof unit.sourceMutation?.stage,'function');
assert.equal(typeof unit.buildProcess?.run,'function');
const audit=unit.auditCapabilities();
assert.equal(audit.checks.browserContactEffectors,true);
assert.equal(audit.checks.sovereignAutoCoder,true);
assert.equal(audit.checks.sovereignSourceMutation,true);
assert.equal(audit.checks.sovereignBuildProcess,true);
assert.equal(audit.checks.fullAddressToolFactory,true);
assert.equal(audit.checks.kleinModuleContracts,true);
const process=unit.fabric.inspect('process:browser-effector');
assert.equal(process.role,'sovereign-effector');
assert.ok(process.members.includes('browser-act'));
unit.stopLife();
console.log('r21.15 browser effector wiring smoke passed');
