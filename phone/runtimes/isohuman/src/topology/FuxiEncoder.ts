// ============================================================================
// Fuxi Binary State Encoder
// 6 binary lines → 64 states
// ============================================================================
import { ResonanceNode, NodeRegime, CircuitFamily } from "../models";

export class FuxiEncoder {
  private static readonly LINE_COUNT = 6;
  private static readonly STATE_COUNT = 64;

  static encodeIndex(index: number): string {
    if (index < 0 || index >= this.STATE_COUNT) {
      throw new Error(`Index ${index} out of range [0, ${this.STATE_COUNT})`);
    }
    return index.toString(2).padStart(this.LINE_COUNT, "0");
  }

  static decodePattern(pattern: string): number {
    if (pattern.length !== this.LINE_COUNT || !/^[01]+$/.test(pattern)) {
      throw new Error(`Invalid pattern: ${pattern}`);
    }
    return parseInt(pattern, 2);
  }

  static flipLine(pattern: string, lineIndex: 0 | 1 | 2 | 3 | 4 | 5): string {
    const chars = pattern.split("");
    chars[lineIndex] = chars[lineIndex] === "0" ? "1" : "0";
    return chars.join("");
  }

  static hammingDistance(a: string, b: string): number {
    if (a.length !== b.length) throw new Error("Pattern length mismatch");
    let dist = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) dist++;
    }
    return dist;
  }

  static getNeighbors(pattern: string, distance: number = 1): string[] {
    const results: string[] = [];
    for (let i = 0; i < this.STATE_COUNT; i++) {
      const other = this.encodeIndex(i);
      if (other !== pattern && this.hammingDistance(pattern, other) === distance) {
        results.push(other);
      }
    }
    return results;
  }

  static getOpposite(pattern: string): string {
    return pattern
      .split("")
      .map((c) => (c === "0" ? "1" : "0"))
      .join("");
  }

  static getInverse(pattern: string): string {
    return pattern.split("").reverse().join("");
  }

  static getAllStates(): string[] {
    return Array.from({ length: this.STATE_COUNT }, (_, i) => this.encodeIndex(i));
  }

  static createNode(
    index: number,
    circuitFamily?: CircuitFamily,
    channelModes: string[] = []
  ): ResonanceNode {
    const pattern = this.encodeIndex(index);
    const lines: [0 | 1, 0 | 1, 0 | 1, 0 | 1, 0 | 1, 0 | 1] = pattern
      .split("")
      .map((c) => (c === "1" ? 1 : 0)) as any;

    return {
      id: `node-${index}`,
      operators: { being: 0.5, design: 0.5, movement: 0.5, evolution: 0.5, space: 0.5 },
      binaryState: lines[5] as 0 | 1,
      lines,
      activeLine: 1,
      regime: "latent",
      tension: 0,
      activation: 0,
      attractorWeight: 0,
      memoryGravity: 0,
      recursionDepth: 0,
      circuitFamily,
      channelModes,
      observerContext: {
        id: `ctx-${index}`,
        perspective: "default",
        scale: 1,
        dimensions: ["binary", "gate"],
        timestamp: new Date().toISOString(),
      },
      activationHistory: [],
      semanticState: {
        center: [],
        central: [],
        peripheral: [],
        rejected: [],
        examples: [],
        revisionHistory: [],
        coherenceScore: 0,
      },
      provenance: [
        {
          id: `prov-node-${index}`,
          category: "native",
          source: "FuxiEncoder",
          description: `Auto-generated from binary index ${index}`,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  static initializeAllNodes(): Map<string, ResonanceNode> {
    const map = new Map<string, ResonanceNode>();
    for (let i = 0; i < this.STATE_COUNT; i++) {
      const node = this.createNode(i);
      map.set(node.id, node);
    }
    return map;
  }
}
