const assert = require("node:assert/strict"),
  fs = require("fs"),
  vm = require("vm");
const c = { globalThis: null };
c.globalThis = c;
vm.createContext(c);
for (const f of ["acorn.js", "execution.js", "mesh-scientist.js", "mesh-builder.js", "reuse.js"])
  vm.runInContext(fs.readFileSync(__dirname + "/" + f, "utf8"), c);
let n = 0;
const t = (f) => {
  f();
  n++;
};
function make(name, expr) {
  const source = `function main(a,b){return ${expr};}`,
    cases = [1, 2, 3, 4].map((i) => ({
      args: [i, i + 1],
      expected: expr === "a+b" ? 2 * i + 1 : i * (i + 1),
    }));
  return {
    schema: "independent-generated-component/v1",
    id: name,
    status: "verified-on-supplied-examples",
    source,
    inputs: ["a", "b"],
    cases,
  };
}
const a = make("add", "a+b"),
  b = make("multiply", "a*b");
const contract = {
  inputs: ["a", "b"],
  firstArgs: ["a", "b"],
  secondArgs: ["$previous", "b"],
  cases: [
    { args: [1, 2], expected: 6 },
    { args: [3, 4], expected: 28 },
    { args: [5, 6], expected: 66 },
    { args: [7, 8], expected: 120 },
  ],
};
t(() => assert.equal(c.ComponentReuse.validate(a), a));
t(() => {
  const r = c.ComponentReuse.compose([a, b], contract);
  assert.equal(r.status, "verified-on-supplied-examples");
  assert.equal(r.artifact.dependencies.length, 2);
  assert.equal(c.ComponentReuse.replay(r.artifact).status, "verified-on-supplied-examples");
});
t(() => {
  const r = c.ComponentReuse.compose([a, b], {
    ...contract,
    cases: contract.cases.map((x) => ({ ...x, expected: 0 })),
  });
  assert.equal(r.status, "rejected");
  assert.equal(r.artifact, null);
});
t(() =>
  assert.throws(
    () => c.ComponentReuse.compose([a, b], { ...contract, secondArgs: ["a", "b"] }),
    /No directional/,
  ),
);
t(() =>
  assert.throws(
    () => c.ComponentReuse.compose([a, b], { ...contract, firstArgs: ["a", "missing"] }),
    /Unresolved/,
  ),
);
t(() => {
  const bad = { ...a, cases: [{ args: [1, 2], expected: 999 }] };
  assert.throws(() => c.ComponentReuse.compose([bad, b], contract), /replay failed/);
});
t(() => {
  const r = c.ComponentReuse.compose([a, b], contract);
  r.artifact.cases[0].expected = 1;
  assert.equal(c.ComponentReuse.replay(r.artifact).status, "rejected");
});
console.log("Reuse " + n + "/" + n + " tests passed");
