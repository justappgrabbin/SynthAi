const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const c = {};
c.globalThis = c;
vm.createContext(c);
for (const f of ["acorn.js", "execution.js", "scientist.js", "project-completion.js"])
  vm.runInContext(fs.readFileSync(__dirname + "/" + f, "utf8"), c);
let n = 0;
function t(fn) {
  fn();
  n++;
}
const files = [
  { path: "app.js", text: "function app(a,b){return helper(a,b)*2;}" },
  { path: "utils.js", text: "function twice(a){return a*2;}" },
];
const cases = [
  { args: [2, 3], expected: 5 },
  { args: [0, 4], expected: 4 },
  { args: [-3, 7], expected: 4 },
  { args: [8, 9], expected: 17 },
  { args: [5, 5], expected: 10 },
  { args: [12, 1], expected: 13 },
];
const spec = [{ name: "helper", params: ["a", "b"], cases }];
const options = {
  budget: 1000,
  integrationCases: [
    { entry: "app", cases: cases.map((x) => ({ args: x.args, expected: x.expected * 2 })) },
  ],
};
const api = c.ProjectCompletion;
let graph = api.inspect(files);
t(() => assert.equal(graph.missing[0].name, "helper"));
t(() => assert.equal(graph.definitions.length, 2));
const result = api.complete(files, spec, options);
t(() => assert.equal(result.status, "verified-on-supplied-integration-tests"));
t(() => assert.equal(api.replay(result.artifact).status, "verified-on-supplied-integration-tests"));
t(() => assert.equal(files[0].text, "function app(a,b){return helper(a,b)*2;}"));
t(() => assert.equal(result.artifact.generated[0].name, "helper"));
t(() => assert.equal(api.complete(files, [], options).status, "contracts-required"));
t(() =>
  assert.equal(
    api.complete(files, [{ ...spec[0], params: ["a"] }], options).status,
    "arity-mismatch",
  ),
);
t(() =>
  assert.equal(api.complete(files, spec, { budget: 1000 }).status, "integration-tests-required"),
);
t(() =>
  assert.equal(
    api.complete(files, spec, {
      ...options,
      integrationCases: [{ entry: "app", cases: [{ args: [2, 3], expected: 99 }] }],
    }).status,
    "integration-verification-failed",
  ),
);
t(() =>
  assert.equal(
    api.inspect([{ path: "x.js", text: 'import x from "y"; function f(){return x();}' }]).issues[0]
      .type,
    "external-module-dependency",
  ),
);
t(() =>
  assert.equal(
    api.complete(
      [{ path: "x.js", text: 'import x from "y"; function f(){return x();}' }],
      spec,
      options,
    ).status,
    "unsupported-project-structure",
  ),
);
console.log("Project completion " + n + "/" + n + " passed");
