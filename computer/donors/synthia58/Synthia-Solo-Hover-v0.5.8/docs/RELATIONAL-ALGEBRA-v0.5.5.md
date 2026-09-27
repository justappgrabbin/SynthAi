# Relational Algebra — v0.5.5

## Runtime purpose

The relationship layer does not overwrite either participant. Two resolved endpoint states create a third landed state:

`A + B → R(A,B)`

Each Gate contributes its ordered six-bit topology. The engine evaluates the complete Boolean function set over each corresponding bit position.

## Operator alphabet

| ID | Operator | Expression |
|---:|---|---|
| 0 | FALSE | `0` |
| 1 | AND | `A & B` |
| 2 | A_AND_NOT_B | `A & !B` |
| 3 | A | `A` |
| 4 | NOT_A_AND_B | `!A & B` |
| 5 | B | `B` |
| 6 | XOR | `A ^ B` |
| 7 | OR | `A | B` |
| 8 | NOR | `!(A | B)` |
| 9 | XNOR | `A === B` |
| 10 | NOT_B | `!B` |
| 11 | A_OR_NOT_B | `A | !B` |
| 12 | NOT_A | `!A` |
| 13 | NOT_A_OR_B | `!A | B` |
| 14 | NAND | `!(A & B)` |
| 15 | TRUE | `1` |

Truth tables are stored in input order `00, 01, 10, 11`.

## Canonical channels

A known canonical Gate pair records a channel condition using operator 1, AND, at the endpoint-presence layer. The same relationship also keeps the bitwise six-position AND result. This keeps “both endpoints are present” distinct from “every bit in the two Gate vectors is simultaneously 1.”

## Klein interface

The relationship exposes:

- `relation`: the deterministic 16-operator signature.
- `intensity`: `null` until an executable intensity rule exists.
- `direction`: asymmetric operator structures are preserved, especially `A & !B` and `!A & B`; they are not collapsed into an invented scalar.

## Perception

The third state carries machine-native relational projections for:

- Color: juxtaposed endpoint Color conditions.
- Sound: juxtaposed endpoint Tone conditions.
- Form: juxtaposed endpoint Base conditions.

The runtime does not invent a literal color value, frequency, or polygon when the source state supplies only a position/condition.

## Neural bridge

The relationship neural vector is 121 structural values:

- 6 left Gate bits
- 6 right Gate bits
- 96 operator-result bits, 16 × 6
- 6 left Line one-hot values
- 6 right Line one-hot values
- 1 canonical-channel-presence bit

The vector is sent to the existing connection field, generative channel field, Human Design GNN, and the existing channel neural composition when the Gate pair is canonical.

## Provenance and mutation test

`SemanticGenome.relate()` now accepts `leftAddress` and `rightAddress` overrides. This allows one endpoint to change at a deep coordinate without silently changing the other. The relationship ID and relational perceptual state then change, while the previous `R(A,B)` remains in append-only relationship history.
