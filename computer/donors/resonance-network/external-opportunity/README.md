# Resonance Network External Opportunity Plane

This directory mounts the verified `Synthia-MCP-Opportunity-Consent` package
onto the Resonance Network. It is part of the app, not a second social network.

## Boundary

Internal Resonance Network matching happens first. Only an unresolved need is
allowed to cross this boundary. An external candidate may be:

- an organization/person/system reachable through a remote MCP server,
- a local MCP participant,
- or another authorized external resolver added later.

Being discovered over MCP does **not** make that candidate a Resonance Network
member. Membership/attachment occurs only after invitation and consent.

## Flow

`internal request -> no internal match -> MCP discovery -> reciprocal evaluation
-> one invitation -> external accept/decline -> collaboration consent -> optional
separate installation consent -> authorized provisioner -> outcome ledger`

The original Opportunity/Consent core remains in `core/` and its tests remain
unchanged. `vendor/synthia-toolbox-src/` contains the guarded MCP Toolbox source;
`vendor/synthia-toolbox-cjs/` is its compiled runtime form used by this service.

## Configure an external MCP business

Copy `config/mcp-servers.example.json` to `config/mcp-servers.json` and define a
server. Remote Streamable HTTP MCP is supported:

```json
{
  "servers": [{
    "id": "hotel-remote",
    "name": "Hotel Business MCP",
    "transport": "http",
    "url": "https://hotel.example.com/mcp",
    "headerEnv": { "Authorization": "HOTEL_MCP_AUTHORIZATION" },
    "discoveryTools": ["find_opportunities"],
    "invitationTool": "hotel-remote::receive_opportunity_invitation",
    "installationTool": "hotel-remote::offer_synthia_install"
  }]
}
```

Provider credentials stay in environment variables, not in the Resonance
Network database or opportunity ledger.

## Tool contract

Discovery tools should be read-only and return JSON containing `candidates`,
`opportunities`, `results`, or `matches`. Candidate records should provide
`availableCapabilities`; they may optionally provide their own
`invitationTool` and `installationTool`.

Invitation and installation tools are invoked only through the consent layer.
The external party receives a one-time response token with its invitation.
Installation approval is a separate consent from collaboration approval.

## Run

```bash
node service.mjs
```

Default bind: `127.0.0.1:8812`.

The FastAPI backend proxies `/api/opportunities/*` to this service and the
Resonance Market automatically escalates an unmatched internal request through
`POST /api/market/external/{request_id}`.

## Verification

```bash
npm test
```

This runs:

1. the original Opportunity/Consent core tests,
2. a real stdio MCP integration fixture,
3. a real Streamable HTTP MCP integration fixture.

The fixtures are tests only and are never returned as production opportunities.
