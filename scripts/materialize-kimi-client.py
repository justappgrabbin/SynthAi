#!/usr/bin/env python3
"""Materialize browser-safe Kimi client dependencies from the preserved archive."""
from pathlib import Path
import re, shutil, sys

if len(sys.argv) != 3:
    raise SystemExit('usage: materialize-kimi-client.py <work/synthai> <destination>')
root = Path(sys.argv[1]).resolve(); out = Path(sys.argv[2]).resolve()
if out.exists(): shutil.rmtree(out)
out.mkdir(parents=True)
vendor = root / 'computer' / 'donors' / 'Back-up-' / 'vendor'
entries = [
    vendor/'pure-synthia-v0.4.0/src/synthia/morph-chat/runtime.mjs',
    vendor/'pure-synthia-v0.4.0/src/synthia/morph-chat/providers.mjs',
    vendor/'pure-synthia-v0.4.0/src/synthia/integrated-tool-factory/integrated-tool-factory.mjs',
    vendor/'pure-synthia-v0.4.0/src/synthia/emergent-state-space/runtime.mjs',
    vendor/'pure-synthia-v0.4.0/src/synthia/orchestrator/microStateSpace.mjs',
    vendor/'execution-spine-v0.4.0/src/pure-synthia/automata/registry.js',
    vendor/'execution-spine-v0.4.0/src/pure-synthia/integration/mesh-rule-synthesizer.js',
    vendor/'execution-spine-v0.4.0/src/pure-synthia/integration/execution-loop-orchestrator.js',
    vendor/'execution-spine-v0.4.0/src/pure-synthia/integration/focal-state-space.js',
    vendor/'kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/addressing.js',
    vendor/'kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/human-design.js',
    vendor/'kimi-agent-automata-state-space-merge/pure-synthia-automata/src/state-space/mesh-state-space.js',
]
import_re = re.compile(r"(?:from\s+|import\s*\(|export\s+[^;]*?from\s+)[\"']([^\"']+)[\"']")
seen=set(); stack=list(entries)
while stack:
    path=stack.pop().resolve()
    if path in seen: continue
    if not path.exists(): raise FileNotFoundError(path)
    seen.add(path)
    rel=path.relative_to(vendor); target=out/rel
    target.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(path,target)
    if path.suffix not in {'.js','.mjs'}: continue
    text=path.read_text(errors='replace')
    for spec in import_re.findall(text):
        if not spec.startswith('.'): continue
        dep=(path.parent/spec).resolve(); candidates=[dep]
        if not dep.suffix: candidates += [dep.with_suffix('.js'),dep.with_suffix('.mjs'),dep/'index.js',dep/'index.mjs']
        actual=next((p for p in candidates if p.exists() and p.is_file()),None)
        if actual: stack.append(actual)
orig = vendor/'klein-mesh-game-engine-v5.1/kmge_v5_fixed/dist/klein-full-toolkit.js'
if not orig.exists(): raise FileNotFoundError(orig)
text=orig.read_text()
wrapped='''// Browser ESM wrapper for preserved Klein Full Toolkit v2 CommonJS build.
// Original implementation executes unchanged inside a private CommonJS scope.
const api = (() => {
  const exports = {};
  const module = { exports };
'''+text+'''
  return module.exports && Object.keys(module.exports).length ? module.exports : exports;
})();
export const MessySubstrate = api.MessySubstrate;
export const DiseMinerModule = api.DiseMinerModule;
export const AutolingModule = api.AutolingModule;
export const AutoNovelModule = api.AutoNovelModule;
export const ProppLeviStraussModule = api.ProppLeviStraussModule;
export const AnalogyMysticismModule = api.AnalogyMysticismModule;
export const HistoricalChangeModule = api.HistoricalChangeModule;
export const CreativityModule = api.CreativityModule;
export const KleinEngine = api.KleinEngine;
export default api.KleinEngine;
'''
target=out/'klein-mesh-game-engine-v5.1/klein-full-toolkit.browser.mjs'; target.parent.mkdir(parents=True,exist_ok=True); target.write_text(wrapped)
print(f'materialized {len(seen)+1} Kimi client modules')
