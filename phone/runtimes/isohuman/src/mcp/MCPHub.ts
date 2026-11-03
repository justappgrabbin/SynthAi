// ============================================================================
// MCP Hub — External capability orchestration
// ============================================================================
import {
  MCPToolDescriptor, MCPExecutionRequest, MCPExecutionResult,
  Observation, ExplanationStep, ProvenanceRecord
} from "../models";

export class MCPHub {
  private tools = new Map<string, MCPToolDescriptor>();
  private auditLog: MCPExecutionResult[] = [];

  registerTool(tool: MCPToolDescriptor): void {
    this.tools.set(tool.id, tool);
  }

  discoverCapabilities(): MCPToolDescriptor[] {
    return Array.from(this.tools.values()).filter((t) => t.enabled);
  }

  execute(request: MCPExecutionRequest): MCPExecutionResult {
    const trace: ExplanationStep[] = [];
    const tool = this.tools.get(request.toolId);

    if (!tool) {
      const result: MCPExecutionResult = {
        requestId: request.id,
        status: "failed",
        error: `Tool ${request.toolId} not found`,
        observations: [],
        auditTrace: [{ step: 1, operation: "tool_lookup", input: request.toolId, output: "not_found", confidence: 0 }],
      };
      this.auditLog.push(result);
      return result;
    }

    if (!tool.enabled) {
      const result: MCPExecutionResult = {
        requestId: request.id,
        status: "denied",
        error: `Tool ${request.toolId} is disabled`,
        observations: [],
        auditTrace: [{ step: 1, operation: "permission_check", input: request.toolId, output: "denied", confidence: 0 }],
      };
      this.auditLog.push(result);
      return result;
    }

    // Simulate execution
    trace.push({ step: 1, operation: "permission_check", input: request.permissionScope, output: "granted", confidence: 0.95 });
    trace.push({ step: 2, operation: "execute", input: request.input, output: "simulated_result", confidence: 0.9 });

    const observation: Observation = {
      id: `obs-${Date.now()}`,
      source: `mcp:${request.toolId}`,
      content: JSON.stringify(request.input),
      context: request.intentionId,
      timestamp: new Date().toISOString(),
      provenance: request.provenance,
    };

    const result: MCPExecutionResult = {
      requestId: request.id,
      status: "completed",
      output: { simulated: true, tool: tool.name, input: request.input },
      observations: [observation],
      auditTrace: trace,
    };

    this.auditLog.push(result);
    return result;
  }

  getAuditLog(): MCPExecutionResult[] {
    return this.auditLog;
  }
}
