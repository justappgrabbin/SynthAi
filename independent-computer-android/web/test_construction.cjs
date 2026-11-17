global.acorn = require("./acorn.js");
require("./execution.js");
require("./polyglot.js");
require("./assembly.js");
require("./construction.js");
const a = require("node:assert/strict"),
  C = Construction,
  s = C.sample;
for (let i = 0; i < 64; i++) a.equal(C.value(C.record(i, { source: "test" })), i);
a.equal(C.value(C.combine(C.record(21, {}), C.record(42, {}), "XOR", { source: "test" })), 63);
a.throws(() => C.combine(C.record(1, {}), C.record(2, {}), "OR", {}));
a.equal(C.construct(s).status, "verified-on-cases");
a.equal(C.construct({ ...s, connection: null }).status, "blocked");
a.equal(
  C.construct({
    ...s,
    cases: [
      { input: 0, expected: 2 },
      { input: 63, expected: 0 },
    ],
  }).status,
  "rejected",
);
const bad = JSON.parse(JSON.stringify(s));
bad.parts[1].input.type = "text";
a.equal(C.construct(bad).status, "blocked");
console.log("70 construction assertions passed");
