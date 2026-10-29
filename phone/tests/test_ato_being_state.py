from __future__ import annotations

import math

import pytest

from human_design.ato_being_state import (
    CORNER_HOUSES,
    LEARNABLE_HOUSES,
    LAYER_BODY,
    LAYER_HEART,
    LAYER_MIND,
    LAYER_SYNTHESIS,
    ato_xnor,
    build_generative_being_state,
    circular_distance,
    complete_analogy,
    fuxi_code_to_value,
    longitude_to_fuxi_value,
    value_to_fuxi_code,
)


CORNERS = {1: 10.0, 4: 100.0, 7: 190.0, 10: 280.0}


def test_fuxi_binary_space_is_complete_unique_and_not_king_wen_indexed():
    codes = [value_to_fuxi_code(value) for value in range(64)]
    assert len(set(codes)) == 64
    assert codes[0] == "000000"
    assert codes[-1] == "111111"
    assert [fuxi_code_to_value(code) for code in codes] == list(range(64))


def test_longitudes_cover_all_64_fuxi_states():
    values = [
        longitude_to_fuxi_value(index * (360.0 / 64) + 1e-9)
        for index in range(64)
    ]
    assert values == list(range(64))


def test_ato_is_closed_commutative_and_completes_four_corner_analogy():
    for a in range(64):
        assert ato_xnor(a, a) == 63
        for b in range(64):
            assert ato_xnor(a, b) == ato_xnor(b, a)
            assert 0 <= ato_xnor(a, b) < 64

    a, b, c = 0b101001, 0b011010, 0b110100
    d = complete_analogy(a, b, c)
    assert ato_xnor(a, b) == ato_xnor(c, d)


def test_three_chart_frames_and_twelve_placements_are_assembled():
    state = build_generative_being_state(
        tropical_corners=CORNERS,
        fagan_bradley_ayanamsa=24.0,
        true_node_longitude=80.0,
    )
    assert len(state.body.placements) == 12
    assert len(state.mind.placements) == 12
    assert len(state.heart.placements) == 12
    assert len(state.synthesis) == 12
    assert {placement.layer for placement in state.synthesis} == {LAYER_SYNTHESIS}
    assert state.metadata["king_wen_computational_index"] is False

    assert state.body.by_house(1).longitude == pytest.approx(10.0)
    assert state.mind.by_house(1).longitude == pytest.approx(346.0)
    assert state.heart.by_house(1).longitude == pytest.approx(290.0)
    assert state.mind.frame == "sidereal-fagan-bradley"
    assert state.heart.frame == "draconic-tropical-true-node"


def test_four_observed_corners_prepare_exactly_eight_learnable_slots_per_layer():
    state = build_generative_being_state(
        tropical_corners=CORNERS,
        fagan_bradley_ayanamsa=24.0,
        true_node_longitude=80.0,
    )
    for layer in (state.body, state.mind, state.heart):
        observed = {item.house for item in layer.placements if item.status == "observed"}
        inferred = {item.house for item in layer.placements if item.status == "inferred"}
        assert observed == set(CORNER_HOUSES)
        assert inferred == set(LEARNABLE_HOUSES)
        assert all(item.parents for item in layer.placements if item.status == "inferred")

    assert len(state.learning_examples) == 3 * len(LEARNABLE_HOUSES)
    assert all(example.target_longitude is None for example in state.learning_examples)


def test_interpolation_baseline_respects_circular_anchor_segments():
    state = build_generative_being_state(
        tropical_corners=CORNERS,
        fagan_bradley_ayanamsa=24.0,
        true_node_longitude=80.0,
    )
    assert state.body.by_house(2).longitude == pytest.approx(40.0)
    assert state.body.by_house(3).longitude == pytest.approx(70.0)
    assert state.body.by_house(11).longitude == pytest.approx(310.0)
    assert state.body.by_house(12).longitude == pytest.approx(340.0)


def test_observed_nonangular_cusps_create_training_targets_without_leakage():
    observed = {
        2: 42.0,
        3: 71.0,
        5: 132.0,
        6: 161.0,
        8: 222.0,
        9: 251.0,
        11: 312.0,
        12: 341.0,
    }
    state = build_generative_being_state(
        tropical_corners=CORNERS,
        fagan_bradley_ayanamsa=24.0,
        true_node_longitude=80.0,
        observed_houses=observed,
    )
    body_house_2 = next(
        item
        for item in state.learning_examples
        if item.layer == LAYER_BODY and item.target_house == 2
    )
    mind_house_2 = next(
        item
        for item in state.learning_examples
        if item.layer == LAYER_MIND and item.target_house == 2
    )
    heart_house_2 = next(
        item
        for item in state.learning_examples
        if item.layer == LAYER_HEART and item.target_house == 2
    )
    assert body_house_2.baseline_longitude == pytest.approx(40.0)
    assert body_house_2.target_longitude == pytest.approx(42.0)
    assert body_house_2.residual_degrees == pytest.approx(2.0)
    assert mind_house_2.target_longitude == pytest.approx(18.0)
    assert heart_house_2.target_longitude == pytest.approx(322.0)
    assert state.body.by_house(2).longitude == pytest.approx(40.0)


def test_predictor_can_refine_a_slot_and_keeps_provenance():
    def predictor(layer, house, previous, following, fraction, baseline):
        del previous, following, fraction
        if layer == LAYER_MIND and house == 2:
            return baseline + 1.25, 0.87, "trained-cusp-model-v1"
        return None

    state = build_generative_being_state(
        tropical_corners=CORNERS,
        fagan_bradley_ayanamsa=24.0,
        true_node_longitude=80.0,
        predictor=predictor,
    )
    placement = state.mind.by_house(2)
    assert placement.longitude == pytest.approx(17.25)
    assert placement.confidence == pytest.approx(0.87)
    assert placement.method == "trained-cusp-model-v1"
    assert placement.parents == (1, 4)


def test_synthesis_is_deterministic_and_preserves_ato_state():
    kwargs = dict(
        tropical_corners=CORNERS,
        fagan_bradley_ayanamsa=24.0,
        true_node_longitude=80.0,
    )
    first = build_generative_being_state(**kwargs)
    second = build_generative_being_state(**kwargs)
    assert first.synthesis == second.synthesis
    for house in range(1, 13):
        body = first.body.by_house(house).state.value
        mind = first.mind.by_house(house).state.value
        heart = first.heart.by_house(house).state.value
        generated = first.synthesis[house - 1].state.value
        assert generated == complete_analogy(body, mind, heart)


def test_input_validation_rejects_incomplete_or_noncyclic_corners():
    with pytest.raises(ValueError, match="corners must be houses"):
        build_generative_being_state(
            tropical_corners={1: 10.0, 4: 100.0, 7: 190.0},
            fagan_bradley_ayanamsa=24.0,
            true_node_longitude=80.0,
        )
    with pytest.raises(ValueError, match="advance around"):
        build_generative_being_state(
            tropical_corners={1: 10.0, 4: 10.0, 7: 190.0, 10: 280.0},
            fagan_bradley_ayanamsa=24.0,
            true_node_longitude=80.0,
        )


def test_frame_offsets_preserve_angular_separation():
    state = build_generative_being_state(
        tropical_corners=CORNERS,
        fagan_bradley_ayanamsa=24.0,
        true_node_longitude=80.0,
    )
    for house in range(1, 13):
        assert circular_distance(
            state.body.by_house(house).longitude,
            state.mind.by_house(house).longitude,
        ) == pytest.approx(24.0)
        assert math.isclose(
            circular_distance(
                state.body.by_house(house).longitude,
                state.heart.by_house(house).longitude,
            ),
            80.0,
        )
