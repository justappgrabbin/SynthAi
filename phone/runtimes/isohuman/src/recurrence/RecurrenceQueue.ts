// ============================================================================
// Recurrence Queue — Priority queue for Fibonacci-scheduled revisits
// ============================================================================
interface QueueEntry {
  nodeId: string;
  tick: number;
  priority: number;
}

export class RecurrenceQueue {
  private queue: QueueEntry[] = [];
  private currentTick = 0;

  enqueue(nodeId: string, tick: number, priority: number = 1): void {
    this.queue.push({ nodeId, tick, priority });
    this.queue.sort((a, b) => a.tick - b.tick || b.priority - a.priority);
  }

  dequeueUpTo(tick: number): QueueEntry[] {
    const results: QueueEntry[] = [];
    while (this.queue.length > 0 && this.queue[0].tick <= tick) {
      results.push(this.queue.shift()!);
    }
    return results;
  }

  advance(steps: number = 1): number {
    this.currentTick += steps;
    return this.currentTick;
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  getPending(): QueueEntry[] {
    return [...this.queue];
  }
}
