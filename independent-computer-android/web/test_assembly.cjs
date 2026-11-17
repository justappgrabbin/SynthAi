global.acorn = require("./acorn.js");
require("./execution.js");
require("./polyglot.js");
require("./assembly.js");
const a = require("node:assert/strict"),
  s = Assembly.sample;
a.equal(
  Assembly.verify(s.parts, s.graph, s.cases).every((x) => x.pass),
  true,
);
a.equal(Assembly.run(s.parts, s.graph, { a: 5, b: 2 }).trace[0].node, "mixed");
a.equal(Assembly.run(s.parts, s.graph, { a: 5 }).status, "blocked");
a.equal(Assembly.run([], s.graph, { a: 5, b: 2 }).status, "blocked");
a.equal(
  Assembly.run(s.parts, [{ id: "x", part: "xor", args: [{ ref: "x" }, { literal: 1 }] }], {})
    .status,
  "blocked",
);
a.equal(
  Assembly.verify(s.parts, s.graph, [{ inputs: { a: 5, b: 2 }, expected: { masked: 99 } }])[0].pass,
  false,
);
console.log("6 assembly assertions passed");
