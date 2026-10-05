export type JsonSchema = {
  type?: string | string[];
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  [key: string]: unknown;
};

export type ToolContent = {
  type?: string;
  text?: string;
  [key: string]: unknown;
};

export type ToolResult = {
  content?: ToolContent[];
  isError?: boolean;
  [key: string]: unknown;
};

export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
  annotations?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type McpClient = {
  start?: () => Promise<void>;
  initialize?: (clientInfo?: { name: string; version: string }) => Promise<void>;
  listTools: () => Promise<McpTool[]>;
  callTool: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
  close?: () => Promise<void>;
};

export class ToolboxError extends Error {
  constructor(
    message: string,
    public readonly code = "TOOLBOX_ERROR",
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ToolboxError";
  }
}

export class ToolApprovalRequiredError extends ToolboxError {
  constructor(public readonly preview: ToolPreview) {
    super(
      `Approval required before calling ${preview.tool}`,
      "APPROVAL_REQUIRED",
      { preview },
    );
    this.name = "ToolApprovalRequiredError";
  }
}

export class ToolInputError extends ToolboxError {
  constructor(public readonly errors: string[]) {
    super("Tool input does not match the tool schema", "INVALID_INPUT", {
      errors,
    });
    this.name = "ToolInputError";
  }
}

export type ToolPreview = {
  tool: string;
  server: string;
  action: string;
  arguments: Record<string, unknown>;
  requiresApproval: boolean;
  reason: string | null;
};

export function clone<T>(value: T): T {
  return structuredClone(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function typeMatches(value: unknown, type: string): boolean {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isObject(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

export function validateInput(
  schema: JsonSchema = { type: "object" },
  value: unknown,
  path = "$",
): string[] {
  const errors: string[] = [];
  const types = schema.type
    ? Array.isArray(schema.type)
      ? schema.type
      : [schema.type]
    : [];

  if (schema.enum && !schema.enum.some((candidate) => Object.is(candidate, value))) {
    errors.push(`${path} must be one of: ${schema.enum.join(", ")}`);
    return errors;
  }

  if (types.length && !types.some((type) => typeMatches(value, type))) {
    errors.push(`${path} must be ${types.join(" or ")}`);
    return errors;
  }

  if (schema.type === "object" || schema.properties) {
    const object = isObject(value) ? value : {};
    for (const required of schema.required ?? []) {
      if (!(required in object)) errors.push(`${path}.${required} is required`);
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in object) errors.push(...validateInput(childSchema, object[key], `${path}.${key}`));
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(object)) {
        if (!(key in (schema.properties ?? {}))) errors.push(`${path}.${key} is not allowed`);
      }
    }
  }

  if (schema.type === "array" && schema.items && Array.isArray(value)) {
    value.forEach((item, index) => {
      errors.push(...validateInput(schema.items as JsonSchema, item, `${path}[${index}]`));
    });
  }

  if (typeof value === "string") {
    if (schema.minLength != null && value.length < schema.minLength) {
      errors.push(`${path} must be at least ${schema.minLength} characters`);
    }
    if (schema.maxLength != null && value.length > schema.maxLength) {
      errors.push(`${path} must be at most ${schema.maxLength} characters`);
    }
  }

  if (typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum) errors.push(`${path} must be >= ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) errors.push(`${path} must be <= ${schema.maximum}`);
  }

  return errors;
}

export function assertValidInput(schema: JsonSchema | undefined, input: unknown): void {
  const errors = validateInput(schema, input);
  if (errors.length) throw new ToolInputError(errors);
}