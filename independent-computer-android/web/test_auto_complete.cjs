const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const c = {};
c.globalThis = c;
vm.createContext(c);
for (const f of [
  "acorn.js",
  "execution.js",
  "imported-repair.js",
  "scientist.js",
  "auto-complete.js",
])
  vm.runInContext(fs.readFileSync(__dirname + "/" + f, "utf8"), c);
let n = 0;
function t(f) {
  f();
  n++;
}
const cases = [
  { args: [2, 3], expected: 5 },
  { args: [9, 4], expected: 13 },
  { args: [0, 0], expected: 0 },
  { args: [-4, 2], expected: -2 },
  { args: [12, 8], expected: 20 },
  { args: [5, 5], expected: 10 },
];
const target = { path: "broken.js", text: "export function add(a,b){return a-b;}" };
const donor = { path: "helper.js", text: "function sum(a,b){return a+b;}" };
const api = c.AutoCompletion;
t(() =>
  assert.equal(
    api.complete([target, donor], "broken.js#add", cases).status,
    "verified-donor-repair",
  ),
);
const generated = api.complete([target], "broken.js#add", cases, { budget: 500 });
t(() => assert.equal(generated.status, "verified-generated-repair"));
t(() => assert.equal(api.replay(generated.artifact).status, "verified-on-supplied-examples"));
t(() => assert.equal(target.text, "export function add(a,b){return a-b;}"));
t(() =>
  assert.equal(
    api.complete(
      [target, donor, { path: "other.js", text: "function plus(a,b){return a+b;}" }],
      "broken.js#add",
      cases,
    ).status,
    "ambiguous-repair",
  ),
);
t(() =>
  assert.equal(
    api.complete([{ path: "ok.js", text: "function add(a,b){return a+b;}" }], "ok.js#add", cases)
      .status,
    "already-verified",
  ),
);
t(() => assert.throws(() => api.complete([target], "broken.js#add", cases.slice(0, 2)), /4–100/));
t(() =>
  assert.equal(
    api.replay({ ...generated.artifact, cases: [{ args: [1, 2], expected: 99 }] }).status,
    "rejected",
  ),
);
console.log("Auto completion " + n + "/" + n + " passed");
