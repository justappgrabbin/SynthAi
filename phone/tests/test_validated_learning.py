from __future__ import annotations

import sqlite3

import pytest

from human_design.validated_learning import ValidatedLearningStore


def test_evidence_is_immutable_and_ocr_precedes_extraction(tmp_path) -> None:
    store = ValidatedLearningStore(tmp_path / "v2.sqlite3")
    observation = store.ingest("book", 9, "Movement  is Energy. Music is !DUSic.")
    normalization = store.normalize(observation)
    row = store.connection.execute(
        "SELECT * FROM normalizations WHERE normalization_id=?", (normalization,)
    ).fetchone()
    assert row["normalized_text"] == "Movement is Energy. Music is music."
    assert "!DUSic" not in row["normalized_text"]
    with pytest.raises(sqlite3.IntegrityError):
        store.connection.execute(
            "UPDATE source_observations SET original_text='changed' WHERE observation_id=?",
            (observation,),
        )


def test_quarantine_trace_correction_restart_and_rollback(tmp_path) -> None:
    database = tmp_path / "v2.sqlite3"
    store = ValidatedLearningStore(database)
    observation = store.ingest("book", 9, "Movement is Energy.")
    normalization = store.normalize(observation)
    relations = store.extract_and_validate(normalization)
    assert relations
    assert store.connection.execute(
        "SELECT validation_status FROM relations WHERE relation_id=?", (relations[0],)
    ).fetchone()[0] == "approved"
    claims = store.write_claims("Movement")
    trace = store.trace_claim(claims[0])
    assert trace[0]["source_id"] == "book"
    assert trace[0]["page"] == 9
    assert trace[0]["checksum"]

    correction = store.correct_normalization(normalization, "Movement is Location.")
    assert store.connection.execute(
        "SELECT active FROM claims WHERE claim_id=?", (claims[0],)
    ).fetchone()[0] == 0
    new_normalization = store.connection.execute(
        "SELECT normalization_id FROM normalizations WHERE supersedes=?", (normalization,)
    ).fetchone()[0]
    assert store.connection.execute(
        "SELECT COUNT(*) FROM relations WHERE normalization_id=?", (new_normalization,)
    ).fetchone()[0] > 0

    restarted = ValidatedLearningStore(database)
    assert restarted.connection.execute("SELECT COUNT(*) FROM source_observations").fetchone()[0] == 1
    assert restarted.connection.execute(
        "SELECT normalized_text FROM normalizations WHERE normalization_id=?", (new_normalization,)
    ).fetchone()[0] == "Movement is Location."

    restarted.rollback(correction)
    assert restarted.connection.execute(
        "SELECT active FROM claims WHERE claim_id=?", (claims[0],)
    ).fetchone()[0] == 1


def test_malformed_relation_is_quarantined(tmp_path) -> None:
    store = ValidatedLearningStore(tmp_path / "v2.sqlite3")
    observation = store.ingest("book", 4, "l1IOuld is a corrupted token.")
    normalization = store.normalize(observation)
    relations = store.extract_and_validate(normalization)
    assert relations
    assert store.connection.execute(
        "SELECT validation_status FROM relations WHERE relation_id=?", (relations[0],)
    ).fetchone()[0] == "approved"  # repaired before extraction
    assert "l1IOuld" not in store.connection.execute(
        "SELECT subject FROM relations WHERE relation_id=?", (relations[0],)
    ).fetchone()[0]
