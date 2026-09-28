import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { SemanticArtifactCompiler } from "./SemanticArtifactCompiler.js";

test("semantic compiler emits executable greeting + persistent memory behavior", () => {
  const compiler = new SemanticArtifactCompiler();
  const intent = "A small tool that greets the user by name and remembers the greeting";
  const outputs = [
    { nodeId:"a", toolIds:["autoling"], channelIds:[], capabilities:["semantic.intent.analysis"], output:{pipeline:{grammar:[{rhs:intent.split(" ")}]}} },
    { nodeId:"d", toolIds:["diseminer"], channelIds:[], capabilities:["semantic.intent.analysis"], output:{claims:[{text:intent,predicate:"greets",object:"the user by name and remembers the greeting"}]} },
    { nodeId:"c", toolIds:["computational-grammar-coder"], channelIds:[], capabilities:["semantic.intent.analysis"], output:{sentence:intent} }
  ];
  const files = compiler.compile({graphId:"g"}, "CLI", outputs);
  const cli = files.find(file => file.path === "cli.mjs");
  const spec = files.find(file => file.path === "synthia/semantic-spec.json");
  const artifactTest = files.find(file => file.path === "tests/semantic-cli.test.mjs");
  assert.ok(cli);
  assert.ok(spec);
  assert.ok(artifactTest);
  const parsed = JSON.parse(spec.content);
  assert.deepEqual(parsed.actions, ["greet", "remember"]);
  assert.deepEqual(parsed.inputs, ["name"]);
  assert.equal(parsed.persistence.required, true);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "synthia-compiler-test-"));
  const cliPath = path.join(dir, "cli.mjs");
  const memoryPath = path.join(dir, "memory.json");
  fs.writeFileSync(cliPath, cli.content);
  const env = { ...process.env, SYNTHIA_MEMORY_FILE: memoryPath };
  const first = spawnSync(process.execPath, [cliPath, "Ada"], { encoding:"utf8", env });
  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stdout.trim(), "Hello, Ada!");
  const second = spawnSync(process.execPath, [cliPath], { encoding:"utf8", env });
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.stdout.trim(), "Hello, Ada!");
  const memory = JSON.parse(fs.readFileSync(memoryPath, "utf8"));
  assert.equal(memory.lastName, "Ada");
  assert.equal(memory.history.length, 2);
});
