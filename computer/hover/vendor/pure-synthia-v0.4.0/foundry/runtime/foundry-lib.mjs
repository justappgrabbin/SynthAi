// mnt/data/Pure-Synthia-Swarm-Body-v0.2.0/foundry/app/src/lib/glyphs.ts
var GLYPHS = [
  "\u27C1",
  "\u27D0",
  "\u27E1",
  "\u27E2",
  "\u27E3",
  "\u27E4",
  "\u27E5",
  "\u27E6",
  "\u27E7",
  "\u27E8",
  "\u27E9",
  "\u27EA",
  "\u27EB",
  "\u27EC",
  "\u27ED",
  "\u27EE",
  "\u27EF",
  "\u29C0",
  "\u29C1",
  "\u29C2",
  "\u29C3",
  "\u29C4",
  "\u29C5",
  "\u29C6",
  "\u29C7",
  "\u29C8",
  "\u29C9",
  "\u29CA",
  "\u29CB",
  "\u29CC",
  "\u29CD",
  "\u29CE",
  "\u29CF",
  "\u29D0",
  "\u29D1",
  "\u29D2",
  "\u29D3",
  "\u29D4",
  "\u29D5",
  "\u29D6",
  "\u29D7",
  "\u29D8",
  "\u29D9",
  "\u29DA",
  "\u29DB",
  "\u29DC",
  "\u29DD",
  "\u29DE",
  "\u29DF"
];
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
function assignGlyph(filename) {
  const index = hashString(filename) % GLYPHS.length;
  return GLYPHS[index];
}
function getRandomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

// mnt/data/Pure-Synthia-Swarm-Body-v0.2.0/foundry/app/src/lib/glyphParser.ts
function parseGlyphMetadata(content) {
  const metadata = {};
  const patterns = [
    // JS-style: // @foundry-key: value
    /@foundry-(\w+):\s*(.+)/g,
    // CSS-style: * @foundry-key: value
    /\*\s*@foundry-(\w+):\s*(.+)/g,
    // HTML-style: @foundry-key: value
    /@foundry-(\w+):\s*(.+)/g
  ];
  let foundMetadata = false;
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      foundMetadata = true;
      const key = match[1];
      const value = match[2].trim();
      switch (key) {
        case "glyph":
          metadata.glyph = value;
          break;
        case "type":
          metadata.type = value;
          break;
        case "quality":
          if (["draft", "tested", "production", "archived"].includes(value)) {
            metadata.quality = value;
          }
          break;
        case "origin":
          metadata.origin = value;
          break;
        case "source":
          metadata.source = value;
          break;
        case "created":
          metadata.created = value;
          break;
        case "tags":
          metadata.tags = value.split(",").map((t) => t.trim());
          break;
        case "intent":
          metadata.intent = value;
          break;
        case "locked":
          metadata.locked = value.toLowerCase().includes("true");
          break;
      }
    }
  }
  return foundMetadata ? metadata : null;
}
function stripGlyphMetadata(content) {
  const patterns = [
    // JS-style block
    /\/\/ ═+[\s\S]*?\/\/ FOUNDRY METADATA[\s\S]*?\/\/ ═+\n\n?/,
    // CSS-style block
    /\/\*[\s\S]*?FOUNDRY METADATA[\s\S]*?\*\/\n\n?/,
    // HTML-style block
    /<!--[\s\S]*?FOUNDRY METADATA[\s\S]*?-->\n\n?/,
    // Generic block
    /# ═+[\s\S]*?# FOUNDRY METADATA[\s\S]*?# ═+\n\n?/
  ];
  let result = content;
  for (const pattern of patterns) {
    result = result.replace(pattern, "");
  }
  return result;
}
function mergeGlyphMetadata(fragment, parsed) {
  if (!parsed) return fragment;
  return {
    ...fragment,
    glyph: parsed.glyph || fragment.glyph,
    type: parsed.type || fragment.type,
    metadata: {
      ...fragment.metadata,
      quality: parsed.quality || fragment.metadata.quality,
      origin: parsed.origin || fragment.metadata.origin,
      qualityLocked: parsed.locked || fragment.metadata.qualityLocked,
      tags: parsed.tags || fragment.metadata.tags,
      detectedIntent: parsed.intent || fragment.metadata.detectedIntent
    }
  };
}

// mnt/data/Pure-Synthia-Swarm-Body-v0.2.0/foundry/app/src/lib/llm.ts
async function analyzeFragments(fragments) {
  const extensions = fragments.map((f) => {
    const parts = f.filename.split(".");
    return parts[parts.length - 1];
  });
  let framework = "unknown";
  let appType = "generic";
  if (extensions.includes("jsx") || extensions.includes("tsx")) {
    framework = "react";
    appType = "react-spa";
  } else if (extensions.includes("vue")) {
    framework = "vue";
    appType = "vue-spa";
  } else if (extensions.includes("svelte")) {
    framework = "svelte";
    appType = "svelte-spa";
  }
  const hasPackageJson = fragments.some((f) => f.filename === "package.json");
  const hasEntry = fragments.some((f) => {
    const base = f.filename.toLowerCase();
    return /(^|\/)(main|index)\.(js|jsx|ts|tsx)$/.test(base);
  });
  const missing = [];
  if (!hasPackageJson) missing.push("package.json");
  if (!hasEntry) missing.push("entry point");
  return {
    appType,
    framework,
    missing,
    suggestedStructure: {
      src: {
        components: fragments.filter(
          (f) => f.filename.includes("Component") || f.filename.includes("Button") || f.filename.includes("Header")
        ).map((f) => f.filename)
      }
    }
  };
}
function detectFileType(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const typeMap = {
    "js": "javascript",
    "jsx": "react-component",
    "ts": "typescript",
    "tsx": "react-typescript",
    "vue": "vue-component",
    "svelte": "svelte-component",
    "css": "stylesheet",
    "json": "json",
    "md": "markdown",
    "html": "html"
  };
  return typeMap[ext || ""] || "unknown";
}

// mnt/data/Pure-Synthia-Swarm-Body-v0.2.0/foundry/app/src/lib/assembler.ts
async function createAssemblyJob(fragments) {
  const job = {
    id: crypto.randomUUID(),
    fragments: fragments.map((f) => f.id),
    status: "queued",
    log: [],
    started: (/* @__PURE__ */ new Date()).toISOString()
  };
  return job;
}
async function assembleApp(fragments, job, onProgress) {
  const log = (message) => {
    job.log.push(message);
    onProgress?.(message);
  };
  log("Starting assembly...");
  job.status = "assembling";
  log("Analyzing fragments...");
  const analysis = await analyzeFragments(fragments);
  log(`Detected: ${analysis.framework} ${analysis.appType}`);
  if (analysis.missing.length > 0) {
    log(`Missing: ${analysis.missing.join(", ")}`);
  }
  log("Building file tree...");
  const tree = {
    src: {
      components: {}
    }
  };
  for (const fragment of fragments) {
    const assemblyDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const origin = `pool:assembled:${assemblyDate}:${job.id.slice(0, 8)}`;
    const enhancedFragment = {
      ...fragment,
      metadata: {
        ...fragment.metadata,
        origin: fragment.metadata.origin || origin
      }
    };
    const wrappedContent = wrapWithGlyphMetadata(enhancedFragment);
    if (fragment.type.includes("component")) {
      tree.src.components[fragment.filename] = wrappedContent;
    } else if (fragment.filename === "package.json") {
      tree["package.json"] = fragment.content;
    } else {
      tree.src[fragment.filename] = wrappedContent;
    }
  }
  if (analysis.missing.includes("entry point")) {
    log("Generating entry point...");
    tree.src["main.tsx"] = generateEntryPoint(fragments, analysis.framework);
  }
  if (analysis.missing.includes("package.json")) {
    log("Generating package.json...");
    tree["package.json"] = generatePackageJson(analysis.framework);
  }
  log("Generating build configuration...");
  tree["vite.config.ts"] = generateViteConfig(analysis.framework);
  if (!tree["index.html"]) {
    log("Generating index.html...");
    tree["index.html"] = generateIndexHtml(analysis.framework);
  }
  log("Validating structure...");
  job.status = "validating";
  let validationStatus = "passed";
  try {
    if (!tree.src["main.tsx"] && !tree.src["index.tsx"] && !tree.src["main.js"] && !tree.src["index.js"]) validationStatus = "failed";
    if (typeof tree["package.json"] === "string") JSON.parse(tree["package.json"]);
  } catch {
    validationStatus = "failed";
  }
  const app = {
    id: crypto.randomUUID(),
    name: `${analysis.framework}-app-${Date.now()}`,
    glyph: getRandomGlyph(),
    created: (/* @__PURE__ */ new Date()).toISOString(),
    sourceFragments: fragments.map((f) => f.id),
    structure: {
      entry: tree.src["main.tsx"] ? "src/main.tsx" : "src/index.tsx",
      manifest: tree["package.json"] ? "package.json" : void 0,
      tree
    },
    metadata: {
      framework: analysis.framework,
      dependencies: [],
      validationStatus
    },
    exportedTo: []
  };
  log("Assembly complete!");
  job.status = "complete";
  job.completed = (/* @__PURE__ */ new Date()).toISOString();
  job.resultApp = app.id;
  return app;
}
function wrapWithGlyphMetadata(fragment) {
  const { glyph, type, metadata, filename, added } = fragment;
  const isJSStyle = filename.match(/\.(js|jsx|ts|tsx|vue|svelte)$/);
  const isCSSStyle = filename.match(/\.(css|scss|sass|less)$/);
  const isHTMLStyle = filename.match(/\.(html|xml)$/);
  let header = "";
  if (isJSStyle) {
    header = `// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// FOUNDRY METADATA
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// @foundry-glyph: ${glyph}
// @foundry-type: ${type}
${metadata.quality ? `// @foundry-quality: ${metadata.quality}
` : ""}${metadata.origin ? `// @foundry-origin: ${metadata.origin}
` : ""}// @foundry-source: ${filename}
// @foundry-created: ${new Date(added).toLocaleDateString()}
${metadata.tags && metadata.tags.length > 0 ? `// @foundry-tags: ${metadata.tags.join(", ")}
` : ""}${metadata.detectedIntent ? `// @foundry-intent: ${metadata.detectedIntent}
` : ""}${metadata.qualityLocked ? "// @foundry-locked: true (production)\n" : ""}// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

`;
  } else if (isCSSStyle) {
    header = `/*
 * \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
 * FOUNDRY METADATA
 * \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
 * @foundry-glyph: ${glyph}
 * @foundry-type: ${type}
 * @foundry-origin: ${filename}
 * @foundry-created: ${new Date(added).toLocaleDateString()}
${metadata.tags && metadata.tags.length > 0 ? ` * @foundry-tags: ${metadata.tags.join(", ")}
` : ""}${metadata.detectedIntent ? ` * @foundry-intent: ${metadata.detectedIntent}
` : ""} * \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
 */

`;
  } else if (isHTMLStyle) {
    header = `<!--
  \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  FOUNDRY METADATA
  \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  @foundry-glyph: ${glyph}
  @foundry-type: ${type}
  @foundry-origin: ${filename}
  @foundry-created: ${new Date(added).toLocaleDateString()}
${metadata.tags && metadata.tags.length > 0 ? `  @foundry-tags: ${metadata.tags.join(", ")}
` : ""}${metadata.detectedIntent ? `  @foundry-intent: ${metadata.detectedIntent}
` : ""}  \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
-->

`;
  } else {
    header = `# \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
# FOUNDRY METADATA
# \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
# @foundry-glyph: ${glyph}
# @foundry-type: ${type}
# @foundry-origin: ${filename}
# @foundry-created: ${new Date(added).toLocaleDateString()}
${metadata.tags && metadata.tags.length > 0 ? `# @foundry-tags: ${metadata.tags.join(", ")}
` : ""}${metadata.detectedIntent ? `# @foundry-intent: ${metadata.detectedIntent}
` : ""}# \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

`;
  }
  return header + fragment.content;
}
function generateEntryPoint(fragments, framework) {
  if (framework === "react") {
    const componentImports = fragments.filter((f) => f.type.includes("component")).map((f) => {
      const name = f.filename.replace(/\.(jsx|tsx)$/, "");
      return `import ${name} from './components/${f.filename}';`;
    }).join("\n");
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
  if (framework === "vue") {
    const componentImports = fragments.filter((f) => f.type.includes("component")).map((f) => {
      const name = f.filename.replace(/\.vue$/, "");
      return `import ${name} from './components/${f.filename}';`;
    }).join("\n");
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
  if (framework === "svelte") {
    return `import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')
});

export default app;
`;
  }
  if (framework === "unknown" || framework === "javascript" || framework === "typescript") {
    const imports = fragments.filter((f) => f.type !== "stylesheet" && f.type !== "json").map((f) => {
      const name = f.filename.replace(/\.(js|ts)$/, "");
      return `import { init as init${name} } from './${f.filename}';`;
    }).join("\n");
    return `${imports}

// Entry point
document.addEventListener('DOMContentLoaded', () => {
  console.log('App initialized');
  
  // Initialize your modules here
  ${fragments.filter((f) => f.type !== "stylesheet" && f.type !== "json").map((f) => {
      const name = f.filename.replace(/\.(js|ts)$/, "");
      return `  // init${name}();`;
    }).join("\n")}
});
`;
  }
  return '// Entry point\nconsole.log("App started");';
}
function generatePackageJson(framework) {
  const basePackage = {
    name: "foundry-app",
    version: "0.1.0",
    type: "module"
  };
  if (framework === "react") {
    return JSON.stringify({
      ...basePackage,
      dependencies: {
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
      },
      devDependencies: {
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        "@vitejs/plugin-react": "^4.0.0",
        "typescript": "^5.0.0",
        "vite": "^5.0.0"
      },
      scripts: {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview"
      }
    }, null, 2);
  }
  if (framework === "vue") {
    return JSON.stringify({
      ...basePackage,
      dependencies: {
        "vue": "^3.3.0"
      },
      devDependencies: {
        "@vitejs/plugin-vue": "^4.0.0",
        "typescript": "^5.0.0",
        "vite": "^5.0.0"
      },
      scripts: {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview"
      }
    }, null, 2);
  }
  if (framework === "svelte") {
    return JSON.stringify({
      ...basePackage,
      dependencies: {
        "svelte": "^4.0.0"
      },
      devDependencies: {
        "@sveltejs/vite-plugin-svelte": "^2.0.0",
        "typescript": "^5.0.0",
        "vite": "^5.0.0"
      },
      scripts: {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview"
      }
    }, null, 2);
  }
  return JSON.stringify({
    ...basePackage,
    devDependencies: {
      "typescript": "^5.0.0",
      "vite": "^5.0.0"
    },
    scripts: {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview"
    }
  }, null, 2);
}
function generateViteConfig(framework) {
  if (framework === "react") {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;
  }
  if (framework === "vue") {
    return `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});
`;
  }
  if (framework === "svelte") {
    return `import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
});
`;
  }
  return `import { defineConfig } from 'vite';

export default defineConfig({
  // Vanilla config
});
`;
}
function generateIndexHtml(framework) {
  const entryPoint = framework === "react" ? "/src/main.tsx" : framework === "vue" ? "/src/main.ts" : framework === "svelte" ? "/src/main.ts" : "/src/main.ts";
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Foundry App</title>
  </head>
  <body>
    <div id="${framework === "vue" || framework === "svelte" ? "app" : "root"}"></div>
    <script type="module" src="${entryPoint}"><\/script>
  </body>
</html>
`;
}

// mnt/data/foundry_audit/extracted/foundry/node_modules/idb/build/index.js
var instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
var idbProxyableTypes;
var cursorAdvanceMethods;
function getIdbProxyableTypes() {
  return idbProxyableTypes || (idbProxyableTypes = [
    IDBDatabase,
    IDBObjectStore,
    IDBIndex,
    IDBCursor,
    IDBTransaction
  ]);
}
function getCursorAdvanceMethods() {
  return cursorAdvanceMethods || (cursorAdvanceMethods = [
    IDBCursor.prototype.advance,
    IDBCursor.prototype.continue,
    IDBCursor.prototype.continuePrimaryKey
  ]);
}
var transactionDoneMap = /* @__PURE__ */ new WeakMap();
var transformCache = /* @__PURE__ */ new WeakMap();
var reverseTransformCache = /* @__PURE__ */ new WeakMap();
function promisifyRequest(request) {
  const promise = new Promise((resolve, reject) => {
    const unlisten = () => {
      request.removeEventListener("success", success);
      request.removeEventListener("error", error);
    };
    const success = () => {
      resolve(wrap(request.result));
      unlisten();
    };
    const error = () => {
      reject(request.error);
      unlisten();
    };
    request.addEventListener("success", success);
    request.addEventListener("error", error);
  });
  reverseTransformCache.set(promise, request);
  return promise;
}
function cacheDonePromiseForTransaction(tx) {
  if (transactionDoneMap.has(tx))
    return;
  const done = new Promise((resolve, reject) => {
    const unlisten = () => {
      tx.removeEventListener("complete", complete);
      tx.removeEventListener("error", error);
      tx.removeEventListener("abort", error);
    };
    const complete = () => {
      resolve();
      unlisten();
    };
    const error = () => {
      reject(tx.error || new DOMException("AbortError", "AbortError"));
      unlisten();
    };
    tx.addEventListener("complete", complete);
    tx.addEventListener("error", error);
    tx.addEventListener("abort", error);
  });
  transactionDoneMap.set(tx, done);
}
var idbProxyTraps = {
  get(target, prop, receiver) {
    if (target instanceof IDBTransaction) {
      if (prop === "done")
        return transactionDoneMap.get(target);
      if (prop === "store") {
        return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
      }
    }
    return wrap(target[prop]);
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  },
  has(target, prop) {
    if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
      return true;
    }
    return prop in target;
  }
};
function replaceTraps(callback) {
  idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
  if (getCursorAdvanceMethods().includes(func)) {
    return function(...args) {
      func.apply(unwrap(this), args);
      return wrap(this.request);
    };
  }
  return function(...args) {
    return wrap(func.apply(unwrap(this), args));
  };
}
function transformCachableValue(value) {
  if (typeof value === "function")
    return wrapFunction(value);
  if (value instanceof IDBTransaction)
    cacheDonePromiseForTransaction(value);
  if (instanceOfAny(value, getIdbProxyableTypes()))
    return new Proxy(value, idbProxyTraps);
  return value;
}
function wrap(value) {
  if (value instanceof IDBRequest)
    return promisifyRequest(value);
  if (transformCache.has(value))
    return transformCache.get(value);
  const newValue = transformCachableValue(value);
  if (newValue !== value) {
    transformCache.set(value, newValue);
    reverseTransformCache.set(newValue, value);
  }
  return newValue;
}
var unwrap = (value) => reverseTransformCache.get(value);
function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
  const request = indexedDB.open(name, version);
  const openPromise = wrap(request);
  if (upgrade) {
    request.addEventListener("upgradeneeded", (event) => {
      upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
    });
  }
  if (blocked) {
    request.addEventListener("blocked", (event) => blocked(
      // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
      event.oldVersion,
      event.newVersion,
      event
    ));
  }
  openPromise.then((db2) => {
    if (terminated)
      db2.addEventListener("close", () => terminated());
    if (blocking) {
      db2.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
    }
  }).catch(() => {
  });
  return openPromise;
}
var readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
var writeMethods = ["put", "add", "delete", "clear"];
var cachedMethods = /* @__PURE__ */ new Map();
function getMethod(target, prop) {
  if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
    return;
  }
  if (cachedMethods.get(prop))
    return cachedMethods.get(prop);
  const targetFuncName = prop.replace(/FromIndex$/, "");
  const useIndex = prop !== targetFuncName;
  const isWrite = writeMethods.includes(targetFuncName);
  if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
  ) {
    return;
  }
  const method = async function(storeName, ...args) {
    const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
    let target2 = tx.store;
    if (useIndex)
      target2 = target2.index(args.shift());
    return (await Promise.all([
      target2[targetFuncName](...args),
      isWrite && tx.done
    ]))[0];
  };
  cachedMethods.set(prop, method);
  return method;
}
replaceTraps((oldTraps) => ({
  ...oldTraps,
  get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
  has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
}));
var advanceMethodProps = ["continue", "continuePrimaryKey", "advance"];
var methodMap = {};
var advanceResults = /* @__PURE__ */ new WeakMap();
var ittrProxiedCursorToOriginalProxy = /* @__PURE__ */ new WeakMap();
var cursorIteratorTraps = {
  get(target, prop) {
    if (!advanceMethodProps.includes(prop))
      return target[prop];
    let cachedFunc = methodMap[prop];
    if (!cachedFunc) {
      cachedFunc = methodMap[prop] = function(...args) {
        advanceResults.set(this, ittrProxiedCursorToOriginalProxy.get(this)[prop](...args));
      };
    }
    return cachedFunc;
  }
};
async function* iterate(...args) {
  let cursor = this;
  if (!(cursor instanceof IDBCursor)) {
    cursor = await cursor.openCursor(...args);
  }
  if (!cursor)
    return;
  cursor = cursor;
  const proxiedCursor = new Proxy(cursor, cursorIteratorTraps);
  ittrProxiedCursorToOriginalProxy.set(proxiedCursor, cursor);
  reverseTransformCache.set(proxiedCursor, unwrap(cursor));
  while (cursor) {
    yield proxiedCursor;
    cursor = await (advanceResults.get(proxiedCursor) || cursor.continue());
    advanceResults.delete(proxiedCursor);
  }
}
function isIteratorProp(target, prop) {
  return prop === Symbol.asyncIterator && instanceOfAny(target, [IDBIndex, IDBObjectStore, IDBCursor]) || prop === "iterate" && instanceOfAny(target, [IDBIndex, IDBObjectStore]);
}
replaceTraps((oldTraps) => ({
  ...oldTraps,
  get(target, prop, receiver) {
    if (isIteratorProp(target, prop))
      return iterate;
    return oldTraps.get(target, prop, receiver);
  },
  has(target, prop) {
    return isIteratorProp(target, prop) || oldTraps.has(target, prop);
  }
}));

// mnt/data/Pure-Synthia-Swarm-Body-v0.2.0/foundry/app/src/lib/storage.ts
var db = null;
async function getDB() {
  if (db) return db;
  db = await openDB("foundry", 1, {
    upgrade(db2) {
      const fragmentStore = db2.createObjectStore("fragments", {
        keyPath: "id"
      });
      fragmentStore.createIndex("by-status", "status");
      db2.createObjectStore("apps", {
        keyPath: "id"
      });
      db2.createObjectStore("jobs", {
        keyPath: "id"
      });
    }
  });
  return db;
}
async function saveFragment(fragment) {
  const db2 = await getDB();
  await db2.put("fragments", fragment);
}
async function getFragment(id) {
  const db2 = await getDB();
  return await db2.get("fragments", id);
}
async function getAllFragments() {
  const db2 = await getDB();
  return await db2.getAll("fragments");
}
async function getFragmentsByStatus(status) {
  const db2 = await getDB();
  return await db2.getAllFromIndex("fragments", "by-status", status);
}
async function deleteFragment(id) {
  const db2 = await getDB();
  const fragment = await db2.get("fragments", id);
  if (!fragment) return;
  fragment.status = "archived";
  fragment.metadata = { ...fragment.metadata, quality: "archived" };
  await db2.put("fragments", fragment);
}
async function saveApp(app) {
  const db2 = await getDB();
  await db2.put("apps", app);
}
async function getApp(id) {
  const db2 = await getDB();
  return await db2.get("apps", id);
}
async function getAllApps() {
  const db2 = await getDB();
  return await db2.getAll("apps");
}
async function deleteApp(id) {
  const db2 = await getDB();
  const app = await db2.get("apps", id);
  if (!app) return;
  app.archived = true;
  app.archivedAt = (/* @__PURE__ */ new Date()).toISOString();
  await db2.put("apps", app);
}
async function saveJob(job) {
  const db2 = await getDB();
  await db2.put("jobs", job);
}
async function getJob(id) {
  const db2 = await getDB();
  return await db2.get("jobs", id);
}
async function getAllJobs() {
  const db2 = await getDB();
  return await db2.getAll("jobs");
}
export {
  GLYPHS,
  analyzeFragments,
  assembleApp,
  assignGlyph,
  createAssemblyJob,
  deleteApp,
  deleteFragment,
  detectFileType,
  getAllApps,
  getAllFragments,
  getAllJobs,
  getApp,
  getFragment,
  getFragmentsByStatus,
  getJob,
  getRandomGlyph,
  mergeGlyphMetadata,
  parseGlyphMetadata,
  saveApp,
  saveFragment,
  saveJob,
  stripGlyphMetadata
};
