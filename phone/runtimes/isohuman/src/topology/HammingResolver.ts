// ============================================================================
// Hamming Distance Resolver
// ============================================================================
import { FuxiEncoder } from "./FuxiEncoder";

export class HammingResolver {
  static neighbors(pattern: string, maxDistance: number = 1): string[] {
    return FuxiEncoder.getNeighbors(pattern, maxDistance);
  }

  static distance(a: string, b: string): number {
    return FuxiEncoder.hammingDistance(a, b);
  }

  static isNeighbor(a: string, b: string, distance: number = 1): boolean {
    return this.distance(a, b) === distance;
  }

  static sortedByDistance(reference: string, candidates: string[]): string[] {
    return [...candidates].sort(
      (a, b) => this.distance(reference, a) - this.distance(reference, b)
    );
  }
}
