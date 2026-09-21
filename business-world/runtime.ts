import type { BusinessWorldJobRequest } from "./protocol.ts";

export function validateJobRequest(input: BusinessWorldJobRequest): BusinessWorldJobRequest {
  if (!input.operation) throw new Error("operation is required");
  if (!input.idempotencyKey?.trim()) throw new Error("idempotencyKey is required");
  if (!input.input || typeof input.input !== "object") throw new Error("input must be an object");
  return input;
}

export function canPromoteToVerified(args: {
  jobStatus: string;
  verifiedEvidenceCount: number;
}): boolean {
  return args.jobStatus === "completed" && args.verifiedEvidenceCount > 0;
}
