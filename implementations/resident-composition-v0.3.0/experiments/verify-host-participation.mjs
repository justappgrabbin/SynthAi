import {copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {spawnSync} from 'node:child_process';

// Reproduce the targeted check from this repository without substituting a
// foundation engine or requiring the absent complete baseline archive.
const overlay = new URL('../overlay/', import.meta.url);
const donor = new URL('../../../computer/donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/', import.meta.url);
const temporary = mkdtempSync(join(tmpdir(), 'synthia-host-participation-'));
try {
  writeFileSync(join(temporary, 'package.json'), '{"type":"module"}\n');
  const overlays = [
    'components/organism/organism/HostParticipationLoop.mjs',
    'components/organism/organism/ComplementaryGapModel.mjs',
    'components/organism/organism/LivingLoop.mjs',
    'tests/host-participation.test.mjs',
  ];
  const helpers = ['organism/NeedField.mjs', 'organism/TraceableVariation.mjs', 'organs/LocalMemory.js', 'processes/AutoCoder.mjs'];
  const files = [
    ...overlays.map(path => [new URL(path, overlay), path]),
    ...helpers.map(path => [new URL(path, donor), `components/organism/${path}`]),
  ];
  for (const [source, relative] of files) {
    const destination = join(temporary, relative);
    mkdirSync(dirname(destination), {recursive:true});
    copyFileSync(source, destination);
  }
  const result = spawnSync(process.execPath, [join(temporary, 'tests/host-participation.test.mjs')], {stdio:'inherit'});
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temporary, {recursive:true, force:true});
}
