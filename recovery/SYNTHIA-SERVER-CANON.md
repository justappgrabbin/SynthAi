# Synthia Server — Canonical Runtime Rule

Effective: 2026-09-25
Authority: creator correction

## Canonical statement

**Synthia Server is part of Synthia herself.**

Synthia Server is a **dual-runtime server**:

- **Node.js**
- **Python**
- **MCP**
- **Trident**

This is not optional infrastructure and not a generic backend placeholder.

## Hard interpretation rule

A browser/WebView compatibility requirement applies only to code that executes directly inside the browser/WebView.

It must never be expanded into any of the following interpretations:

- "Synthia should not use Node"
- "replace Synthia Server with a generic server"
- "leave the Node runtime out of the app"
- "move Synthia's server identity outside Synthia"
- "rebuild the runtime as browser-only"
- "Pure Synthia means all Synthia variants are Node-free"

## Pure Synthia distinction

The creator's **Pure Synthia** constraint was about keeping the research/grammar implementation in pure JavaScript so the mechanism could be inspected and tested directly.

That constraint did **not** prohibit Node.js across the broader Synthia architecture.

Node.js itself is JavaScript.

## Runtime boundary

The intended boundary is:

```text
Synthia UI / browser / WebView
        ↕ explicit bridge
Synthia Server
  ├─ Node.js runtime
  ├─ Python runtime
  ├─ MCP
  └─ Trident
        ↕
local Linux residence / files / tools / processes / automata
```

Browser-facing modules may remain browser-safe while Synthia Server continues to use Node and Python behind that boundary.

## Server identity

When an existing Synthia Server implementation is present, preserve and wire that implementation as the canonical server body unless the creator explicitly supersedes it.

A generic HTTP server, generic local process server, generic WebView host, or replacement backend does not become "Synthia Server" merely because it can serve files or routes.

## Existing repository evidence

The repository's existing hub/server plan states:

> Use `synthia-master-merged-v4.3` as the server body and merge `messenger-v2.1-discovery` into it.

The same plan expects Synthia-native MCP routes including:

- `POST /mcp/join`
- `POST /mcp/route`
- `GET /mcp/status`
- `GET /mcp/bodies`

This reinforces that MCP-aware server behavior belongs inside the Synthia server lineage.

## Swarm / agent instruction

Before modifying runtime or server architecture:

1. identify the current Synthia Server lineage
2. preserve its Node + Python dual-runtime behavior
3. preserve MCP/Trident integration
4. preserve branch/history provenance
5. add browser-safe bridges rather than removing server capabilities
6. treat any generic server as an adapter/helper unless explicitly promoted by the creator
7. never infer a Node ban from browser compatibility tests
8. never infer a Node ban from Pure Synthia's pure-JavaScript research constraint

## Acceptance wording

Use precise status language:

- **browser-safe** = browser entry graph contains only browser-compatible code
- **Node-backed** = Node runtime remains available behind the bridge
- **Python-backed** = Python runtime remains available behind the bridge
- **dual-runtime Synthia Server** = Node + Python server identity is preserved
- **MCP/Trident wired** = canonical MCP/Trident behavior is present and tested

Do not collapse these into "Node-free."

## Creator correction

The recurring removal or omission of Node from Synthia has been a repeated architecture failure.

Future work must preserve this canon:

**Synthia Server = Node + Python + MCP/Trident.**
