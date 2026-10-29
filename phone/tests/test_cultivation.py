from datetime import datetime, timedelta, timezone
import pytest
from human_design.cultivation import CultivationStore, CultivationConflict, chart_practice_options

ANCHOR={'configuration_id':'0123456789abcdef','tropical_sun':{'longitude':196.430742,'gate':57,'line':2,'color':3,'tone':3,'base':1}}

def test_profile_revisions_and_observations_preserve_original_records(tmp_path):
    store=CultivationStore(tmp_path/'cultivation.db')
    first=store.save_profile('person-a','same-birth',{'q5':'Creativity','q6':'Complete a song'},'explore',None)
    with pytest.raises(CultivationConflict):store.save_profile('person-a','same-birth',{'q5':'Rest'},'',None)
    second=store.save_profile('person-a','same-birth',{'q5':'Rest'},'remember',first['id'])
    assert second['parent_id']==first['id'] and second['answers']['q6']=='Complete a song'
    option=chart_practice_options(ANCHOR)[0]
    practice=store.start_practice('person-a','same-birth',option['id'],option['selected_prompt'],'Pause for two minutes','Notice a change in attention','No change in attention',(datetime.now(timezone.utc)+timedelta(days=1)).isoformat(),ANCHOR)
    observation=store.observe('person-a','same-birth',practice['id'],'Before work','Paused','No clear difference','contradicted')
    store.interpret('person-a','same-birth',observation['id'],'I may have been tired.')
    store.interpret('person-a','same-birth',observation['id'],'The practice may not help me in this setting.')
    state=CultivationStore(tmp_path/'cultivation.db').snapshot('person-a','same-birth')
    assert state['profile_revision_count']==2
    assert state['observations'][0]==observation
    assert len(state['interpretations'])==2
    assert state['practices'][0]['expected']=='Notice a change in attention'
    with pytest.raises(ValueError):store.observe('person-b','same-birth',practice['id'],'x','y','z','unclear')
    with pytest.raises(ValueError):store.interpret('person-b','same-birth',observation['id'],'Someone else changed this.')
    assert store.snapshot('person-b','same-birth')['profile'] is None

def test_prompt_selection_depends_on_chart_and_invalid_data_is_rejected(tmp_path):
    assert chart_practice_options(ANCHOR)==chart_practice_options(ANCHOR)
    store=CultivationStore(tmp_path/'cultivation.db')
    with pytest.raises(ValueError):store.save_profile('a','b',{'made_up':'Unknown'},'',None)
    with pytest.raises(ValueError):store.start_practice('a','b','reflection','Invented prompt','Act','Observe','Contradiction','2099-01-01T00:00:00+00:00',ANCHOR)
    with pytest.raises(ValueError):store.start_practice('a','b','reflection',chart_practice_options(ANCHOR)[0]['selected_prompt'],'Act','Observe','Contradiction','2000-01-01T00:00:00+00:00',ANCHOR)
