import test from 'node:test';
import assert from 'node:assert/strict';
import { SymbolCompositionGraph } from '../components/organism/integration/SymbolCompositionGraph.mjs';
import { compositionSurface } from '../components/organism/browser/SymbolCompositionView.mjs';
import { StateOrganismBridge, canonicalToFoundationAddress } from '../components/organism/integration/StateOrganismBridge.mjs';
import { ScientificSynthiaAssembly } from '../src/index.mjs';
import { LivingWorldView } from '../components/organism/browser/LivingWorldView.mjs';
import { OrganismExpression } from '../components/organism/browser/OrganismExpression.mjs';

const fullAddress = {planetary:'Sun',dimension:'Movement',gate:43,line:1,color:1,tone:1,base:1,degree:0,minute:0,second:0,arc:0,zodiac:1,house:1};

function memory() {
  const values = new Map();
  return { get: (a,b) => values.has(`${a}:${b}`) ? {value:structuredClone(values.get(`${a}:${b}`))} : null,
    upsert: (a,b,v) => values.set(`${a}:${b}`,structuredClone(v)) };
}

test('overlapping words and their parent retain the same occurrence after restart', () => {
  const store=memory(), graph=new SymbolCompositionGraph({memory:store});
  for(const [id,symbol] of [['y','Y'],['o','O'],['u','U'],['t','T'],['o2','O']]) {
    graph.occurrence({id,symbol,address:fullAddress,provenance:[{sourceId:'letter-field'}]});
  }
  const you=graph.compose(['y','o','u'],{address:fullAddress}), too=graph.compose(['t','o','o2'],{address:fullAddress});
  assert.notEqual(you.id,too.id);
  assert.strictEqual(you.members[1].member,too.members[1].member);
  const phrase=graph.compose([you.id,too.id],{address:fullAddress});
  assert.strictEqual(phrase.members[0].member,you);
  assert.equal(graph.parents('o').length,2);
  const html=compositionSurface(graph);
  assert.equal((html.match(/data-occurrence-id="o"/g)||[]).length,4);
  const restored=new SymbolCompositionGraph({memory:store});
  assert.strictEqual(restored.get(you.id).members[1].member,restored.get(too.id).members[1].member);
  assert.strictEqual(restored.get(phrase.id).members[0].member,restored.get(you.id));
  assert.equal(restored.snapshot().events.length,8);
  assert.deepEqual(restored.get('o').address,fullAddress);
  assert.throws(()=>restored.occurrence({id:'o',symbol:'X'}),/unique id/);
  assert.equal(restored.get('o').symbol,'O');
});

test('partial and invalid addresses remain unresolved and recoverable without sentence admission', () => {
  const address=canonicalToFoundationAddress({gate:43,line:0,dimension:'Unknown'});
  assert.deepEqual(address.resolved,{gate:43});
  assert.ok(address.unresolved.some(x=>x.field==='line'&&x.reason==='invalid'));
  assert.ok(address.unresolved.some(x=>x.field==='tone'&&x.reason==='missing'));
  const store=memory();
  const bridge=new StateOrganismBridge({unit:{memory:store}});
  const record=bridge.sentence({gate:43});
  assert.equal(record.executable,false);
  assert.equal(bridge.stateSpace.sentences.size,0);
  assert.equal(bridge.stateSpace.events.size,0);
  const restored=new StateOrganismBridge({unit:{memory:store}});
  assert.equal(restored.unresolvedRecords[0].id,record.id);
  assert.deepEqual(restored.unresolvedRecords[0].address.resolved,{gate:43});
});

test('assembly and view read the organism-owned composition graph', async () => {
  const assembly=new ScientificSynthiaAssembly({autoStart:false});
  try {
    assert.strictEqual(assembly.compositions,assembly.organism.compositions);
    const symbol=assembly.registerSymbol({id:`fixture:${crypto.randomUUID()}`,symbol:'<',address:fullAddress});
    const composition=assembly.composeSymbols([symbol.id],{address:fullAddress});
    assert.strictEqual(assembly.organism.compositions.get(composition.id).members[0].member,symbol);
    assert.match(compositionSurface(assembly.organism.compositions),/&lt;/);
    const root={innerHTML:''};
    const view=new LivingWorldView({root,unit:assembly.organism});
    new OrganismExpression({unit:assembly.organism,root:{body:{}},worldView:view}).apply('inspect shared symbols');
    assert.ok(root.innerHTML.includes(`data-occurrence-id="${symbol.id}"`));
    assert.match(root.innerHTML,/&lt;/);
    assert.ok(assembly.snapshot().compositions.nodes.some(x=>x.id===composition.id));
  } finally { await assembly.close(); }
});

test('unaddressed introductions stay retained but never enter the symbol surface', () => {
  const graph=new SymbolCompositionGraph();
  const pending=graph.occurrence({id:'pending',symbol:'X',address:{gate:43}});
  const complete=graph.occurrence({id:'complete',symbol:'Y',address:fullAddress});
  graph.compose([pending.id,complete.id],{address:fullAddress});
  graph.compose([complete.id]);
  assert.equal(compositionSurface(graph),'');
  assert.equal(graph.get('pending').addressBinding.status,'held');
  assert.equal(graph.snapshot().nodes.length,4);
});
