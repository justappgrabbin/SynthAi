// ============================================================================
// Permission Controller — Enforce boundaries
// ============================================================================
import { MCPExecutionRequest } from "../models";

export class PermissionController {
  private permissions = new Map<string, string[]>();

  grant(toolId: string, scopes: string[]): void {
    this.permissions.set(toolId, scopes);
  }

  check(request: MCPExecutionRequest): boolean {
    const allowed = this.permissions.get(request.toolId) || [];
    return request.permissionScope.every((scope) => allowed.includes(scope));
  }
}
