export type BusinessWorldOperation =
  | "DESIGN"
  | "VERIFY"
  | "PUBLISH"
  | "SELL"
  | "FULFILL"
  | "RECONCILE"
  | "WITHDRAW";

export type JobStatus =
  | "queued"
  | "running"
  | "waiting_external"
  | "waiting_approval"
  | "failed"
  | "completed"
  | "verified";

export interface BusinessWorldJobRequest {
  operation: BusinessWorldOperation;
  sourceEntityId?: string;
  targetEntityId?: string;
  input: Record<string, unknown>;
  idempotencyKey: string;
}

export interface BusinessWorldEvidence {
  jobId: string;
  evidenceType: string;
  provider: string;
  providerResourceId?: string;
  payload: Record<string, unknown>;
  verified: boolean;
}

export interface WorldObjectState {
  entityId: string;
  projection: "factory" | "graph" | "finance" | "agent" | "market";
  objectType: string;
  position: { x: number; y: number };
  visualState: Record<string, unknown>;
  interactionConfig: Record<string, unknown>;
}
