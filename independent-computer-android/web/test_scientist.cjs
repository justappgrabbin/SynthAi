const assert = require("node:assert/strict");
global.acorn = require("./acorn.js");
require("./execution.js");
require("./polyglot.js");
require("./scientist.js");
let s = Scientist.sample,
  x = Scientist.discover(s.parts, s.cases, s.names);
assert.equal(x.status, "example-verified");
assert(x.holdout.every((c) => c.pass));
assert.equal(LocalExecution.execute(x.source, [15, 3]).value, 24);
assert.equal(Scientist.discover([], s.cases, s.names, 1).status, "budget-exhausted");
assert.throws(() => Scientist.discover([], [], s.names));
console.log("5 scientist assertions passed", x.expression, x.tested);
