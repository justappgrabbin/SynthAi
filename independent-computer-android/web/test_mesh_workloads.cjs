const assert = require("node:assert/strict"),
  fs = require("fs"),
  vm = require("vm");
const context = { globalThis: null };
context.globalThis = context;
vm.createContext(context);
for (const f of ["construction.js", "mesh-workloads.js"])
  vm.runInContext(fs.readFileSync(__dirname + "/" + f, "utf8"), context);
const w = context.MeshWorkloads;
let n = 0;
function t(fn) {
  fn();
  n++;
}
t(() => {
  let s = w.rvState(Uint8Array.from([0x13, 0x05, 0x70, 0, 0x13, 0x05, 0x55, 0, 0x73, 0, 0x10, 0]));
  assert.equal(w.rvStep(s, 1).done, false);
  assert.equal(w.rvStep(s, 1).done, false);
  assert.equal(w.rvStep(s, 1).result.result, 12);
});
t(() => {
  let s = w.rvState(Uint8Array.from([0x6f, 0, 0, 0]), { fuel: 4 });
  for (let i = 0; i < 4; i++) w.rvStep(s, 1);
  assert.throws(() => w.rvStep(s, 1), /fuel/);
});
t(() => {
  let s = w.rvState(Uint8Array.from([0x73, 0, 0x10, 0]));
  assert.equal(w.rvStep(s, 1).done, true);
});
t(() => {
  assert.throws(() => w.rvState(Uint8Array.from([1, 2, 3])), /Invalid/);
});
t(() => {
  const s = w.selectionState({
    left: [{ id: "a", language: "js" }],
    right: [{ id: "b" }],
    connections: [],
    cases: [{ input: 0 }, { input: 1 }, { input: 2 }, { input: 3 }],
  });
  const r = w.selectionStep(s);
  assert.equal(r.done, true);
  assert.equal(r.result.status, "no-verified-assembly");
});
t(() => {
  let s = w.rvState(Uint8Array.from([0x13, 0x05, 0x70, 0, 0x73, 0, 0x10, 0]));
  w.rvStep(s, 1);
  s = JSON.parse(JSON.stringify(s));
  assert.equal(w.rvStep(s, 1).result.result, 7);
});
console.log("Mesh workloads " + n + "/" + n + " tests passed");
