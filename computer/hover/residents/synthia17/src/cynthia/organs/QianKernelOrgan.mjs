export class QianKernelOrgan {
  constructor() {
    this.lines = Object.freeze([1, 1, 1, 1, 1, 1]);
    this.baseline = Object.freeze([1, 1, 1, 1, 1]);
    this.kernels = Object.freeze([
      { id: 'K0_TOTAL', lines: [1,2,3,4,5,6], role: 'complete-field' },
      { id: 'K1_LOWER_OUTER', lines: [1,2,3], role: 'subject-agent' },
      { id: 'K2_UPPER_OUTER', lines: [4,5,6], role: 'object-environment' },
      { id: 'K3_LOWER_NUCLEAR', lines: [2,3,4], role: 'inner-motivation' },
      { id: 'K4_UPPER_NUCLEAR', lines: [3,4,5], role: 'outer-expression' },
    ]);
  }

  measure(vector = []) {
    const normalized = this.baseline.map((_, i) => Math.max(0, Math.min(1, Number(vector[i] ?? 0))));
    const deviation = normalized.reduce((sum, value) => sum + Math.abs(1 - value), 0) / 5;
    const max = Math.max(...normalized);
    return Object.freeze({ deviation, coherence: 1 - deviation, yangContent: normalized.reduce((a,b)=>a+b,0)/5, dominantDimension: normalized.indexOf(max), baseline: 'Qian' });
  }
}

