import { sha256Hex, asBytes } from './ContentHash.mjs';

export class AtoToolMaterializer {
  constructor({ unit }) { this.unit = unit; }
  async materialize(commitment) {
    const request = commitment?.recipe?.request;
    if (!request) throw new Error('ATO commitment is missing recipe.request');
    const bridge = this.unit?.factory?.bridge;
    if (!bridge || typeof bridge.generateAndMount !== 'function') throw new Error('live ATO factory bridge unavailable');
    const mounted = bridge.generateAndMount(structuredClone(request));
    if (!mounted?.tool) throw new Error(`ATO could not materialize tool: ${mounted?.status || 'unknown'}`);
    const source = mounted.tool.exportModule({ includeState: false });
    const bytes = asBytes(source);
    const actualSha256 = await sha256Hex(bytes);
    return Object.freeze({
      kind: 'tool',
      bytes,
      text: source,
      actualSha256,
      toolId: mounted.tool.id,
      manifest: mounted.tool.manifest(),
      nativeAutomaton: mounted.automaton || null
    });
  }
}
export default AtoToolMaterializer;
