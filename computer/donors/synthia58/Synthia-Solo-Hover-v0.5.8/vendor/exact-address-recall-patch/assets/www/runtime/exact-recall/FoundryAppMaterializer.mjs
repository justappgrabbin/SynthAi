import { encodeFileBundle, decodeFileBundle, sha256Hex, asBytes } from './ContentHash.mjs';

export class FoundryAppMaterializer {
  constructor({ unit }) { this.unit = unit; }

  async materialize(commitment) {
    const recipe = commitment?.recipe || {};
    if (Array.isArray(recipe.files)) {
      const bytes = encodeFileBundle(recipe.files);
      return Object.freeze({ kind: 'app', mode: 'recipe', bytes, files: decodeFileBundle(bytes).files, actualSha256: await sha256Hex(bytes) });
    }
    if (recipe.graph && recipe.target) {
      const assembler = this.unit?.runtime?.artifactAssembler;
      if (!assembler || typeof assembler.assemble !== 'function') throw new Error('resident Foundry ArtifactAssembler unavailable');
      const artifact = await assembler.assemble(structuredClone(recipe.graph), recipe.target);
      const bytes = encodeFileBundle(artifact.files || []);
      return Object.freeze({ kind: 'app', mode: 'resident-foundry', bytes, files: decodeFileBundle(bytes).files, artifact, actualSha256: await sha256Hex(bytes) });
    }
    if (recipe.exactBytes != null) {
      const bytes = asBytes(recipe.exactBytes);
      return Object.freeze({ kind: 'app', mode: 'exact-bytes', bytes, files: null, actualSha256: await sha256Hex(bytes) });
    }
    throw new Error('Foundry commitment needs recipe.files, recipe.graph+target, or exact bytes already in the exact store');
  }
}
export default FoundryAppMaterializer;
