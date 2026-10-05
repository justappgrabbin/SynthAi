"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolInputError = exports.ToolApprovalRequiredError = exports.ToolboxError = void 0;
exports.clone = clone;
exports.validateInput = validateInput;
exports.assertValidInput = assertValidInput;
class ToolboxError extends Error {
    code;
    details;
    constructor(message, code = "TOOLBOX_ERROR", details = {}) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = "ToolboxError";
    }
}
exports.ToolboxError = ToolboxError;
class ToolApprovalRequiredError extends ToolboxError {
    preview;
    constructor(preview) {
        super(`Approval required before calling ${preview.tool}`, "APPROVAL_REQUIRED", { preview });
        this.preview = preview;
        this.name = "ToolApprovalRequiredError";
    }
}
exports.ToolApprovalRequiredError = ToolApprovalRequiredError;
class ToolInputError extends ToolboxError {
    errors;
    constructor(errors) {
        super("Tool input does not match the tool schema", "INVALID_INPUT", {
            errors,
        });
        this.errors = errors;
        this.name = "ToolInputError";
    }
}
exports.ToolInputError = ToolInputError;
function clone(value) {
    return structuredClone(value);
}
function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function typeMatches(value, type) {
    if (type === "null")
        return value === null;
    if (type === "array")
        return Array.isArray(value);
    if (type === "object")
        return isObject(value);
    if (type === "integer")
        return Number.isInteger(value);
    if (type === "number")
        return typeof value === "number" && Number.isFinite(value);
    return typeof value === type;
}
function validateInput(schema = { type: "object" }, value, path = "$") {
    const errors = [];
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
            if (!(required in object))
                errors.push(`${path}.${required} is required`);
        }
        for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
            if (key in object)
                errors.push(...validateInput(childSchema, object[key], `${path}.${key}`));
        }
        if (schema.additionalProperties === false) {
            for (const key of Object.keys(object)) {
                if (!(key in (schema.properties ?? {})))
                    errors.push(`${path}.${key} is not allowed`);
            }
        }
    }
    if (schema.type === "array" && schema.items && Array.isArray(value)) {
        value.forEach((item, index) => {
            errors.push(...validateInput(schema.items, item, `${path}[${index}]`));
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
        if (schema.minimum != null && value < schema.minimum)
            errors.push(`${path} must be >= ${schema.minimum}`);
        if (schema.maximum != null && value > schema.maximum)
            errors.push(`${path} must be <= ${schema.maximum}`);
    }
    return errors;
}
function assertValidInput(schema, input) {
    const errors = validateInput(schema, input);
    if (errors.length)
        throw new ToolInputError(errors);
}
