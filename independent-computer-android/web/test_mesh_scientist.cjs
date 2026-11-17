const assert = require("node:assert/strict"),
  fs = require("fs"),
  vm = require("vm");
const ctx = { globalThis: null };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ["acorn.js", "execution.js", "mesh-scientist.js"])
  vm.runInContext(fs.readFileSync(__dirname + "/" + f, "utf8"), ctx);
const w = ctx.MeshScientist;
let n = 0;
const t = (f) => {
  f();
  n++;
};
const spec = {
  names: ["a", "b"],
  cases: [
    { args: [1, 2], expected: 3 },
    { args: [3, 4], expected: 7 },
    { args: [5, 6], expected: 11 },
    { args: [7, 8], expected: 15 },
  ],
};
t(() => assert.throws(() => w.state({ names: ["a"], cases: [] }), /Invalid/));
t(() => {
  const s = w.state(spec);
  let r;
  for (let i = 0; i < 200 && !r?.done; i++) r = w.step(s);
  assert.equal(r.done, true);
  assert.equal(r.result.status, "example-verified");
});
t(() => {
  let s = w.state(spec);
  for (let i = 0; i < 3; i++) w.step(s);
  s = JSON.parse(JSON.stringify(s));
  let r;
  for (let i = 0; i < 200 && !r?.done; i++) r = w.step(s);
  assert.equal(r.result.status, "example-verified");
});
t(() => {
  const s = w.state(spec, { budget: 1 });
  w.step(s);
  assert.equal(w.step(s).result.status, "budget-exhausted");
});
t(() => {
  const s = w.state(
    { ...spec, cases: spec.cases.map((c) => ({ ...c, expected: 100 })) },
    { budget: 3 },
  );
  for (let i = 0; i < 4; i++) w.step(s);
  assert.equal(s.result.status, "budget-exhausted");
});
console.log("Mesh scientist " + n + "/" + n + " tests passed");
