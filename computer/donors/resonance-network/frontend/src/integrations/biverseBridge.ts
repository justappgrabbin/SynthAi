export type BiverseBridgeState = {
  enabled: boolean;
  status: 'reserved' | 'connected' | 'unavailable';
  endpoint?: string;
};

/**
 * Reserved integration seam for the later Biverse / Synthia mesh connection.
 * Social Resonance can ship independently; enabling Biverse later should not
 * require replacing the social UI or the organism backend.
 */
export const biverseBridge: BiverseBridgeState = {
  enabled: false,
  status: 'reserved',
};

export const BIVERSE_CAPABILITIES = [
  'guide-context',
  'shared-state',
  'mesh-memory',
  'relationship-reading',
  'generative-mesh',
] as const;
