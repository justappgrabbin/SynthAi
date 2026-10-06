import { spawn, type ChildProcess } from "node:child_process";
import {
  ToolboxError,
  clone,
  type McpClient,
  type ToolResult,
  type McpTool,
} from "./contracts";

const PROTOCOL_VERSION = "2024-11-05";

export type McpStdioClientOptions = {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  stderr?: "inherit" | "pipe" | "ignore";
  requestTimeoutMs?: number;
};

type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

export class McpStdioClient implements McpClient {
  private child: ChildProcess | null = null;
  private buffer = "";
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly requestTimeoutMs: number;
  private started = false;
  private initialized = false;

  constructor(private readonly options: McpStdioClientOptions) {
    if (!options.command) throw new ToolboxError("MCP command is required", "INVALID_SERVER_CONFIG");
    this.requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.child = spawn(this.options.command, this.options.args ?? [], {
      cwd: this.options.cwd,
      env: { ...process.env, ...this.options.env },
      stdio: ["pipe", "pipe", this.options.stderr ?? "inherit"],
    });
    this.started = true;
    this.child.stdout?.on("data", (chunk: Buffer) => this.receive(chunk));
    this.child.on("error", (error) => this.rejectPending(error));
    this.child.on("exit", (code, signal) => {
      if (this.started) {
        this.rejectPending(new ToolboxError(
          `MCP server exited (${code ?? "unknown"}${signal ? `, ${signal}` : ""})`,
          "SERVER_EXITED",
        ));
      }
      this.started = false;
      this.initialized = false;
    });
  }

  async initialize(clientInfo = { name: "synthia-toolbox", version: "0.1.0" }): Promise<void> {
    await this.start();
    if (this.initialized) return;
    await this.request("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo,
    });
    this.notify("notifications/initialized", {});
    this.initialized = true;
  }

  async listTools(): Promise<McpTool[]> {
    if (!this.initialized) await this.initialize();
    const response = await this.request("tools/list", {}) as { tools?: McpTool[] } | undefined;
    return response?.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.initialized) await this.initialize();
    return await this.request("tools/call", { name, arguments: args }) as ToolResult;
  }

  async close(): Promise<void> {
    this.started = false;
    this.initialized = false;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new ToolboxError("MCP client closed", "CLIENT_CLOSED"));
    }
    this.pending.clear();
    this.child?.kill();
    this.child = null;
  }

  private request(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.child?.stdin?.writable) {
      return Promise.reject(new ToolboxError("MCP server is not running", "SERVER_NOT_RUNNING"));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new ToolboxError(`Timed out waiting for MCP method ${method}`, "REQUEST_TIMEOUT", { method }));
      }, this.requestTimeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.write({ jsonrpc: "2.0", id, method, params });
    });
  }

  private notify(method: string, params: Record<string, unknown>): void {
    this.write({ jsonrpc: "2.0", method, params });
  }

  private write(message: Record<string, unknown>): void {
    if (!this.child?.stdin) throw new ToolboxError("MCP server is not running", "SERVER_NOT_RUNNING");
    const body = JSON.stringify(message);
    this.child.stdin.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
  }

  private receive(chunk: Buffer): void {
    this.buffer += chunk.toString("utf8");
    while (this.buffer.length) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd > 0 && /^content-length:/i.test(this.buffer.slice(0, headerEnd))) {
        const length = Number(this.buffer.slice(0, headerEnd).match(/content-length:\s*(\d+)/i)?.[1]);
        const bodyStart = headerEnd + 4;
        if (!Number.isFinite(length) || this.buffer.length < bodyStart + length) return;
        const body = this.buffer.slice(bodyStart, bodyStart + length);
        this.buffer = this.buffer.slice(bodyStart + length);
        this.dispatch(body);
        continue;
      }
      const newline = this.buffer.indexOf("\n");
      if (newline < 0) return;
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line) this.dispatch(line);
    }
  }

  private dispatch(raw: string): void {
    let message: { id?: number; result?: unknown; error?: { message?: string; [key: string]: unknown } };
    try {
      message = JSON.parse(raw) as typeof message;
    } catch {
      return;
    }
    if (message.id == null) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) {
      pending.reject(new ToolboxError(message.error.message ?? "MCP request failed", "MCP_ERROR", clone(message.error)));
    } else {
      pending.resolve(message.result);
    }
  }

  private rejectPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}