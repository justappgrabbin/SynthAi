import fs from 'node:fs';
import assert from 'node:assert/strict';
const paths=['processes/ProcessFabric.mjs','android/app/src/main/assets/www/processes/ProcessFabric.mjs'];
for(const p of paths){
  const s=fs.readFileSync(p,'utf8');
  assert(!/import\s*\{\s*Worker\s*\}\s*from\s*['\"]node:worker_threads['\"]/.test(s),`${p} still statically imports node:worker_threads`);
  assert(s.includes("await import('node:worker_threads')"),`${p} missing lazy Node worker import`);
}
const serve=fs.readFileSync('bootstrap/serve.mjs','utf8');
assert(serve.includes("host=process.env.HOST||'127.0.0.1'"),'server must default to localhost');
assert(fs.readFileSync('.gitignore','utf8').split(/\r?\n/).includes('.synthia/'),'runtime state must be ignored from distribution');
console.log('r20 browser/security shell: PASS');
