// Loader for verifying the original Drive-derived v11 module graph in Node.
// Does not modify, rewrite, or translate donor source files.
import {pathToFileURL} from 'node:url';
import {resolve as pathResolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=pathResolve(dirname(fileURLToPath(import.meta.url)),'synthia-v11-modules');
export async function resolve(specifier,context,nextResolve){
  if(specifier.startsWith('synthia/'))return {url:pathToFileURL(pathResolve(root,specifier)).href,shortCircuit:true};
  return nextResolve(specifier,context);
}
