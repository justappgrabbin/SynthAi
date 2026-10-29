// ============================================================================
// Fibonacci Recurrence Engine — Nonlinear revisit timing
// ============================================================================
export class FibonacciScheduler {
  private sequence = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
  private schedule = new Map<string, number[]>();

  scheduleRecurrence(nodeId: string, depth: number = 0): number[] {
    const offsets = this.sequence.slice(0, Math.min(depth + 3, this.sequence.length));
    this.schedule.set(nodeId, offsets);
    return offsets;
  }

  getNextVisit(nodeId: string, currentTick: number): number | null {
    const offsets = this.schedule.get(nodeId);
    if (!offsets) return null;
    for (const offset of offsets) {
      const visit = currentTick + offset;
      if (visit > currentTick) return visit;
    }
    return null;
  }

  getSchedule(nodeId: string): number[] {
    return this.schedule.get(nodeId) || [];
  }

  remove(nodeId: string): void {
    this.schedule.delete(nodeId);
  }

  static getFibonacci(n: number): number {
    if (n <= 1) return 1;
    let a = 1, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }
}
