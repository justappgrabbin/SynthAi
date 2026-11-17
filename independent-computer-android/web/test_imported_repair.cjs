const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const c = {};
c.globalThis = c;
vm.createContext(c);
for (const file of ["acorn.js", "execution.js", "imported-repair.js"])
  vm.runInContext(fs.readFileSync(__dirname + "/" + file, "utf8"), c);
const api = c.ImportedRepair;
let n = 0;
function t(fn) {
  fn();
  n++;
}
const files = [
  { path: "broken.js", text: "export function add(a,b){return a-b;}" },
  { path: "donor.js", text: "function sum(a,b){return a+b;}" },
  { path: "notes.txt", text: "function ignore(a){return a;}" },
  { path: "bad.js", text: "function (" },
];
const r = api.extract(files);
t(() => assert.equal(r.functions.length, 2));
t(() => assert.equal(r.issues.length, 1));
const target = r.functions[0],
  donor = r.functions[1],
  cases = [
    { args: [2, 3], expected: 5 },
    { args: [9, 4], expected: 13 },
    { args: [0, 0], expected: 0 },
    { args: [-4, 2], expected: -2 },
  ];
t(() => assert.equal(api.verify(target, cases).status, "failing-or-unsupported"));
t(() => assert.equal(api.verify(donor, cases).status, "verified-on-supplied-examples"));
const repaired = api.repair(target, cases, [donor]);
t(() => assert.equal(repaired.status, "repaired-on-supplied-examples"));
t(() => assert.equal(api.replay(repaired.artifact).status, "verified-on-supplied-examples"));
t(() => assert.equal(files[0].text, "export function add(a,b){return a-b;}"));
t(() => assert.equal(api.repair(target, cases, []).status, "no-verified-repair"));
t(() =>
  assert.equal(
    api.repair(target, cases, [donor, { ...donor, id: "another" }]).status,
    "ambiguous-repair",
  ),
);
t(() => assert.equal(api.repair(donor, cases, [target]).status, "already-verified"));
t(() => {
  const bad = { ...repaired.artifact, cases: [{ args: [1, 2], expected: 99 }] };
  assert.equal(api.replay(bad).status, "rejected");
});
t(() => assert.throws(() => api.verify(target, [{ args: [1], expected: 1 }]), /Cases/));
console.log("Imported repair " + n + "/" + n + " passed");
