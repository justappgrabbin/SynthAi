from fastapi.testclient import TestClient

from human_design.web_api import HumanDesignWebStore, create_app


def test_validated_learning_correction_trace_and_rollback(tmp_path, monkeypatch):
    monkeypatch.setenv("SYNTHIA_COGNITIVE_DB", str(tmp_path / "shared.sqlite3"))
    client = TestClient(create_app(HumanDesignWebStore()))
    learned = client.post("/api/learning/ingest", json={
        "source_id": "black-book", "page": 9, "text": "Movement is Energy."
    })
    assert learned.status_code == 200
    payload = learned.json()
    assert payload["relations"][0]["validation_status"] == "approved"

    claims = client.post("/api/learning/claims", json={"topic": "Movement"}).json()["claims"]
    assert claims[0]["trace"][0]["page"] == 9
    assert claims[0]["trace"][0]["checksum"]

    corrected = client.post(
        f"/api/learning/normalizations/{payload['normalization_id']}/correct",
        json={"corrected_text": "Movement is Location."},
    )
    assert corrected.status_code == 200
    correction_id = corrected.json()["correction_id"]
    assert corrected.json()["status"]["approved_relations"] >= 1

    rolled_back = client.post(f"/api/learning/corrections/{correction_id}/rollback")
    assert rolled_back.status_code == 200
    assert rolled_back.json()["rolled_back"] is True


def test_validated_learning_survives_app_restart(tmp_path, monkeypatch):
    database = tmp_path / "shared.sqlite3"
    monkeypatch.setenv("SYNTHIA_COGNITIVE_DB", str(database))
    first = TestClient(create_app(HumanDesignWebStore()))
    first.post("/api/learning/ingest", json={
        "source_id": "book", "page": 1, "text": "Being is Matter."
    })
    second = TestClient(create_app(HumanDesignWebStore()))
    assert second.get("/api/learning/status").json()["source_observations"] == 1
