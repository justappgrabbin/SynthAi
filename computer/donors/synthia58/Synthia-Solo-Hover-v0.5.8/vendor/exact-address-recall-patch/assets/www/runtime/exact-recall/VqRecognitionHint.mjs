/** VQ-VAE is recognition only. It may nominate an address; it never authorizes an artifact. */
export class VqRecognitionHint {
  constructor() { this.last = null; }
  suggest(candidate = {}) {
    this.last = Object.freeze({ candidate: structuredClone(candidate), at: Date.now(), authority: false });
    return this.last;
  }
  snapshot() { return this.last; }
}
export default VqRecognitionHint;
