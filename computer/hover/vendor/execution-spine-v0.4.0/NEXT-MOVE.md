# Next move after v0.1.0

The spine is now coherent and executable. The next integration should be done in this order:

1. Plug the existing Synthia artifact recognizer into a named capability.
2. Emit a serializable `Specification` instead of directly choosing execution code.
3. Map the existing 64 transition primitives into state-machine transition definitions.
4. Register current JS tools as capabilities/effects rather than giving arbitrary code direct state mutation.
5. Add a QuickJS host adapter on the actual phone/Godot/Android host.
6. Port mature DAGEngine retry/checkpoint policy behind the new DAG interface where needed.
7. Add generated-realization verification: run reference and generated implementations over bounded witness sets and reject semantic mismatches.
8. Only then connect persistence/Supabase as an effect, keeping local snapshot/append-only history as the source of resumability.
