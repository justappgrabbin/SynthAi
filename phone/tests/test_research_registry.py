from datetime import datetime, timedelta, timezone
import pytest
from human_design.research_registry import ResearchRegistry

def test_forecasts_are_locked_then_scored(tmp_path):
    registry=ResearchRegistry(tmp_path/'test.db')
    now=datetime.now(timezone.utc)
    row=registry.lock('Practice','Three completed sessions',.8,.5,(now+timedelta(days=1)).isoformat(),now=now)
    with pytest.raises(ValueError): registry.resolve(row['id'],1,now=now)
    registry.resolve(row['id'],1,now=now+timedelta(days=2))
    with pytest.raises(ValueError): registry.resolve(row['id'],0,now=now+timedelta(days=3))
    saved=registry.list()[0]
    assert saved['prediction_hash']==row['prediction_hash'] and saved['integrity_ok']
    assert saved['brier']==pytest.approx(.04) and saved['baseline_brier']==.25

def test_rejects_retrospective_and_ambiguous_forecasts(tmp_path):
    registry=ResearchRegistry(tmp_path/'test.db')
    with pytest.raises(ValueError): registry.lock('x','y',.5,.5,'2000-01-01T00:00:00+00:00')
    with pytest.raises(ValueError): registry.lock('x','y',.5,.5,'2099-01-01T00:00:00')
