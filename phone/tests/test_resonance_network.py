import json
import pytest
from fastapi.testclient import TestClient
from human_design.web_api import create_app, HumanDesignWebStore
from human_design.network_identity import network_identity
from human_design.resonance_network import ResonanceNetwork, NetworkConflict

@pytest.fixture
def masters(monkeypatch,tmp_path):
    monkeypatch.setenv('SYNTHIA_COGNITIVE_DB',str(tmp_path/'cognitive.db'))
    client=TestClient(create_app(HumanDesignWebStore()))
    charts=[]
    for date in ['1988-10-09','1991-02-16']:
        result=client.post('/api/charts',json={'birth_date':date,'birth_time':'12:30','timezone_name':'UTC','latitude':51.5,'longitude':-.12})
        assert result.status_code==200,result.text
        charts.append(result.json())
    return charts


def test_opt_in_matching_uses_supplied_engines_without_birth_detail_leakage(tmp_path,masters):
    network=ResonanceNetwork(tmp_path/'network.db')
    network.publish({'id':1,'name':'A'},masters[0],True,['conversation'],['music'])
    network.publish({'id':2,'name':'B'},masters[1],False,['conversation'],['music'])
    assert network.matches(1)==[]
    network.publish({'id':2,'name':'B'},masters[1],True,['conversation'],['music'])
    matches=network.matches(1)
    assert len(matches)==1 and matches[0]['member_id']==2 and matches[0]['can_invite']
    assert 0<=matches[0]['true_node']['overall']<=1
    assert 0<=matches[0]['mean_node']['overall']<=1
    assert len(matches[0]['true_node']['fields'])==9
    assert matches[0]['shared_interests']==['music']
    text=json.dumps(matches)
    for private in ['birth_date','birth_time','latitude','longitude','configuration_id','chart_id','token']:
        assert private not in text
    with pytest.raises(NetworkConflict):network.publish({'id':3,'name':'C'},masters[0],True,['conversation'],[])


def test_single_invitation_recipient_consent_and_disconnect_survive_restart(tmp_path,masters):
    network=ResonanceNetwork(tmp_path/'network.db')
    for user,master in zip([{'id':1,'name':'A'},{'id':2,'name':'B'}],masters):network.publish(user,master,True,['conversation'],[])
    invitation=network.invite(1,2)
    assert invitation['status']=='pending'
    with pytest.raises(NetworkConflict):network.invite(1,2)
    with pytest.raises(NetworkConflict):network.invite(2,1)
    with pytest.raises(NetworkConflict):network.respond(1,invitation['id'],'accepted')
    with pytest.raises(ValueError):network.respond(3,invitation['id'],'accepted')
    network.respond(2,invitation['id'],'accepted')
    with network.connect() as db:
        row=db.execute('SELECT consent_json,ledger_json FROM resonance_opportunities').fetchone()
        consent=json.loads(row['consent_json']); ledger=json.loads(row['ledger_json'])
    assert consent['record']['subjectId']=='2'
    assert consent['record']['kind']=='collaboration'
    assert 'local_runtime' not in consent['record']['scope']
    assert consent['verification']['valid']
    assert any(e['type']=='invitation.accepted' for e in ledger)
    network=ResonanceNetwork(tmp_path/'network.db')
    assert network.invitations(1)[0]['status']=='accepted'
    network.respond(1,invitation['id'],'revoked')
    assert network.invitations(2)[0]['status']=='revoked'
    assert not network.matches(1)[0]['can_invite']
    with pytest.raises(NetworkConflict):network.invite(1,2)


def test_withdrawal_removes_discovery_and_expires_pending_invites(tmp_path,masters):
    network=ResonanceNetwork(tmp_path/'network.db')
    for user,master in zip([{'id':1,'name':'A'},{'id':2,'name':'B'}],masters):network.publish(user,master,True,['research'],[])
    invitation=network.invite(1,2)
    network.publish({'id':2,'name':'B'},masters[1],False,['research'],[])
    assert network.matches(1)==[]
    assert network.invitations(1)[0]['status']=='expired'
    with pytest.raises(NetworkConflict):network.respond(2,invitation['id'],'accepted')
    with network.connect() as db:assert db.execute('SELECT model_profile FROM resonance_profiles WHERE user_id=2').fetchone()[0] is None


def test_signed_in_identity_controls_network_routes(monkeypatch,tmp_path):
    monkeypatch.setenv('SYNTHIA_COGNITIVE_DB',str(tmp_path/'cognitive.db'))
    app=create_app(HumanDesignWebStore())
    current={'id':1,'name':'A'}
    app.dependency_overrides[network_identity]=lambda:current
    client=TestClient(app)
    chart=client.post('/api/charts',json={'birth_date':'1988-10-09','birth_time':'12:30','timezone_name':'UTC','latitude':51.5,'longitude':-.12}).json()
    result=client.put('/api/resonance-network/profile',json={'chart_id':chart['chart_id'],'discoverable':True,'intents':['conversation'],'interests':[]})
    assert result.status_code==200,result.text
    current={'id':2,'name':'B'}
    assert client.get('/api/resonance-network/profile').json()['profile']['discoverable'] is False
    result=client.put('/api/resonance-network/profile',json={'chart_id':chart['chart_id'],'discoverable':True,'intents':['conversation'],'interests':[]})
    assert result.status_code==409
