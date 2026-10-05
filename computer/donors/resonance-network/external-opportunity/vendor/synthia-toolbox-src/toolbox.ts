import { createHash } from "node:crypto";
import {
  ToolboxError,
  ToolApprovalRequiredError,
  assertValidInput,
  clone,
  type JsonSchema,
  type McpClient,
  type McpTool,
  type ToolPreview,
  type ToolResult,
} from "./contracts";

const destructivePattern =
  /(^|[._-])(create|send|write|update|delete|remove|post|publish|purchase|charge|cancel|invite|move|rename|upload)([._-]|$)/i;
const now = (): string => new Date().toISOString();

type LearningCore = {
  snapshot?: () => unknown;
  training?: {
    record: (input: {
      task: string;
      stateBefore: unknown;
      toolPath: string[];
      interaction: unknown;
      stateAfter: unknown;
      observedExpression: unknown;
      success: boolean;
      error?: string | null;
      metadata?: Record<string, unknown>;
    }) => { id: string };
  };
};

export type ToolboxPolicy = {
  allowedServers?: Iterable<string>;
  allowedTools?: Iterable<string>;
  deniedTools?: Iterable<string>;
  requireApprovalFor?: Iterable<string>;
  allowDestructive?: boolean;
};

export type ToolboxServer = {
  id: string;
  name: string;
  client: McpClient;
  metadata: Record<string, unknown>;
  connected: boolean;
};

type ToolEntry = McpTool & {
  qualifiedName: string;
  serverId: string;
  serverName: string;
};

export type PublicTool = {
  name: string;
  server: string;
  originalName: string;
  description: string;
  inputSchema: JsonSchema;
  requiresApproval: boolean;
};

export type DelegationEvent = {
  id: string;
  at: string;
  completedAt: string;
  task: string;
  toolPath: string[];
  server: string;
  tool: string;
  input: Record<string, unknown>;
  output: ToolResult;
  context: Record<string, unknown>;
  success: boolean;
  error: { name: string; message: string; code?: string } | null;
  provenance: {
    source: "mcp";
    serverId: string;
    serverName: string;
    toolName: string;
  };
};

const stableId = (payload: unknown): string =>
  `delegation_${createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 20)}`;

const stateSnapshot = (learningCore: LearningCore | null): unknown => {
  try {
    return clone(learningCore?.snapshot?.() ?? {});
  } catch {
    return {};
  }
};

const textFromResult = (result: ToolResult): string =>
  (result.content ?? [])
    .filter((item) => item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n");

export class SynthiaToolbox {
  private readonly servers = new Map<string, ToolboxServer>();
  private readonly tools = new Map<string, ToolEntry>();
  private readonly eventLog: DelegationEvent[] = [];
  private readonly policy: {
    allowedServers: Set<string> | null;
    allowedTools: Set<string> | null;
    deniedTools: Set<string>;
    requireApprovalFor: Set<string>;
    allowDestructive: boolean;
  };

  constructor(
    private readonly options: {
      learningCore?: LearningCore | null;
      policy?: ToolboxPolicy;
      onEvent?: (event: DelegationEvent) => void;
    } = {},
  ) {
    const policy = options.policy ?? {};
    this.policy = {
      allowedServers: policy.allowedServers ? new Set(policy.allowedServers) : null,
      allowedTools: policy.allowedTools ? new Set(policy.allowedTools) : null,
      deniedTools: new Set(policy.deniedTools ?? []),
      requireApprovalFor: new Set(policy.requireApprovalFor ?? []),
      allowDestructive: policy.allowDestructive === true,
    };
  }

  async addServer(input: {
    id: string;
    name?: string;
    client: McpClient;
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string; name: string }> {
    if (!input.id || !input.client) {
      throw new ToolboxError("Server id and client are required", "INVALID_SERVER_CONFIG");
    }
    if (this.servers.has(input.id)) {
      throw new ToolboxError(`Server already exists: ${input.id}`, "DUPLICATE_SERVER");
    }
    const server: ToolboxServer = {
      id: input.id,
      name: input.name ?? input.id,
      client: input.client,
      metadata: clone(input.metadata ?? {}),
      connected: false,
    };
    this.servers.set(input.id, server);
    return { id: server.id, name: server.name };
  }

  async connect(serverId: string): Promise<PublicTool[]> {
    const server = this.getServer(serverId);
    await server.client.start?.();
    await server.client.initialize?.();
    server.connected = true;
    return this.discover(serverId);
  }

  async connectAll(): Promise<PublicTool[]> {
    const discovered: PublicTool[] = [];
    for (const serverId of this.servers.keys()) {
      discovered.push(...await this.connect(serverId));
    }
    return discovered;
  }

  async discover(serverId: string): Promise<PublicTool[]> {
    const server = this.getServer(serverId);
    const definitions = await server.client.listTools();
    const discovered: PublicTool[] = [];
    for (const definition of definitions) {
      if (!definition.name) continue;
      const entry: ToolEntry = {
        ...definition,
        qualifiedName: `${serverId}::${definition.name}`,
        serverId,
        serverName: server.name,
      };
      this.tools.set(entry.qualifiedName, entry);
      discovered.push(this.publicTool(entry));
    }
    return discovered;
  }

  listTools(input: { query?: string; serverId?: string } = {}): PublicTool[] {
    const needle = (input.query ?? "").trim().toLowerCase();
    return [...this.tools.values()]
      .filter((tool) => !input.serverId || tool.serverId === input.serverId)
      .filter((tool) =>
        !needle ||
        `${tool.qualifiedName} ${tool.description ?? ""}`.toLowerCase().includes(needle),
      )
      .map((tool) => this.publicTool(tool));
  }

  previewCall(input: {
    tool: string;
    arguments?: Record<string, unknown>;
  }): ToolPreview {
    const definition = this.resolveTool(input.tool);
    const requiresApproval = this.requiresApproval(definition);
    return {
      tool: definition.qualifiedName,
      server: definition.serverName,
      action: definition.name,
      arguments: clone(input.arguments ?? {}),
      requiresApproval,
      reason: requiresApproval
        ? "This tool can change external state or send something on the user's behalf."
        : null,
    };
  }

  async call(input: {
    tool: string;
    arguments?: Record<string, unknown>;
    task?: string;
    context?: Record<string, unknown>;
    approve?: boolean;
  }): Promise<ToolResult & {
    tool: string;
    delegated: true;
    provenance: DelegationEvent["provenance"];
    delegationId: string;
    learningRecordId: string | null;
  }> {
    const definition = this.resolveTool(input.tool);
    const server = this.getServer(definition.serverId);
    this.assertAllowed(definition);
    const args = input.arguments ?? {};
    assertValidInput(definition.inputSchema, args);

    const preview = this.previewCall({ tool: definition.qualifiedName, arguments: args });
    if (preview.requiresApproval && !input.approve) {
      throw new ToolApprovalRequiredError(preview);
    }

    const task = input.task ?? input.tool;
    const before = stateSnapshot(this.options.learningCore ?? null);
    const startedAt = now();
    let result: ToolResult;
    let caught: Error | null = null;
    try {
      result = await server.client.callTool(definition.name, args);
    } catch (error) {
      caught = error instanceof Error ? error : new Error(String(error));
      result = { isError: true, content: [{ type: "text", text: caught.message }] };
    }

    const success = !caught && result.isError !== true;
    const after = stateSnapshot(this.options.learningCore ?? null);
    const event: DelegationEvent = {
      id: stableId({ tool: definition.qualifiedName, task, startedAt }),
      at: startedAt,
      completedAt: now(),
      task,
      toolPath: [definition.qualifiedName],
      server: definition.serverName,
      tool: definition.name,
      input: clone(args),
      output: clone(result),
      context: clone(input.context ?? {}),
      success,
      error: caught
        ? { name: caught.name, message: caught.message, code: (caught as ToolboxError).code }
        : null,
      provenance: {
        source: "mcp",
        serverId: definition.serverId,
        serverName: definition.serverName,
        toolName: definition.name,
      },
    };
    this.eventLog.push(event);
    this.options.onEvent?.(clone(event));

    let learningRecordId: string | null = null;
    const training = this.options.learningCore?.training;
    if (training) {
      const learningRecord = training.record({
        task,
        stateBefore: before,
        toolPath: event.toolPath,
        interaction: {
          input: args,
          output: result,
          context: input.context ?? {},
          provenance: event.provenance,
        },
        stateAfter: after,
        observedExpression: textFromResult(result) || result,
        success,
        error: caught?.message ?? (result.isError ? textFromResult(result) : null),
        metadata: {
          delegationId: event.id,
          delegated: true,
          approvalGranted: preview.requiresApproval,
        },
      });
      learningRecordId = learningRecord.id;
    }

    if (caught) {
      caught.cause = event;
      throw caught;
    }

    return {
      ...clone(result),
      tool: definition.qualifiedName,
      delegated: true,
      provenance: event.provenance,
      delegationId: event.id,
      learningRecordId,
    };
  }

  events(): DelegationEvent[] {
    return clone(this.eventLog);
  }

  async close(): Promise<void> {
    for (const server of this.servers.values()) {
      await server.client.close?.();
      server.connected = false;
    }
  }

  private getServer(id: string): ToolboxServer {
    const server = this.servers.get(id);
    if (!server) throw new ToolboxError(`Unknown MCP server: ${id}`, "UNKNOWN_SERVER");
    return server;
  }

  private resolveTool(name: string): ToolEntry {
    const direct = this.tools.get(name);
    if (direct) return direct;
    const matches = [...this.tools.values()].filter((tool) => tool.name === name);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      throw new ToolboxError(`Tool name is ambiguous: ${name}`, "AMBIGUOUS_TOOL", {
        matches: matches.map((tool) => tool.qualifiedName),
      });
    }
    throw new ToolboxError(`Unknown tool: ${name}`, "UNKNOWN_TOOL");
  }

  private assertAllowed(definition: ToolEntry): void {
    if (this.policy.allowedServers && !this.policy.allowedServers.has(definition.serverId)) {
      throw new ToolboxError(`MCP server is not allowed: ${definition.serverId}`, "SERVER_NOT_ALLOWED");
    }
    if (
      this.policy.deniedTools.has(definition.qualifiedName) ||
      this.policy.deniedTools.has(definition.name)
    ) {
      throw new ToolboxError(`Tool is denied by policy: ${definition.qualifiedName}`, "TOOL_DENIED");
    }
    if (
      this.policy.allowedTools &&
      !this.policy.allowedTools.has(definition.qualifiedName) &&
      !this.policy.allowedTools.has(definition.name)
    ) {
      throw new ToolboxError(`Tool is not allowed: ${definition.qualifiedName}`, "TOOL_NOT_ALLOWED");
    }
  }

  private requiresApproval(definition: ToolEntry): boolean {
    return !this.policy.allowDestructive && (
      definition.annotations?.destructiveHint === true ||
      definition.metadata?.requiresApproval === true ||
      this.policy.requireApprovalFor.has(definition.qualifiedName) ||
      this.policy.requireApprovalFor.has(definition.name) ||
      destructivePattern.test(definition.name)
    );
  }

  private publicTool(definition: ToolEntry): PublicTool {
    return {
      name: definition.qualifiedName,
      server: definition.serverName,
      originalName: definition.name,
      description: definition.description ?? "",
      inputSchema: clone(definition.inputSchema ?? { type: "object" }),
      requiresApproval: this.requiresApproval(definition),
    };
  }
}