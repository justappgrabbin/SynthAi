# Synthia 5.8 Automata Cartridge Loop

This is an additive execution layer around the protected Synthia 5.8 resident. It does not rewrite or replace the 5.8 source image.

## Canonical rule

A cartridge is an Automaton bundle.

Each cartridge declares:

- one capability it provides
- zero or more capability dependencies
- one or more ordered Automata
- the mesh execution target for each Automaton
- health policy, priority, version and provenance

The Computer host is the magazine. Synthia 5.8 can be an execution socket through its existing resident mesh operation `execute`.

## Loop

`capability request -> resolve dependencies -> select healthiest cartridge -> run Automata -> record health -> retain on success`

If an Automaton fails:

`failure -> mark health -> auto-dislodge cartridge -> preserve it in ledger -> reassemble -> feed next compatible cartridge`

Nothing is deleted by the failure loop. Sidelined cartridges remain inspectable and can be restored.

## Native API

- `GET /automata-cartridges`
- `POST /automata-cartridges/install`
- `POST /automata-cartridges/assemble`
- `POST /automata-cartridges/execute`
- `POST /automata-cartridges/dislodge`
- `POST /automata-cartridges/restore`
- `POST /automata-cartridges/retire`

## Example Prime 5.8 cartridge

```json
{
  "id": "prime-python-cell",
  "version": "1",
  "capability": "artifact.solve",
  "priority": 100,
  "automata": [
    {
      "id": "prime-python-cell:automaton",
      "runner": {
        "kind": "mesh",
        "target": "synthia-prime",
        "operation": "execute",
        "payload": { "runtime": "python" }
      }
    }
  ]
}
```

The manifest contains no executable function. Execution remains on the user's own app/runtime surface through the existing mesh.
