const assert = require("node:assert/strict"),
  fs = require("fs"),
  vm = require("vm");
const ctx = { globalThis: null };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ["acorn.js", "execution.js", "mesh-scientist.js", "mesh-builder.js", "automata.js"])
  vm.runInContext(fs.readFileSync(__dirname + "/" + f, "utf8"), ctx);
const spec = {
  names: ["a", "b"],
  cases: [
    { args: [1, 2], expected: 3 },
    { args: [3, 4], expected: 7 },
    { args: [5, 6], expected: 11 },
    { args: [7, 8], expected: 15 },
  ],
};
let n = 0;
function t(f) {
  f();
  n++;
}
function finish(d) {
  let r;
  for (let i = 0; i < 500 && !r?.done; i++) r = ctx.MeshBuilder.step(d);
  assert(r?.done);
  return r.result;
}
t(() => {
  const r = finish(ctx.MeshBuilder.prepare(spec));
  assert.equal(r.status, "verified-on-supplied-examples");
  assert.match(r.artifact.source, /function main/);
});
t(() => {
  const r = finish(ctx.MeshBuilder.prepare(spec));
  assert.equal(ctx.MeshBuilder.replay(r.artifact).status, "verified-on-supplied-examples");
});
t(() => {
  const r = finish(ctx.MeshBuilder.prepare(spec));
  r.artifact.cases[0].expected = 999;
  assert.equal(ctx.MeshBuilder.replay(r.artifact).status, "rejected");
});
t(() => {
  const d = ctx.MeshBuilder.prepare(spec);
  for (let i = 0; i < 3; i++) ctx.MeshBuilder.step(d);
  const r = finish(JSON.parse(JSON.stringify(d)));
  assert(r.artifact);
});
t(() => {
  const r = finish(ctx.MeshBuilder.prepare(spec, { budget: 1 }));
  assert.equal(r.status, "budget-exhausted");
});
t(() => assert.throws(() => ctx.MeshBuilder.replay({}), /Invalid/));
t(() => {
  const m = new ctx.Automata.Mesh();
  m.add({
    id: "builder",
    kind: "builder",
    data: ctx.MeshBuilder.prepare(spec),
    step: ctx.MeshBuilder.step,
  });
  for (let i = 0; i < 500 && m.tick(); i++);
  assert.equal(m.jobs.get("builder").status, "done");
  assert(m.jobs.get("builder").result.artifact);
});
console.log("Mesh builder " + n + "/" + n + " tests passed");
