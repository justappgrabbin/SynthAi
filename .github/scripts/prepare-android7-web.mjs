import { readFile, writeFile } from 'node:fs/promises';

const appUrl = new URL('../../public/computer-app.mjs', import.meta.url);
const outputUrl = new URL('../../public/computer-app.android7-entry.mjs', import.meta.url);
let source = await readFile(appUrl, 'utf8');

source = source.replaceAll("from '/computer-runtime/", "from './computer-runtime/");

const match = source.match(/^(?:import[^\n]*\n)+/);
if (!match) throw new Error('Android 7 entry: import block not found');

const imports = match[0];
const body = source.slice(imports.length);

const wrapped = imports +
  "import './android7-polyfills.js';\n\n" +
  ";(async function () {\n" + body + "\n})().catch(function (error) {\n" +
  "  var message = String(error && (error.stack || error.message) || error || 'unknown boot error');\n" +
  "  try { console.error('SynthAI Android 7 boot failed: ' + message); } catch (_) {}\n" +
  "  window.SynthAIAndroid7BootError = message;\n" +
  "  var evidence = document.getElementById('runtimeEvidence');\n" +
  "  if (evidence) evidence.textContent = 'Computer boot failed: ' + message;\n" +
  "  var status = document.getElementById('runtimeStatus');\n" +
  "  if (status) status.textContent = 'FAILED';\n" +
  "});\n";

await writeFile(outputUrl, wrapped);
console.log('Prepared Android 7 WebView entry');
