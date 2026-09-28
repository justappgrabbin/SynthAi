import {
  HOUSES,
  transformHouse,
  createPrimaryAutomata,
  AutomataMesh,
  MorphingWorkspace,
  CompanionAutomata,
  ConfidenceLedger,
  createAcodeHost,
  StateSpaceAssociationResolver,
  GenerativeEmergence,
  ExpressionField,
  Automaton,
  bootstrapATO,
} from './src/index.mjs';

console.log('\nATO ENGINE — LOCAL VERIFICATION DEMO');
console.log('====================================');
console.log(`Klein state space: ${HOUSES.length} houses × ${HOUSES[0].members.length} rows = ${HOUSES.flatMap(h => h.members).length} states`);

const houseTransform = transformHouse('abysmal', 'keepingStill');
console.log(`House transform: ${houseTransform.source} → ${houseTransform.target}`);
console.log(`Operator: ${houseTransform.operator}; all rows valid: ${houseTransform.valid}`);

const automatons = createPrimaryAutomata();
console.log(`Standalone Automatons: ${automatons.map(tool => tool.id).join(', ')}`);
const seededSystem = bootstrapATO();
console.log(`Generic setup organs: ${seededSystem.tools.map(tool => tool.id).join(', ')}`);

const mesh = new AutomataMesh();
for (const tool of automatons) mesh.add(tool);
console.log(`Mesh members: ${mesh.snapshot().automatons.length}`);

const workspace = new MorphingWorkspace({
  id: 'personal',
  views: [{ id: 'chat', type: 'conversation', automatonId: 'conversation', state: {} }],
  focus: 'chat',
});
workspace.morph([
  { type: 'open', view: { id: 'tools', type: 'automata-tray', region: 'bottom', state: {} } },
], { rationale: 'Show available Automatons', automatons: ['conversation'] });
console.log(`Workspace views after morph: ${workspace.current.views.map(view => view.id).join(', ')}`);
workspace.undo();
console.log(`Workspace views after undo: ${workspace.current.views.map(view => view.id).join(', ')}`);

const companion = new CompanionAutomata({ mesh, workspace, address: 'demo:personal' });
console.log(`Companion mode: ${companion.mode}; self-reference: ${companion.introspect().selfId}`);

const confidence = new ConfidenceLedger();
confidence.grant('local-demo', { threshold: 0.7, effects: ['run'] });
confidence.record('local-demo', { kind: 'success', weight: 4 });
console.log(`Autonomy policy eligible: ${confidence.evaluate({ taskClass: 'local-demo', effect: 'run' }).authorized}`);

const host = createAcodeHost({
  terminal: async input => ({ exitCode: 0, command: input.command, local: true }),
});
const terminalResult = await host.execute(['process', 'shell'], { command: 'echo ATO-local' });
console.log(`Resolved host faculty: ${terminalResult.facultyId}`);

const expression = new ExpressionField({ address: { mode:'macro', gate:63, line:1, color:1, tone:1, base:1 } });
const generator = new GenerativeEmergence({ resolver: new StateSpaceAssociationResolver() });
const makeDemoTool = (id, gate, operation) => new Automaton({
  id,
  address:{ mode:'macro', gate, line:1, color:1, tone:1, base:1 },
  structure:'bigram', activeLevels:[1], functionalLevel:'mind',
  ports:[{ id:'in',direction:'input',type:'number' },{ id:'out',direction:'output',type:'number' }],
  implementation:operation,
});
const doubling = makeDemoTool('doubling', 1, value => value * 2);
const incrementing = makeDemoTool('incrementing', 2, value => value + 1);
const emergence = generator.consider(doubling, incrementing);
console.log(`Generative association: ${emergence.status}; operator: ${emergence.association.gateRelation.operator}`);
if (emergence.status === 'candidate') {
  const generated = generator.synthesize(emergence.id, { expressionField: expression });
  console.log(`Generated standalone Tool: ${generated.id}; result for 3: ${await generated.call(3)}`);
  console.log(`Creation expressions: ${expression.snapshot().events.length}`);
}
console.log('\nDemo completed without a backend.\n');
