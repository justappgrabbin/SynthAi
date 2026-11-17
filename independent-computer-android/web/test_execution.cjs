const assert = require("node:assert/strict");
global.acorn = require("./acorn.js");
require("./execution.js");
const { execute, verify } = LocalExecution;
assert.equal(execute("function main(a,b){return a^b}", [5, 1]).value, 4);
assert.equal(execute("function main(n){if(n<=1)return 1;return n*main(n-1)}", [5]).value, 120);
assert.equal(execute("function main(){return document.title}").status, "blocked");
assert.equal(execute("function main(){return main()}").status, "blocked");
assert.equal(execute("function main(){while(true){}}").status, "blocked");
assert.equal(
  verify("function main(a){return a+1}", "main", [{ args: [2], expected: 3 }])[0].pass,
  true,
);
assert.equal(
  verify("function main(a){return a+1}", "main", [{ args: [2], expected: 4 }])[0].pass,
  false,
);
console.log("7 execution assertions passed");
