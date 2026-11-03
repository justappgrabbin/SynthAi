from human_design.language_contact import Autoling, Diseminer, SemanticGraph


def test_graph_preserves_provenance_and_updates_relation() -> None:
    graph = SemanticGraph()
    first = graph.upsert_node("movement")
    second = graph.upsert_node("energy")
    edge = graph.observe_edge(
        first.node_id, "is", second.node_id, source_ref="image-1", strength=0.8
    )
    updated = graph.observe_edge(
        first.node_id, "is", second.node_id, source_ref="image-4", strength=1.0
    )
    assert edge.edge_id == updated.edge_id
    assert updated.observations == 2
    assert updated.weight == 0.9
    assert updated.provenance == ("image-1", "image-4")


def test_diseminer_learns_sparse_relations_and_transitive_paths() -> None:
    graph = SemanticGraph()
    result = Diseminer(graph).learn(
        "movement is energy",
        source_ref="klein-test",
        dimension_weights={"where": 1.0},
    )
    assert result.tokens == ("movement", "is", "energy")
    assert len(result.learned_edges) == 2
    assert result.node_ids in Diseminer(graph).paths(result.node_ids[0], max_depth=3)
    assert graph.get_node(result.node_ids[0]).features == {"where": 1.0}


def test_autoling_follows_active_evidence_and_rotates_prior_question() -> None:
    autoling = Autoling()
    first = autoling.suggest(
        proportions={"Movement": 0.7, "Evolution": 0.3},
        expressions={"where": "I define"},
    )
    assert first.question == "where"
    assert first.dimension == "Movement"
    assert first.status == "suggestive"
    next_probe = autoling.suggest(
        proportions={"Movement": 0.4, "Evolution": 0.4, "Space": 0.2},
        prior_questions=["where"],
    )
    assert next_probe.question == "what"


def test_graph_can_persist_locally(tmp_path) -> None:
    path = tmp_path / "semantic.sqlite3"
    graph = SemanticGraph(path)
    node = graph.upsert_node("being", features={"when": 1})
    graph.connection.close()
    reopened = SemanticGraph(path)
    assert reopened.get_node(node.node_id).label == "being"
