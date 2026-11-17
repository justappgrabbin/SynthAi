const assert = require("node:assert/strict"),
  fs = require("fs"),
  vm = require("vm");
global.acorn = require("./acorn.js");
require("./analysis.js");
const { analyze, topology } = ComputerAnalysis;
let a = {
    id: "a",
    archive: "x",
    path: "src/a.js",
    text: 'import {b} from "./b.js"; export function f(){return b()}',
  },
  b = { id: "b", archive: "x", path: "src/b.js", text: "export const b=()=>1" };
let r = analyze(a, [a, b]);
assert.equal(r.status, "parsed");
assert.equal(r.dependencies[0].status, "resolved");
assert.equal(r.dependencies[0].targets[0], "b");
assert.equal(r.structure[0].name, "f");
assert.equal(r.calls[0].name, "b");
assert.equal(analyze(a, [a]).dependencies[0].status, "missing");
assert.equal(analyze({ ...a, text: "const =" }, []).status, "parse failed");
assert.equal(analyze({ ...a, path: "x.py" }, []).language, "non-JavaScript");
let g = topology(vm.runInNewContext(fs.readFileSync("topology.js", "utf8") + "\nHD_SOURCE"));
assert.equal(g.edges.length, 36);
assert.equal(g.pair(20, 10).group, "integration");
assert.equal(g.pair(1, 2), null);
assert.ok(g.neighbors(34).includes(57));
console.log("12 assertions passed");
