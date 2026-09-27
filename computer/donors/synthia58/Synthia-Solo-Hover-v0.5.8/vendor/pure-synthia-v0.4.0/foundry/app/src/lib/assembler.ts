import type { Fragment, App, AssemblyJob } from '../types';
import { analyzeFragments } from './llm';
import { getRandomGlyph } from './glyphs';

export async function createAssemblyJob(fragments: Fragment[]): Promise<AssemblyJob> {
  const job: AssemblyJob = {
    id: crypto.randomUUID(),
    fragments: fragments.map(f => f.id),
    status: 'queued',
    log: [],
    started: new Date().toISOString()
  };

  return job;
}

export async function assembleApp(
  fragments: Fragment[], 
  job: AssemblyJob,
  onProgress?: (log: string) => void
): Promise<App> {
  const log = (message: string) => {
    job.log.push(message);
    onProgress?.(message);
  };

  log('Starting assembly...');
  job.status = 'assembling';

  // Analyze fragments
  log('Analyzing fragments...');
  const analysis = await analyzeFragments(fragments);
  log(`Detected: ${analysis.framework} ${analysis.appType}`);

  if (analysis.missing.length > 0) {
    log(`Missing: ${analysis.missing.join(', ')}`);
  }

  // Create app structure
  log('Building file tree...');
  const tree: { src: Record<string, unknown> & { components: Record<string, string> }; [key: string]: unknown } = {
    src: {
      components: {}
    }
  };

  // Organize fragments into tree
  for (const fragment of fragments) {
    // Add origin tracking to fragment metadata
    const assemblyDate = new Date().toISOString().split('T')[0];
    const origin = `pool:assembled:${assemblyDate}:${job.id.slice(0, 8)}`;
    
    // Create enhanced fragment with origin
    const enhancedFragment = {
      ...fragment,
      metadata: {
        ...fragment.metadata,
        origin: fragment.metadata.origin || origin
      }
    };
    
    // Wrap content with glyph metadata
    const wrappedContent = wrapWithGlyphMetadata(enhancedFragment);
    
    if (fragment.type.includes('component')) {
      tree.src.components[fragment.filename] = wrappedContent;
    } else if (fragment.filename === 'package.json') {
      tree['package.json'] = fragment.content; // Don't wrap JSON
    } else {
      tree.src[fragment.filename] = wrappedContent;
    }
  }

  // Generate missing pieces
  if (analysis.missing.includes('entry point')) {
    log('Generating entry point...');
    tree.src['main.tsx'] = generateEntryPoint(fragments, analysis.framework);
  }

  if (analysis.missing.includes('package.json')) {
    log('Generating package.json...');
    tree['package.json'] = generatePackageJson(analysis.framework);
  }

  // Generate vite config if needed
  log('Generating build configuration...');
  tree['vite.config.ts'] = generateViteConfig(analysis.framework);

  // Generate index.html if missing
  if (!tree['index.html']) {
    log('Generating index.html...');
    tree['index.html'] = generateIndexHtml(analysis.framework);
  }

  log('Validating structure...');
  job.status = 'validating';

  let validationStatus: App['metadata']['validationStatus'] = 'passed';
  try {
    if (!tree.src['main.tsx'] && !tree.src['index.tsx'] && !tree.src['main.js'] && !tree.src['index.js']) validationStatus = 'failed';
    if (typeof tree['package.json'] === 'string') JSON.parse(tree['package.json'] as string);
  } catch { validationStatus = 'failed'; }

  const app: App = {
    id: crypto.randomUUID(),
    name: `${analysis.framework}-app-${Date.now()}`,
    glyph: getRandomGlyph(),
    created: new Date().toISOString(),
    sourceFragments: fragments.map(f => f.id),
    structure: {
      entry: tree.src['main.tsx'] ? 'src/main.tsx' : 'src/index.tsx',
      manifest: tree['package.json'] ? 'package.json' : undefined,
      tree
    },
    metadata: {
      framework: analysis.framework,
      dependencies: [],
      validationStatus
    },
    exportedTo: []
  };

  log('Assembly complete!');
  job.status = 'complete';
  job.completed = new Date().toISOString();
  job.resultApp = app.id;

  return app;
}

function wrapWithGlyphMetadata(fragment: Fragment): string {
  const { glyph, type, metadata, filename, added } = fragment;
  
  // Detect comment style based on file type
  const isJSStyle = filename.match(/\.(js|jsx|ts|tsx|vue|svelte)$/);
  const isCSSStyle = filename.match(/\.(css|scss|sass|less)$/);
  const isHTMLStyle = filename.match(/\.(html|xml)$/);
  
  let header = '';
  
  if (isJSStyle) {
    header = `// ═══════════════════════════════════════════════════
// FOUNDRY METADATA
// ═══════════════════════════════════════════════════
// @foundry-glyph: ${glyph}
// @foundry-type: ${type}
${metadata.quality ? `// @foundry-quality: ${metadata.quality}\n` : ''}${metadata.origin ? `// @foundry-origin: ${metadata.origin}\n` : ''}// @foundry-source: ${filename}
// @foundry-created: ${new Date(added).toLocaleDateString()}
${metadata.tags && metadata.tags.length > 0 ? `// @foundry-tags: ${metadata.tags.join(', ')}\n` : ''}${metadata.detectedIntent ? `// @foundry-intent: ${metadata.detectedIntent}\n` : ''}${metadata.qualityLocked ? '// @foundry-locked: true (production)\n' : ''}// ═══════════════════════════════════════════════════

`;
  } else if (isCSSStyle) {
    header = `/*
 * ═══════════════════════════════════════════════════
 * FOUNDRY METADATA
 * ═══════════════════════════════════════════════════
 * @foundry-glyph: ${glyph}
 * @foundry-type: ${type}
 * @foundry-origin: ${filename}
 * @foundry-created: ${new Date(added).toLocaleDateString()}
${metadata.tags && metadata.tags.length > 0 ? ` * @foundry-tags: ${metadata.tags.join(', ')}\n` : ''}${metadata.detectedIntent ? ` * @foundry-intent: ${metadata.detectedIntent}\n` : ''} * ═══════════════════════════════════════════════════
 */

`;
  } else if (isHTMLStyle) {
    header = `<!--
  ═══════════════════════════════════════════════════
  FOUNDRY METADATA
  ═══════════════════════════════════════════════════
  @foundry-glyph: ${glyph}
  @foundry-type: ${type}
  @foundry-origin: ${filename}
  @foundry-created: ${new Date(added).toLocaleDateString()}
${metadata.tags && metadata.tags.length > 0 ? `  @foundry-tags: ${metadata.tags.join(', ')}\n` : ''}${metadata.detectedIntent ? `  @foundry-intent: ${metadata.detectedIntent}\n` : ''}  ═══════════════════════════════════════════════════
-->

`;
  } else {
    // Generic comment for other file types
    header = `# ═══════════════════════════════════════════════════
# FOUNDRY METADATA
# ═══════════════════════════════════════════════════
# @foundry-glyph: ${glyph}
# @foundry-type: ${type}
# @foundry-origin: ${filename}
# @foundry-created: ${new Date(added).toLocaleDateString()}
${metadata.tags && metadata.tags.length > 0 ? `# @foundry-tags: ${metadata.tags.join(', ')}\n` : ''}${metadata.detectedIntent ? `# @foundry-intent: ${metadata.detectedIntent}\n` : ''}# ═══════════════════════════════════════════════════

`;
  }
  
  return header + fragment.content;
}

function generateEntryPoint(fragments: Fragment[], framework: string): string {
  // REACT
  if (framework === 'react') {
    const componentImports = fragments
      .filter(f => f.type.includes('component'))
      .map(f => {
        const name = f.filename.replace(/\.(jsx|tsx)$/, '');
        return `import ${name} from './components/${f.filename}';`;
      })
      .join('\n');

    return `import React from 'react';
import ReactDOM from 'react-dom/client';
${componentImports}

function App() {
  return (
    <div className="app">
      <h1>Generated App</h1>
      {/* Add your components here */}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
  }

  // VUE
  if (framework === 'vue') {
    const componentImports = fragments
      .filter(f => f.type.includes('component'))
      .map(f => {
        const name = f.filename.replace(/\.vue$/, '');
        return `import ${name} from './components/${f.filename}';`;
      })
      .join('\n');

    return `import { createApp } from 'vue';
${componentImports}

const App = {
  template: \`
    <div id="app">
      <h1>Generated App</h1>
      <!-- Add your components here -->
    </div>
  \`
};

createApp(App).mount('#app');
`;
  }

  // SVELTE
  if (framework === 'svelte') {
    return `import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')
});

export default app;
`;
  }

  // VANILLA JS/TS
  if (framework === 'unknown' || framework === 'javascript' || framework === 'typescript') {
    const imports = fragments
      .filter(f => f.type !== 'stylesheet' && f.type !== 'json')
      .map(f => {
        const name = f.filename.replace(/\.(js|ts)$/, '');
        return `import { init as init${name} } from './${f.filename}';`;
      })
      .join('\n');

    return `${imports}

// Entry point
document.addEventListener('DOMContentLoaded', () => {
  console.log('App initialized');
  
  // Initialize your modules here
  ${fragments
    .filter(f => f.type !== 'stylesheet' && f.type !== 'json')
    .map(f => {
      const name = f.filename.replace(/\.(js|ts)$/, '');
      return `  // init${name}();`;
    })
    .join('\n')}
});
`;
  }

  // FALLBACK
  return '// Entry point\nconsole.log("App started");';
}

function generatePackageJson(framework: string): string {
  const basePackage = {
    name: 'foundry-app',
    version: '0.1.0',
    type: 'module'
  };

  // REACT
  if (framework === 'react') {
    return JSON.stringify({
      ...basePackage,
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        '@vitejs/plugin-react': '^4.0.0',
        'typescript': '^5.0.0',
        'vite': '^5.0.0'
      },
      scripts: {
        'dev': 'vite',
        'build': 'vite build',
        'preview': 'vite preview'
      }
    }, null, 2);
  }

  // VUE
  if (framework === 'vue') {
    return JSON.stringify({
      ...basePackage,
      dependencies: {
        'vue': '^3.3.0'
      },
      devDependencies: {
        '@vitejs/plugin-vue': '^4.0.0',
        'typescript': '^5.0.0',
        'vite': '^5.0.0'
      },
      scripts: {
        'dev': 'vite',
        'build': 'vite build',
        'preview': 'vite preview'
      }
    }, null, 2);
  }

  // SVELTE
  if (framework === 'svelte') {
    return JSON.stringify({
      ...basePackage,
      dependencies: {
        'svelte': '^4.0.0'
      },
      devDependencies: {
        '@sveltejs/vite-plugin-svelte': '^2.0.0',
        'typescript': '^5.0.0',
        'vite': '^5.0.0'
      },
      scripts: {
        'dev': 'vite',
        'build': 'vite build',
        'preview': 'vite preview'
      }
    }, null, 2);
  }

  // VANILLA JS/TS
  return JSON.stringify({
    ...basePackage,
    devDependencies: {
      'typescript': '^5.0.0',
      'vite': '^5.0.0'
    },
    scripts: {
      'dev': 'vite',
      'build': 'vite build',
      'preview': 'vite preview'
    }
  }, null, 2);
}

function generateViteConfig(framework: string): string {
  if (framework === 'react') {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;
  }

  if (framework === 'vue') {
    return `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});
`;
  }

  if (framework === 'svelte') {
    return `import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
});
`;
  }

  // Vanilla
  return `import { defineConfig } from 'vite';

export default defineConfig({
  // Vanilla config
});
`;
}

function generateIndexHtml(framework: string): string {
  const entryPoint = framework === 'react' ? '/src/main.tsx' : 
                     framework === 'vue' ? '/src/main.ts' :
                     framework === 'svelte' ? '/src/main.ts' :
                     '/src/main.ts';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Foundry App</title>
  </head>
  <body>
    <div id="${framework === 'vue' || framework === 'svelte' ? 'app' : 'root'}"></div>
    <script type="module" src="${entryPoint}"></script>
  </body>
</html>
`;
}
