class MIRAnalyzer {
  analyze(artifact) {
    const content = artifact.originalContent;
    const fileType = this.detectFileType(artifact.originalName);
    const contract = {
      fileType,
      exports: this.extractExports(content),
      imports: this.extractImports(content),
      dependencies: this.extractDependencies(content),
      props: fileType === "tsx" || fileType === "jsx" ? this.extractProps(content) : void 0,
      behavior: this.extractBehavior(content),
      visualStructure: fileType === "tsx" || fileType === "jsx" ? this.extractVisualStructure(content) : void 0,
      dataFlow: this.extractDataFlow(content),
      stateShape: this.extractStateShape(content),
      apiSurface: this.extractApiSurface(content)
    };
    const blueprint = this.extractBlueprint(content);
    return { contract, blueprint };
  }
  detectFileType(filename) {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const typeMap = {
      "tsx": "tsx",
      "ts": "ts",
      "js": "js",
      "jsx": "jsx",
      "py": "py",
      "json": "json",
      "css": "css",
      "md": "md"
    };
    return typeMap[ext] || "unknown";
  }
  extractExports(content) {
    const exports = [];
    const defaultMatch = content.match(/export\s+default\s+(?:function|class|const)?\s*(\w+)/);
    if (defaultMatch) exports.push(`default:${defaultMatch[1]}`);
    const namedMatches = content.matchAll(/export\s+(?:function|class|const|type|interface)\s+(\w+)/g);
    for (const match of namedMatches) {
      exports.push(match[1]);
    }
    return exports;
  }
  extractImports(content) {
    const imports = [];
    const matches = content.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of matches) {
      imports.push(match[1]);
    }
    return imports;
  }
  extractDependencies(content) {
    const deps = /* @__PURE__ */ new Set();
    if (content.includes("react")) deps.add("react");
    if (content.includes("framer-motion")) deps.add("framer-motion");
    if (content.includes("useState") || content.includes("useEffect")) deps.add("react-hooks");
    if (content.includes("fetch") || content.includes("axios")) deps.add("http-client");
    if (content.includes("supabase")) deps.add("supabase");
    if (content.includes("tailwind")) deps.add("tailwind");
    if (content.includes("three")) deps.add("three.js");
    if (content.includes("tensorflow") || content.includes("tf.")) deps.add("tensorflow");
    if (content.includes("neo4j")) deps.add("neo4j");
    return Array.from(deps);
  }
  extractProps(content) {
    const props = [];
    const interfaceMatch = content.match(/interface\s+\w+Props\s*\{([^}]+)\}/);
    if (interfaceMatch) {
      const propsBlock = interfaceMatch[1];
      const propMatches = propsBlock.matchAll(/(\w+)(\?)?:\s*(\w+)/g);
      for (const match of propMatches) {
        props.push({
          name: match[1],
          type: match[3],
          required: !match[2]
        });
      }
    }
    const destructMatch = content.match(/\{\s*([^}]+)\}\s*:\s*\w+Props/);
    if (destructMatch) {
      const propNames = destructMatch[1].split(",").map((s) => s.trim());
      for (const name of propNames) {
        if (!props.find((p) => p.name === name)) {
          props.push({ name, type: "unknown", required: true });
        }
      }
    }
    return props;
  }
  extractBehavior(content) {
    const behavior = [];
    if (content.includes("onClick")) behavior.push("handles click events");
    if (content.includes("onChange")) behavior.push("handles input changes");
    if (content.includes("onSubmit")) behavior.push("handles form submission");
    if (content.includes("useState")) behavior.push("manages local state");
    if (content.includes("useEffect")) behavior.push("reacts to lifecycle changes");
    if (content.includes("useReducer")) behavior.push("complex state management");
    if (content.includes("useMemo")) behavior.push("memoized computations");
    if (content.includes("fetch") || content.includes("axios")) behavior.push("makes API calls");
    if (content.includes("map(")) behavior.push("renders lists dynamically");
    if (content.includes("if (") || content.includes("? :")) behavior.push("conditional rendering");
    if (content.includes("animate") || content.includes("motion")) behavior.push("has animations");
    if (content.includes("useRef")) behavior.push("DOM/refs interaction");
    if (content.includes("createPortal")) behavior.push("portal rendering");
    if (content.includes("Suspense")) behavior.push("async loading");
    if (content.includes("ErrorBoundary")) behavior.push("error handling");
    return behavior;
  }
  extractVisualStructure(content) {
    const structure = [];
    const returnRegex = /return\s*\((.*?)\);?\s*\}/s;
    const returnMatch = content.match(returnRegex);
    if (returnMatch) {
      const jsx = returnMatch[1];
      const elementRegex = /<(\w+)[^>]*>([^<]*|<[^/][^>]*>[^<]*<\/[^>]+>)*/g;
      let elMatch;
      while ((elMatch = elementRegex.exec(jsx)) !== null) {
        const tag = elMatch[1];
        if (tag && tag[0] === tag[0].toLowerCase() && tag !== "motion") {
          structure.push({
            element: tag,
            text: elMatch[2] || void 0,
            props: this.extractElementProps(elMatch[0], tag),
            children: this.extractChildren(elMatch[0])
          });
        }
      }
    }
    return structure;
  }
  extractElementProps(jsx, tag) {
    const props = {};
    const propRegex = /(\w+)=\{([^}]+)\}|(\w+)="([^"]*)"/g;
    let match;
    while ((match = propRegex.exec(jsx)) !== null) {
      const key = match[1] || match[3];
      const val = match[2] || match[4];
      if (key && key !== tag) {
        props[key] = val;
      }
    }
    return props;
  }
  extractChildren(jsx) {
    const children = [];
    const childRegex = /<(\w+)[^>]*>([^<]*)<\/\1>/g;
    let match;
    while ((match = childRegex.exec(jsx)) !== null) {
      if (match[1] !== "div" && match[1] !== "span") {
        children.push({
          element: match[1],
          text: match[2] || void 0
        });
      }
    }
    return children.length > 0 ? children : void 0;
  }
  extractDataFlow(content) {
    const flows = [];
    if (content.includes("useState")) {
      flows.push({ from: "user", to: "state", type: "state" });
    }
    if (content.includes("onClick")) {
      flows.push({ from: "user", to: "handler", type: "event" });
    }
    if (content.includes("onChange")) {
      flows.push({ from: "input", to: "state", type: "event", transform: "sanitize" });
    }
    if (content.includes("fetch") || content.includes("axios")) {
      flows.push({ from: "api", to: "component", type: "api" });
      flows.push({ from: "component", to: "state", type: "state", transform: "parseJSON" });
    }
    if (content.includes("props")) {
      flows.push({ from: "parent", to: "component", type: "prop" });
    }
    return flows;
  }
  extractStateShape(content) {
    const stateShape = {};
    const stateMatches = content.matchAll(/const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState(?:<([^>]+)>)?\(([^)]+)\)/g);
    for (const match of stateMatches) {
      stateShape[match[1]] = match[3] || "any";
    }
    const reducerMatch = content.match(/useReducer\((\w+),\s*\{([^}]+)\}\)/);
    if (reducerMatch) {
      const initProps = reducerMatch[2].matchAll(/(\w+):\s*(\w+)/g);
      for (const match of initProps) {
        stateShape[match[1]] = match[2];
      }
    }
    return Object.keys(stateShape).length > 0 ? stateShape : void 0;
  }
  extractApiSurface(content) {
    const endpoints = [];
    const apiMatches = content.matchAll(/(?:fetch|axios)\s*\(\s*['"]([^'"]+)['"]\s*,?\s*\{?\s*method:\s*['"](\w+)['"]?/g);
    for (const match of apiMatches) {
      endpoints.push({
        method: match[2] || "GET",
        path: match[1]
      });
    }
    const getMatches = content.matchAll(/fetch\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    for (const match of getMatches) {
      if (!endpoints.find((e) => e.path === match[1])) {
        endpoints.push({ method: "GET", path: match[1] });
      }
    }
    return endpoints.length > 0 ? endpoints : void 0;
  }
  extractBlueprint(content) {
    const imports = [...content.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g)].map((m) => m[0]);
    const exports = [...content.matchAll(/export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+\w+/g)].map((m) => m[0]);
    const functions = [...content.matchAll(/(?:function|const)\s+(\w+)/g)].map((m) => m[1]);
    const classes = [...content.matchAll(/class\s+(\w+)/g)].map((m) => m[1]);
    const hasJsx = content.includes("return (") && (content.includes("<") || content.includes("div"));
    let fileRole = "utility";
    if (hasJsx) fileRole = "component";
    else if (exports.some((e) => e.includes("default"))) fileRole = "module";
    else if (classes.length > 0) fileRole = "class";
    else if (functions.length > 0) fileRole = "functions";
    return {
      imports,
      exports,
      functions,
      classes,
      hasJsx,
      fileRole,
      chunkCount: Math.ceil(content.length / 2e3),
      totalLength: content.length
    };
  }
}
export {
  MIRAnalyzer
};
