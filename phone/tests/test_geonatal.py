from __future__ import annotations

from fastapi.testclient import TestClient

from human_design.geonatal import calculate_geonatal
from human_design.web_api import HumanDesignWebStore, create_app


def test_four_distinct_charts_share_tropical_personality_sun_anchor() -> None:
    payload = calculate_geonatal(
        "1988-10-09T12:30:00.000Z",
        latitude=31.2304,
        longitude=121.4737,
    )

    assert len(payload["placements"]) == 104
    expected = {"tropical", "draconic_tropical_true", "draconic_tropical_mean", "sidereal_fagan_bradley"}
    assert set(payload["charts"]) == expected
    anchor = payload["charts"]["tropical"]["personalityTropicalSunAnchor"]
    sun_positions = []
    for frame, chart in payload["charts"].items():
        assert chart["frame"] == frame
        assert chart["personalityTropicalSunAnchor"] == anchor
        assert len(chart["personality"]) == len(chart["design"]) == 13
        sun_positions.append(next(row["longitude"] for row in chart["personality"] if row["planetary"] == "Sun"))
    assert len(set(sun_positions)) == 4
    assert "perspectives" not in payload
    assert payload["methods"]["draconic"].startswith("tropical longitude")


def test_geonatal_api_exposes_local_calculator() -> None:
    client = TestClient(create_app(HumanDesignWebStore()))
    response = client.post(
        "/api/geonatal",
        json={
            "timestamp": "1988-10-09T12:30:00.000Z",
            "latitude": 31.2304,
            "longitude": 121.4737,
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["houseMethod"] == "equal"
    assert {item["frame"] for item in payload["placements"]} == {
        "tropical",
        "sidereal_fagan_bradley",
        "draconic_tropical_true",
        "draconic_tropical_mean",
    }


def test_mean_draconic_preserves_angular_separations():
    payload = calculate_geonatal("2000-01-01T12:00:00Z", latitude=0, longitude=0)
    rows = {(p["planetary"], p["frame"]): p for p in payload["placements"] if p["orientation"] == "personality"}
    # Independent mean-node reference at J2000 UTC, expressed in the true equinox.
    for planet in ("Sun", "Moon", "Mars"):
        tropical = rows[(planet, "tropical")]["longitude"]
        mean = rows[(planet, "draconic_tropical_mean")]["longitude"]
        assert abs(((tropical - mean) % 360) - 125.0406460566) < 0.0001


def test_draconic_offsets_are_applied_to_positions_not_to_shared_anchor():
    payload = calculate_geonatal("1988-10-09T12:30:00Z", latitude=51.5074, longitude=-0.1278)
    charts=payload["charts"]
    sun=lambda frame: next(p["longitude"] for p in charts[frame]["personality"] if p["planetary"]=="Sun")
    tropical=sun("tropical")
    assert abs(((tropical-sun("draconic_tropical_true"))%360)-payload["trueNodeLongitude"])<1e-8
    assert abs(((tropical-sun("sidereal_fagan_bradley"))%360)-payload["faganBradleyAyanamsa"])<1e-8
    for frame in ["draconic_tropical_true","draconic_tropical_mean"]:
        node=next(p["longitude"] for p in charts[frame]["personality"] if p["planetary"]=="North Node")
        assert node==0
    assert len({sun(frame) for frame in charts})==4
    assert all(chart["personalityTropicalSunAnchor"]==tropical for chart in charts.values())


def test_frame_offsets_apply_to_angles_and_preserve_equal_house_relations():
    payload=calculate_geonatal("1988-10-09T12:30:00Z",latitude=51.5074,longitude=-.1278)
    tropical=payload["charts"]["tropical"]
    for chart in payload["charts"].values():
        offset=chart["personalityOffsetDegrees"]
        assert abs(((tropical["personalityAscendantLongitude"]-chart["personalityAscendantLongitude"])%360)-offset)<1e-8
        for planet in ["Sun","Moon","Mars"]:
            source=next(p for p in tropical["personality"] if p["planetary"]==planet)
            target=next(p for p in chart["personality"] if p["planetary"]==planet)
            assert abs(((source["longitude"]-target["longitude"])%360)-offset)<1e-8
            assert target["house"]==source["house"]


def test_every_placement_traces_back_to_actual_tropical_sun_wheel_position():
    payload=calculate_geonatal("1988-10-09T12:30:00Z",latitude=51.5074,longitude=-.1278)
    anchor=payload["charts"]["tropical"]["personalityTropicalSunAnchor"]
    for placement in payload["placements"]:
        assert placement["tropicalPersonalitySunAnchor"]==anchor
        relative=(placement["sourceTropicalLongitude"]-anchor)%360
        assert abs(relative-placement["anchorRelativeLongitude"])<1e-8
        expected=(anchor+relative-placement["frameOffsetDegrees"])%360
        assert abs(expected-placement["longitude"])<1e-8
