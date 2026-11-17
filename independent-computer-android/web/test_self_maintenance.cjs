const assert = require("node:assert/strict"),
  fs = require("fs"),
  vm = require("vm");
const c = { module: { exports: {} }, globalThis: {}, TextEncoder, TextDecoder, Uint8Array, Blob };
vm.runInNewContext(fs.readFileSync(__dirname + "/project-intake.js", "utf8"), c);
c.globalThis.ProjectIntake = c.module.exports;
c.module = { exports: {} };
vm.runInNewContext(fs.readFileSync(__dirname + "/acorn.js", "utf8"), c);
c.globalThis.acorn = c.acorn;
c.module = { exports: {} };
vm.runInNewContext(fs.readFileSync(__dirname + "/self-maintenance.js", "utf8"), c);
const m = c.module.exports;
const files = [
  { path: "src/main.js", text: "import {x} from './wrong/util'\nexport const y=x" },
  { path: "src/util.js", text: "export const x=2" },
];
const p = m.propose(files);
assert.equal(p.proposals.length, 1);
const a = m.apply(files, p.proposals[0]);
assert.equal(a.status, "verified-static-repair");
assert.equal(m.inspect(a.files).dependencies.unresolved.length, 0);
assert.equal(m.rollback(a.files, a.record)[0].text, files[0].text);
assert.throws(() => m.apply([{ ...files[0], text: "modified" }, files[1]], p.proposals[0]));
console.log("Self-maintenance checks passed");
