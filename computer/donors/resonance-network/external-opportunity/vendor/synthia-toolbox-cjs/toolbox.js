"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SynthiaToolbox = void 0;
const node_crypto_1 = require("node:crypto");
const contracts_1 = require("./contracts");
const destructivePattern = /(^|[._-])(create|send|write|update|delete|remove|post|publish|purchase|charge|cancel|invite|move|rename|upload)([._-]|$)/i;
const now = () => new Date().toISOString();
const stableId = (payload) => `delegation_${(0, node_crypto_1.createHash)("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 20)}`;
const stateSnapshot = (learningCore) => {
    try {
        return (0, contracts_1.clone)(learningCore?.snapshot?.() ?? {});
    }
    catch {
        return {};
    }
};
const textFromResult = (result) => (result.content ?? [])
    .filter((item) => item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n");
class SynthiaToolbox {
    options;
    servers = new Map();
    tools = new Map();
    eventLog = [];
    policy;
    constructor(options = {}) {
        this.options = options;
        const policy = options.policy ?? {};
        this.policy = {
            allowedServers: policy.allowedServers ? new Set(policy.allowedServers) : null,
            allowedTools: policy.allowedTools ? new Set(policy.allowedTools) : null,
            deniedTools: new Set(policy.deniedTools ?? []),
            requireApprovalFor: new Set(policy.requireApprovalFor ?? []),
            allowDestructive: policy.allowDestructive === true,
        };
    }
    async addServer(input) {
        if (!input.id || !input.client) {
            throw new contracts_1.ToolboxError("Server id and client are required", "INVALID_SERVER_CONFIG");
        }
        if (this.servers.has(input.id)) {
            throw new contracts_1.ToolboxError(`Server already exists: ${input.id}`, "DUPLICATE_SERVER");
        }
        const server = {
            id: input.id,
            name: input.name ?? input.id,
            client: input.client,
            metadata: (0, contracts_1.clone)(input.metadata ?? {}),
            connected: false,
        };
        this.servers.set(input.id, server);
        return { id: server.id, name: server.name };
    }
    async connect(serverId) {
        const server = this.getServer(serverId);
        await server.client.start?.();
        await server.client.initialize?.();
        server.connected = true;
        return this.discover(serverId);
    }
    async connectAll() {
        const discovered = [];
        for (const serverId of this.servers.keys()) {
            discovered.push(...await this.connect(serverId));
        }
        return discovered;
    }
    async discover(serverId) {
        const server = this.getServer(serverId);
        const definitions = await server.client.listTools();
        const discovered = [];
        for (const definition of definitions) {
            if (!definition.name)
                continue;
            const entry = {
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
    listTools(input = {}) {
        const needle = (input.query ?? "").trim().toLowerCase();
        return [...this.tools.values()]
            .filter((tool) => !input.serverId || tool.serverId === input.serverId)
            .filter((tool) => !needle ||
            `${tool.qualifiedName} ${tool.description ?? ""}`.toLowerCase().includes(needle))
            .map((tool) => this.publicTool(tool));
    }
    previewCall(input) {
        const definition = this.resolveTool(input.tool);
        const requiresApproval = this.requiresApproval(definition);
        return {
            tool: definition.qualifiedName,
            server: definition.serverName,
            action: definition.name,
            arguments: (0, contracts_1.clone)(input.arguments ?? {}),
            requiresApproval,
            reason: requiresApproval
                ? "This tool can change external state or send something on the user's behalf."
                : null,
        };
    }
    async call(input) {
        const definition = this.resolveTool(input.tool);
        const server = this.getServer(definition.serverId);
        this.assertAllowed(definition);
        const args = input.arguments ?? {};
        (0, contracts_1.assertValidInput)(definition.inputSchema, args);
        const preview = this.previewCall({ tool: definition.qualifiedName, arguments: args });
        if (preview.requiresApproval && !input.approve) {
            throw new contracts_1.ToolApprovalRequiredError(preview);
        }
        const task = input.task ?? input.tool;
        const before = stateSnapshot(this.options.learningCore ?? null);
        const startedAt = now();
        let result;
        let caught = null;
        try {
            result = await server.client.callTool(definition.name, args);
        }
        catch (error) {
            caught = error instanceof Error ? error : new Error(String(error));
            result = { isError: true, content: [{ type: "text", text: caught.message }] };
        }
        const success = !caught && result.isError !== true;
        const after = stateSnapshot(this.options.learningCore ?? null);
        const event = {
            id: stableId({ tool: definition.qualifiedName, task, startedAt }),
            at: startedAt,
            completedAt: now(),
            task,
            toolPath: [definition.qualifiedName],
            server: definition.serverName,
            tool: definition.name,
            input: (0, contracts_1.clone)(args),
            output: (0, contracts_1.clone)(result),
            context: (0, contracts_1.clone)(input.context ?? {}),
            success,
            error: caught
                ? { name: caught.name, message: caught.message, code: caught.code }
                : null,
            provenance: {
                source: "mcp",
                serverId: definition.serverId,
                serverName: definition.serverName,
                toolName: definition.name,
            },
        };
        this.eventLog.push(event);
        this.options.onEvent?.((0, contracts_1.clone)(event));
        let learningRecordId = null;
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
            ...(0, contracts_1.clone)(result),
            tool: definition.qualifiedName,
            delegated: true,
            provenance: event.provenance,
            delegationId: event.id,
            learningRecordId,
        };
    }
    events() {
        return (0, contracts_1.clone)(this.eventLog);
    }
    async close() {
        for (const server of this.servers.values()) {
            await server.client.close?.();
            server.connected = false;
        }
    }
    getServer(id) {
        const server = this.servers.get(id);
        if (!server)
            throw new contracts_1.ToolboxError(`Unknown MCP server: ${id}`, "UNKNOWN_SERVER");
        return server;
    }
    resolveTool(name) {
        const direct = this.tools.get(name);
        if (direct)
            return direct;
        const matches = [...this.tools.values()].filter((tool) => tool.name === name);
        if (matches.length === 1)
            return matches[0];
        if (matches.length > 1) {
            throw new contracts_1.ToolboxError(`Tool name is ambiguous: ${name}`, "AMBIGUOUS_TOOL", {
                matches: matches.map((tool) => tool.qualifiedName),
            });
        }
        throw new contracts_1.ToolboxError(`Unknown tool: ${name}`, "UNKNOWN_TOOL");
    }
    assertAllowed(definition) {
        if (this.policy.allowedServers && !this.policy.allowedServers.has(definition.serverId)) {
            throw new contracts_1.ToolboxError(`MCP server is not allowed: ${definition.serverId}`, "SERVER_NOT_ALLOWED");
        }
        if (this.policy.deniedTools.has(definition.qualifiedName) ||
            this.policy.deniedTools.has(definition.name)) {
            throw new contracts_1.ToolboxError(`Tool is denied by policy: ${definition.qualifiedName}`, "TOOL_DENIED");
        }
        if (this.policy.allowedTools &&
            !this.policy.allowedTools.has(definition.qualifiedName) &&
            !this.policy.allowedTools.has(definition.name)) {
            throw new contracts_1.ToolboxError(`Tool is not allowed: ${definition.qualifiedName}`, "TOOL_NOT_ALLOWED");
        }
    }
    requiresApproval(definition) {
        return !this.policy.allowDestructive && (definition.annotations?.destructiveHint === true ||
            definition.metadata?.requiresApproval === true ||
            this.policy.requireApprovalFor.has(definition.qualifiedName) ||
            this.policy.requireApprovalFor.has(definition.name) ||
            destructivePattern.test(definition.name));
    }
    publicTool(definition) {
        return {
            name: definition.qualifiedName,
            server: definition.serverName,
            originalName: definition.name,
            description: definition.description ?? "",
            inputSchema: (0, contracts_1.clone)(definition.inputSchema ?? { type: "object" }),
            requiresApproval: this.requiresApproval(definition),
        };
    }
}
exports.SynthiaToolbox = SynthiaToolbox;
