"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpStdioClient = void 0;
const node_child_process_1 = require("node:child_process");
const contracts_1 = require("./contracts");
const PROTOCOL_VERSION = "2024-11-05";
class McpStdioClient {
    options;
    child = null;
    buffer = "";
    nextId = 1;
    pending = new Map();
    requestTimeoutMs;
    started = false;
    initialized = false;
    constructor(options) {
        this.options = options;
        if (!options.command)
            throw new contracts_1.ToolboxError("MCP command is required", "INVALID_SERVER_CONFIG");
        this.requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
    }
    async start() {
        if (this.started)
            return;
        this.child = (0, node_child_process_1.spawn)(this.options.command, this.options.args ?? [], {
            cwd: this.options.cwd,
            env: { ...process.env, ...this.options.env },
            stdio: ["pipe", "pipe", this.options.stderr ?? "inherit"],
        });
        this.started = true;
        this.child.stdout?.on("data", (chunk) => this.receive(chunk));
        this.child.on("error", (error) => this.rejectPending(error));
        this.child.on("exit", (code, signal) => {
            if (this.started) {
                this.rejectPending(new contracts_1.ToolboxError(`MCP server exited (${code ?? "unknown"}${signal ? `, ${signal}` : ""})`, "SERVER_EXITED"));
            }
            this.started = false;
            this.initialized = false;
        });
    }
    async initialize(clientInfo = { name: "synthia-toolbox", version: "0.1.0" }) {
        await this.start();
        if (this.initialized)
            return;
        await this.request("initialize", {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {},
            clientInfo,
        });
        this.notify("notifications/initialized", {});
        this.initialized = true;
    }
    async listTools() {
        if (!this.initialized)
            await this.initialize();
        const response = await this.request("tools/list", {});
        return response?.tools ?? [];
    }
    async callTool(name, args) {
        if (!this.initialized)
            await this.initialize();
        return await this.request("tools/call", { name, arguments: args });
    }
    async close() {
        this.started = false;
        this.initialized = false;
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timer);
            pending.reject(new contracts_1.ToolboxError("MCP client closed", "CLIENT_CLOSED"));
        }
        this.pending.clear();
        this.child?.kill();
        this.child = null;
    }
    request(method, params) {
        if (!this.child?.stdin?.writable) {
            return Promise.reject(new contracts_1.ToolboxError("MCP server is not running", "SERVER_NOT_RUNNING"));
        }
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new contracts_1.ToolboxError(`Timed out waiting for MCP method ${method}`, "REQUEST_TIMEOUT", { method }));
            }, this.requestTimeoutMs);
            this.pending.set(id, { resolve, reject, timer });
            this.write({ jsonrpc: "2.0", id, method, params });
        });
    }
    notify(method, params) {
        this.write({ jsonrpc: "2.0", method, params });
    }
    write(message) {
        if (!this.child?.stdin)
            throw new contracts_1.ToolboxError("MCP server is not running", "SERVER_NOT_RUNNING");
        const body = JSON.stringify(message);
        this.child.stdin.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
    }
    receive(chunk) {
        this.buffer += chunk.toString("utf8");
        while (this.buffer.length) {
            const headerEnd = this.buffer.indexOf("\r\n\r\n");
            if (headerEnd > 0 && /^content-length:/i.test(this.buffer.slice(0, headerEnd))) {
                const length = Number(this.buffer.slice(0, headerEnd).match(/content-length:\s*(\d+)/i)?.[1]);
                const bodyStart = headerEnd + 4;
                if (!Number.isFinite(length) || this.buffer.length < bodyStart + length)
                    return;
                const body = this.buffer.slice(bodyStart, bodyStart + length);
                this.buffer = this.buffer.slice(bodyStart + length);
                this.dispatch(body);
                continue;
            }
            const newline = this.buffer.indexOf("\n");
            if (newline < 0)
                return;
            const line = this.buffer.slice(0, newline).trim();
            this.buffer = this.buffer.slice(newline + 1);
            if (line)
                this.dispatch(line);
        }
    }
    dispatch(raw) {
        let message;
        try {
            message = JSON.parse(raw);
        }
        catch {
            return;
        }
        if (message.id == null)
            return;
        const pending = this.pending.get(message.id);
        if (!pending)
            return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) {
            pending.reject(new contracts_1.ToolboxError(message.error.message ?? "MCP request failed", "MCP_ERROR", (0, contracts_1.clone)(message.error)));
        }
        else {
            pending.resolve(message.result);
        }
    }
    rejectPending(error) {
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timer);
            pending.reject(error);
        }
        this.pending.clear();
    }
}
exports.McpStdioClient = McpStdioClient;
