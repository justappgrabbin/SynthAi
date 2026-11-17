global.acorn = require("./acorn");
for (const f of ["execution", "polyglot", "assembly", "construction", "selection"])
  require("./" + f);
const a = require("node:assert/strict"),
  V = VariantSelection,
  s = V.sample;
let r = V.select(s);
a.equal(r.status, "selected");
a.deepEqual(r.passingPairs, [["working", "mask"]]);
a.equal(r.trials[0].training.status, "rejected");
a.deepEqual(r.preserved, s);
a.equal(V.select({ ...s, connections: [] }).status, "no-verified-assembly");
a.equal(
  V.select({ ...s, cases: [...s.cases.slice(0, -1), { input: 12, expected: 9 }] }).status,
  "no-verified-assembly",
);
a.equal(
  V.select({
    ...s,
    left: [s.left[1], { ...s.left[1], id: "other" }],
    connections: [...s.connections, { from: "other", to: "mask", evidence: "contract" }],
  }).status,
  "ambiguous",
);
a.equal(V.select({ ...s, cases: s.cases.slice(0, 3) }).status, "blocked");
console.log("8 selection assertions passed");
