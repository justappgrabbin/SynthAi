#!/usr/bin/env node
/**
 * chat.mjs - the chat interface that was missing.
 * Run: node chat.mjs
 */
import readline from 'node:readline';
import { createSynthia } from './synthia.mjs';

console.log('Booting Synthia...\n');
const synthia = await createSynthia();
const diag = synthia.diagnostics();
console.log('Loaded:', diag);
console.log('\nSynthia chat. Type a message, or ".diag" / ".resolver <ModuleName>" / ".exit"\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'you> ' });

rl.on('line', async (line) => {
  const text = line.trim();
  if (!text) { rl.prompt(); return; }

  if (text === '.exit') { rl.close(); return; }
  if (text === '.diag') { console.log(synthia.diagnostics()); rl.prompt(); return; }
  if (text.startsWith('.resolver ')) {
    const name = text.slice('.resolver '.length).trim();
    try {
      const mod = await synthia.resolver.resolve(name);
      console.log(mod);
    } catch (e) { console.log('error:', e.message); }
    rl.prompt();
    return;
  }
  if (text === '.list') {
    console.log(synthia.resolver.list().map(m => `${m.name}${m.variantCount ? `  (+${m.variantCount} archived variant${m.variantCount>1?'s':''})` : ''}`).join('\n'));
    rl.prompt();
    return;
  }

  try {
    const reply = await synthia.chat(text);
    console.log('synthia>', JSON.stringify(reply, null, 2));
  } catch (e) {
    console.log('synthia> (error, but still alive):', e.message);
  }
  rl.prompt();
});

rl.prompt();

rl.on('close', () => { console.log('bye'); process.exit(0); });
