import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import SynthiaUnit from '../core/SynthiaUnit.mjs';
import SourceConnectome from '../organism/SourceConnectome.mjs';
import NodeProjectWatchSense from '../runtime/NodeProjectWatchSense.mjs';
import AndroidReproductionExecutor from '../runtime/AndroidReproductionExecutor.mjs';

const project=[
  {filename:'src/main.mjs',content:"import {run} from './worker.mjs'; import missing from './missing.mjs'; export const main=()=>run();"},
  {filename:'src/worker.mjs',content:"import {helper} from './helper.mjs'; export const run=()=>helper();"},
  {filename:'src/helper.mjs',content:"import {run} from './worker.mjs'; export const helper=()=>42;"}
];
const graph=new SourceConnectome(project).snapshot();
assert.equal(graph.files,3);
assert.equal(graph.nodes.find(x=>x.filename==='src/main.mjs').missing[0].spec,'./missing.mjs');
assert.equal(graph.cycles.length,1);

const u=new SynthiaUnit({autoStart:false});
const report=u.inspectCodeProject(project);
assert.equal(report.status,'injured');
assert.equal(report.injuries.filter(x=>x.type==='missing-relative-dependency').length,1);
assert.equal(report.injuries.filter(x=>x.type==='dependency-cycle').length,1);
const proposals=u.proposeCodeRepairs(report);
const survival=proposals.find(x=>x.repairClass==='survival-repair-only');
assert.equal(survival.status,'proposed');
assert.equal(survival.proposal.tool,'propose_file_change');
assert.match(survival.proposal.arguments.content,/SURVIVAL REPAIR CANDIDATE/);
assert.match(survival.proposal.arguments.content,/throw new Error/,'stub must fail loudly rather than fake restored function');
const structural=proposals.find(x=>x.repairClass==='structural-repair-required');
assert.equal(structural.status,'diagnosed');
assert.equal(structural.strategy.kind,'refactor-cycle');

const injury=report.injuries.find(x=>x.type==='missing-relative-dependency');
const strategy={kind:'functional-source-repair',target:'src/missing.mjs',content:'export default () => 7;'};
u.recordCodeRepairOutcome({injury,strategy,ok:true,evidence:[{type:'smoke-test',passed:true}]});
const again=u.inspectCodeProject(project);
const recalled=again.injuries.find(x=>x.fingerprint===injury.fingerprint).remembered;
assert.equal(recalled[0].success,1);
const rememberedProposal=u.proposeCodeRepairs(again).find(x=>x.injuryId===injury.id);
assert.equal(rememberedProposal.recalled,true);
assert.equal(rememberedProposal.repairClass,'functional-restoration-candidate');

const audit=u.auditCapabilities();
assert.equal(audit.pass,true,JSON.stringify(audit.missing));
assert.equal(audit.checks.sourceCodeImmuneSystem,true);
u.stopLife();

const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'synthia-watch-'));
await fs.writeFile(path.join(tmp,'a.mjs'),'export const a=1;');
let event=null;
const sense=new NodeProjectWatchSense({root:tmp,onChange:e=>{event=e;}});
await sense.start();
await fs.writeFile(path.join(tmp,'a.mjs'),'export const a=2;');
const delta=await sense.poll();
assert.equal(delta.modified.length,1);
assert.equal(event.modified.length,1);
sense.stop();

const reproduction=new AndroidReproductionExecutor({root:process.cwd()});
const dry=await reproduction.build({run:false});
assert.equal(dry.run,false);
assert.ok(dry.commands.includes('npx cap sync android'));

console.log(JSON.stringify({ok:true,connectome:{files:graph.files,cycles:graph.cycles.length},immune:{injuries:report.injuries.length,proposals:proposals.length,remembered:recalled[0]},watch:{modified:delta.modified.length},reproduction:{dryRun:true,steps:dry.steps},audit},null,2));
