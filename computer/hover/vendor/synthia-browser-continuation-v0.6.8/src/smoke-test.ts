import { createSynthiaRuntime } from './UPGRADES/bootstrap/createSynthiaRuntime';

async function main() {
  console.log('--- booting Synthia runtime ---');
  const { runtime, stack, operators } = createSynthiaRuntime();

  console.log('\n[1] Tools registered:', stack.adapters.length);
  console.log('    ids:', stack.adapters.map(a => a.toolId).join(', '));

  const hasEnhancedAutoLing = stack.adapters.some(a => a.toolId === 'autoling' && a.name === 'Enhanced AutoLing');
  const hasLiteAutoLing = stack.adapters.some(a => a.toolId === 'autoling-lite');
  const hasEnhancedDiseminer = stack.adapters.some(a => a.toolId === 'diseminer' && a.name === 'Enhanced DISEMINER');
  const hasLiteDiseminer = stack.adapters.some(a => a.toolId === 'diseminer-lite');

  console.log('\n[2] Canonical autoling is Enhanced:', hasEnhancedAutoLing);
  console.log('    autoling-lite retained:', hasLiteAutoLing);
  console.log('    Canonical diseminer is Enhanced:', hasEnhancedDiseminer);
  console.log('    diseminer-lite retained:', hasLiteDiseminer);

  console.log('\n[3] Boolean operator bank attached:', typeof operators, '- functions:', Object.keys(operators.functions || operators).length);

  console.log('\n[4] Running enhanced autoling through the real tool stack...');
  const ctx: any = {
    sessionId: 'smoke-1',
    inputValues: { intent: 'the gate learns from the user' },
    expression: { capabilities: [] },
  };
  const autolingAdapter = stack.adapters.find(a => a.toolId === 'autoling' && a.name === 'Enhanced AutoLing')!;
  const result = await autolingAdapter.execute(ctx);
  console.log('    success:', result.success);
  console.log('    ruleCount / stats present:', !!(result.outputValues?.output as any)?.stats);

  console.log('\n[5] Running enhanced diseminer through the real tool stack...');
  const diseminerAdapter = stack.adapters.find(a => a.toolId === 'diseminer' && a.name === 'Enhanced DISEMINER')!;
  const result2 = await diseminerAdapter.execute(ctx);
  console.log('    success:', result2.success);
  console.log('    sense present:', !!(result2.outputValues?.output as any)?.sense);

  console.log('\n[6] Running Morph MIR (ingest -> analyze -> remember -> regenerate)...');
  const sampleSource = `function greet(name) {\n  // says hello to the user\n  return "Hello, " + name + "!";\n}\n\nmodule.exports = { greet };\n`;
  const morphCtx: any = {
    sessionId: 'smoke-morph-1',
    inputValues: { name: 'greet.js', content: sampleSource, mode: 'morph_runtime' },
    expression: { capabilities: ['ingest', 'analyze', 'regenerate'] },
  };
  const morphAdapter = stack.adapters.find(a => a.toolId === 'morph-mir')!;
  const result3 = await morphAdapter.execute(morphCtx);
  const out = result3.outputValues?.output as any;
  console.log('    success:', result3.success);
  console.log('    intent understood:', out?.understanding?.intent);
  console.log('    functionality found:', out?.understanding?.functionality);
  console.log('    regeneration mode used:', out?.regeneration?.modeUsed);
  console.log('    regeneration isExact:', out?.regeneration?.isExact, '| isIdentical:', out?.regeneration?.isIdentical);
  console.log('    regeneration integrity:', out?.regeneration?.integrity, '| confidence:', out?.regeneration?.confidence);
  console.log('    original length:', out?.regeneration?.originalLength, '| reconstructed length:', out?.regeneration?.reconstructedLength);

  console.log('\n--- boot + smoke run complete ---');
}

main().catch(err => {
  console.error('SMOKE TEST FAILED:', err);
  process.exit(1);
});
