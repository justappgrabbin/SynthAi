const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const dir = __dirname;
const ctx = vm.createContext({});
for (const f of ["acorn.js", "execution.js", "learning.js"])
  vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx);
const L = ctx.ComputerLearning;
const baseline = "function main(x){return x+1}",
  better = "function main(x){return x*2}",
  bad = "function main(x){return 0}";
const cases = [
  { args: [1], expected: 2 },
  { args: [2], expected: 4 },
];
let s = L.make("trial", baseline, "main", cases);
assert.equal(s.revision, 0);
assert.equal(L.assess(s.source, s.entry, s.cases).passed, 1);
let p = L.propose(s, bad);
assert.equal(p.record.status, "rejected");
s = p.state;
p = L.propose(s, better);
assert.equal(p.record.status, "eligible");
s = p.state;
assert.throws(() => L.promote(s, 2), /approval/);
s = L.promote(s, 2, true);
assert.equal(s.revision, 1);
assert.equal(L.assess(s.source, s.entry, s.cases).passed, 2);
let f = L.addFeedback(s, [{ args: [3], expected: 6 }]);
assert.equal(f.evaluation.passed, 3);
assert.equal(f.state.cases.length, 3);
s = L.rollback(s);
assert.equal(s.revision, 0);
assert.equal(s.source, baseline);
assert.equal(s.cases.length, 2);
p = L.propose(s, better, [{ args: [5], expected: 11 }]);
assert.equal(p.record.status, "rejected");
assert.throws(() => L.promote(p.state, p.record.id, true), /not eligible/);
assert.throws(() => L.make("x", better, "main", []), /cases/);
console.log("Learning tests: 12 assertions passed");
