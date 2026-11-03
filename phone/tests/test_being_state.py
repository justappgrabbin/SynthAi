from human_design.being_state import Activation, ActivationEngine, BeingStateSpace, Coordinate, reaction_flux

def sample():
    return Coordinate(1,1,1,1,1,1,1,0,0,0,0,1,1)

def test_mixed_radix_roundtrip_and_traversal():
    space=BeingStateSpace(); c=sample()
    assert space.decode(space.encode(c))==c
    assert space.traverse(c,"gate",-1).gate==64
    assert len(space.axes)==13 and space.size()>1_000_000_000_000

def test_transit_completes_temporary_channel_and_activates_centers():
    state=ActivationEngine().evaluate([3],[Activation(60,"transit:saturn")])
    assert state.channels[0].code=="03-60"
    assert state.channels[0].temporary is True
    assert state.active_centers==("Root","Sacral")
    assert state.space_context["emerged"] is True
    assert reaction_flux(state)["edges"][0]["processing_analogue"]=="liquid-state"

def test_contact_completes_channel_and_preserves_both_sources():
    state=ActivationEngine().evaluate([17],contacts=[Activation(62,"contact:user-b")])
    channel=state.channels[0]
    assert channel.sources==("contact:user-b","natal")
    assert channel.processing_analogue=="restricted-boltzmann"

def test_natal_channel_is_stable_and_space_is_recursive():
    engine=ActivationEngine()
    first=engine.evaluate([4,63])
    second=engine.evaluate([4,63],previous_space_generation=first.space_generation)
    assert first.channels[0].temporary is False
    assert second.space_generation==2
