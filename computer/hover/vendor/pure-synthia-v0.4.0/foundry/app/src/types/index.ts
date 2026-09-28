export type FragmentStatus = 'pool' | 'staged' | 'consumed' | 'archived';

export interface Fragment {
  id: string;
  glyph: string;
  filename: string;
  type: string;
  content: string;
  metadata: {
    imports?: string[];
    exports?: string[];
    tags?: string[];
    detectedIntent?: string;
    quality?: 'draft' | 'tested' | 'production' | 'archived';
    origin?: string; // pool:collection:version:assembled:date
    qualityLocked?: boolean; // true when quality === 'production'
    size: number;
  };
  status: FragmentStatus;
  added: string;
  consumedBy?: string;
}

export interface App {
  id: string;
  name: string;
  glyph: string;
  created: string;
  sourceFragments: string[];
  structure: {
    entry: string;
    manifest?: string;
    tree: Record<string, unknown>;
  };
  metadata: {
    framework?: string;
    dependencies?: string[];
    validationStatus: 'passed' | 'failed' | 'pending';
  };
  exportedTo: string[];
  archived?: boolean;
  archivedAt?: string;
}

export interface AssemblyJob {
  id: string;
  fragments: string[];
  status: 'queued' | 'assembling' | 'validating' | 'complete' | 'failed';
  log: string[];
  resultApp?: string;
  started: string;
  completed?: string;
}
