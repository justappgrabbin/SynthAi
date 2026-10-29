// ============================================================================
// Audit Logger — Immutable execution history
// ============================================================================
import { MCPExecutionResult } from "../models";

export class AuditLogger {
  private logs: MCPExecutionResult[] = [];

  log(result: MCPExecutionResult): void {
    this.logs.push(result);
  }

  getLogs(): MCPExecutionResult[] {
    return [...this.logs];
  }

  getByRequestId(requestId: string): MCPExecutionResult | undefined {
    return this.logs.find((l) => l.requestId === requestId);
  }
}
