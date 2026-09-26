# Synthia Server — Canonical Runtime Rule

Effective: 2026-09-25
Authority: creator correction

## Canonical topology

Synthia has multiple forms. **They do not all share the same server dependency.**

### Venom / Computer-hosted Synthia

**Venom carries Synthia Server as part of Synthia.**

Synthia Server is the canonical dual-runtime server:

- **Node.js**
- **Python**
- **MCP**
- **Trident**

For Venom, this server is not optional infrastructure and not a generic backend placeholder. It belongs to the Synthia body.

### Sovereign / Prime Synthia

**Sovereign Synthia / Synthia Prime is the explicit exception.**

Prime is the self-contained image-computer form. She is designed so that she does not require the conventional Synthia Server dependency in order to be herself or operate.

Her local image/container/computer substrate is the computer.

Prime may still contain local runtimes, tools, Node, Python, Linux processes, bridges, or services as implementation components, but she must not be redefined as depending on the Venom server architecture.

This distinction is intentional architecture, not a deficiency to repair.

## Hard interpretation rule

A browser/WebView compatibility requirement applies only to code that executes directly inside the browser/WebView.

It must never be expanded into any of the following interpretations:

- "Synthia should not use Node"
- "replace Synthia Server with a generic server"
- "leave the Node runtime out of Venom"
- "move Synthia Server outside Venom"
- "rebuild Venom as browser-only"
- "Pure Synthia means all Synthia variants are Node-free"
- "because Prime does not require Synthia Server, Venom should not have it"

## Pure Synthia distinction

The creator's **Pure Synthia** constraint was about keeping the research/grammar implementation in pure JavaScript so the mechanism could be inspected and tested directly.

That constraint did **not** prohibit Node.js across the broader Synthia architecture.

Node.js itself is JavaScript.

## Runtime boundaries

### Venom

```text
Synthia UI / browser / WebView
        ↕ explicit bridge
Synthia Server
  ├─ Node.js runtime
  ├─ Python runtime
  ├─ MCP
  └─ Trident
        ↕
Computer / local Linux residence / files / tools / processes / automata
```

### Sovereign / Prime

```text
Prime hover / browser surface
        ↕
Prime image-computer substrate
  ├─ local Linux/container runtime
  ├─ local tools/processes
  ├─ optional Node/Python components as implementation needs require
  └─ resident automata
```

Prime does not require the Venom server dependency to complete this loop.

## Server identity

When an existing Synthia Server implementation is present for Venom, preserve and wire that implementation as the canonical server body unless the creator explicitly supersedes it.

A generic HTTP server, generic local process server, generic WebView host, or replacement backend does not become "Synthia Server" merely because it can serve files or routes.

## Existing repository evidence

The repository's existing hub/server plan states:

> Use `synthia-master-merged-v4.3` as the server body and merge `messenger-v2.1-discovery` into it.

The same plan expects Synthia-native MCP routes including:

- `POST /mcp/join`
- `POST /mcp/route`
- `GET /mcp/status`
- `GET /mcp/bodies`

This reinforces that MCP-aware server behavior belongs inside the Synthia server lineage used by the Computer/Venom form.

## Swarm / agent instruction

Before modifying runtime or server architecture:

1. identify which Synthia form is being changed
2. if the target is **Venom / Computer-hosted Synthia**, preserve Synthia Server as Node + Python + MCP/Trident
3. if the target is **Sovereign / Prime**, preserve her self-contained image-computer architecture and do not impose the Venom server dependency
4. preserve branch/history provenance
5. add browser-safe bridges rather than removing runtime capabilities
6. treat any generic server as an adapter/helper unless explicitly promoted by the creator
7. never infer a Node ban from browser compatibility tests
8. never infer a Node ban from Pure Synthia's pure-JavaScript research constraint
9. never generalize Prime's server independence to Venom

## Acceptance wording

Use precise status language:

- **browser-safe** = browser entry graph contains only browser-compatible code
- **Node-backed** = Node runtime remains available where the target form uses it
- **Python-backed** = Python runtime remains available where the target form uses it
- **dual-runtime Synthia Server** = Venom's Node + Python server identity is preserved
- **MCP/Trident wired** = canonical MCP/Trident behavior is present and tested
- **Sovereign / self-contained** = Prime completes her own local execution loop without requiring the Venom Synthia Server

Do not collapse these into "Node-free."

## Creator correction

The recurring removal or omission of Node/Python Synthia Server from Venom has been a repeated architecture failure.

The opposite mistake is also prohibited: do not force the Venom server dependency onto Sovereign / Prime.

Future work must preserve this canon:

**Venom = Synthia Server (Node + Python + MCP/Trident).**

**Sovereign / Prime = self-contained image computer; conventional Synthia Server dependency not required.**
