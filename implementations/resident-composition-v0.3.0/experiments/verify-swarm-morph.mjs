import {cpSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const temporary=mkdtempSync(join(tmpdir(),'synthia-morph-'));
try {
 cpSync(new URL('../overlay/',import.meta.url),temporary,{recursive:true});
 writeFileSync(join(temporary,'package.json'),'{"type":"module"}');
 const result=spawnSync(process.execPath,[join(temporary,'tests/swarm-morph.test.mjs')],{stdio:'inherit'});
 if(result.error)throw result.error;process.exitCode=result.status??1;
} finally {rmSync(temporary,{recursive:true,force:true});}
