import type { Fragment } from '../types';

// Stubbed for now - will integrate real LLM later
export interface AnalysisResult {
  appType: string;
  framework: string;
  missing: string[];
  suggestedStructure: Record<string, unknown>;
}

export async function analyzeFragments(fragments: Fragment[]): Promise<AnalysisResult> {
  // Simple heuristic analysis for now
  const extensions = fragments.map(f => {
    const parts = f.filename.split('.');
    return parts[parts.length - 1];
  });

  let framework = 'unknown';
  let appType = 'generic';

  if (extensions.includes('jsx') || extensions.includes('tsx')) {
    framework = 'react';
    appType = 'react-spa';
  } else if (extensions.includes('vue')) {
    framework = 'vue';
    appType = 'vue-spa';
  } else if (extensions.includes('svelte')) {
    framework = 'svelte';
    appType = 'svelte-spa';
  }

  const hasPackageJson = fragments.some(f => f.filename === 'package.json');
  // App.tsx is an application component, not a boot entry by itself. The
  // assembler must still generate main/index when only App.* is present.
  const hasEntry = fragments.some(f => {
    const base = f.filename.toLowerCase();
    return /(^|\/)(main|index)\.(js|jsx|ts|tsx)$/.test(base);
  });

  const missing: string[] = [];
  if (!hasPackageJson) missing.push('package.json');
  if (!hasEntry) missing.push('entry point');

  return {
    appType,
    framework,
    missing,
    suggestedStructure: {
      src: {
        components: fragments.filter(f => 
          f.filename.includes('Component') || 
          f.filename.includes('Button') ||
          f.filename.includes('Header')
        ).map(f => f.filename)
      }
    }
  };
}

export function detectFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const typeMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'react-component',
    'ts': 'typescript',
    'tsx': 'react-typescript',
    'vue': 'vue-component',
    'svelte': 'svelte-component',
    'css': 'stylesheet',
    'json': 'json',
    'md': 'markdown',
    'html': 'html'
  };

  return typeMap[ext || ''] || 'unknown';
}
