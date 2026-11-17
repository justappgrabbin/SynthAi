const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const root = { globalThis: null, TextEncoder, TextDecoder, Blob, Date, JSON };
root.globalThis = root;
vm.createContext(root);
for (const file of ["acorn.js", "project-intake.js", "self-maintenance.js", "adaptive-cycle.js"])
  vm.runInContext(fs.readFileSync(__dirname + "/" + file, "utf8"), root, { filename: file });
const files = [
  { path: "src/main.js", text: "import {x} from './wrong/util.js'; export const main=()=>x;" },
  { path: "src/lib/util.js", text: "export const x=4;" },
];
const r = root.AdaptiveCycle.cycle(files);
assert.equal(r.commits.length, 1);
assert.equal(r.final.dependencies.unresolved.length, 0);
assert.match(r.files[0].text, /\.\/lib\/util\.js/);
assert.match(files[0].text, /wrong/);
assert.equal(r.commits[0].verified, "static-only");
const bytes = new Uint8Array([0, 255, 3]);
const rev = root.AdaptiveCycle.revision(r.files, [
  { path: "src/main.js", text: files[0].text, bytes: new TextEncoder().encode(files[0].text) },
  { path: "asset.bin", bytes },
]);
assert.deepEqual([...rev[1].bytes], [0, 255, 3]);
console.log("Adaptive cycle verified");
