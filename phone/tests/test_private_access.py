from fastapi import Request
from fastapi.testclient import TestClient
import pytest
from human_design.network_identity import optional_network_identity
from human_design.private_access import COOKIE
from human_design.web_api import create_app, HumanDesignWebStore

BIRTH = dict(birth_date='1988-10-09', birth_time='12:30', timezone_name='UTC', latitude=51.5, longitude=-.12)

@pytest.fixture
def application(monkeypatch, tmp_path):
    monkeypatch.setenv('SYNTHIA_COGNITIVE_DB', str(tmp_path/'cognitive.sqlite3'))
    app = create_app(HumanDesignWebStore(tmp_path/'profiles.sqlite3'))
    def identity(request: Request):
        value = request.headers.get('test-account')
        return {'id':int(value),'name':'Test member'} if value else None
    app.dependency_overrides[optional_network_identity] = identity
    return app


def create(client):
    response=client.post('/api/charts',json=BIRTH)
    assert response.status_code==200,response.text
    return response.json()


def test_browser_cookie_protects_all_chart_surfaces(application):
    owner=TestClient(application); other=TestClient(application)
    master=create(owner); chart_id=master['chart_id']
    cookie=next(c for c in owner.cookies.jar if c.name==COOKIE)
    assert cookie.has_nonstandard_attr('HttpOnly')
    own_response=owner.get('/api/charts/'+chart_id)
    assert own_response.status_code==200
    assert own_response.headers['cache-control']=='no-store'
    assert 'Cookie' in own_response.headers['vary']
    assert owner.get('/api/charts').json()['charts'][0]['chart_id']==chart_id
    assert other.get('/api/charts').json()['charts']==[]
    for path in ['/api/charts/'+chart_id, '/api/charts/'+chart_id+'/bodygraph.svg', '/api/cultivation/'+chart_id, '/api/research/predictions?chart_id='+chart_id]:
        assert other.get(path).status_code==404,path
    for path,data in [('/api/chat',{'chart_id':chart_id,'question':'Explain my chart'}),('/api/reports',{'chart_id':chart_id,'report_type':'talent'}),('/api/cultivation/'+chart_id+'/profile',{'answers':{'q5':'Overwrite'},'story_path':'explore','expected_revision':None})]:
        assert other.post(path,json=data).status_code==404,path
    assert other.get('/api/charts/chart_unknown').status_code==404
    assert other.get('/api/charts/'+chart_id,headers={'X-User-Id':'1'}).status_code==404
    assert other.put('/api/resonance-network/profile',headers={'test-account':'2'},json={'chart_id':chart_id,'discoverable':True,'intents':['conversation'],'interests':[]}).status_code==404


def test_linking_transfers_browser_chart_to_account_and_survives_restart(application,tmp_path):
    browser=TestClient(application); master=create(browser); url='/api/charts/'+master['chart_id']
    assert browser.get(url,headers={'test-account':'1'}).status_code==200
    assert browser.get(url).status_code==404
    assert browser.get(url,headers={'test-account':'2'}).status_code==404
    other_device=TestClient(application,headers={'test-account':'1'})
    assert other_device.get('/api/charts').json()['charts'][0]['chart_id']==master['chart_id']
    assert other_device.get(url).status_code==200
    restarted=create_app(HumanDesignWebStore(tmp_path/'profiles.sqlite3'))
    restarted.dependency_overrides.update(application.dependency_overrides)
    assert TestClient(restarted).get(url,headers={'test-account':'1'}).status_code==200
    signed=TestClient(application,headers={'test-account':'3'})
    another=create(signed)
    assert signed.get('/api/charts/'+another['chart_id']).status_code==200
    signed.headers.pop('test-account')
    assert signed.get('/api/charts/'+another['chart_id']).status_code==404


def test_same_birth_configuration_does_not_share_private_predictions(application):
    a,b=TestClient(application),TestClient(application)
    first,second=create(a),create(b)
    assert first['birth_anchor']['configuration_id']==second['birth_anchor']['configuration_id']
    prediction=a.post('/api/research/predictions',json={'chart_id':first['chart_id'],'title':'Private expectation','criterion':'A recorded event','probability':.7,'baseline':.5,'deadline':'2099-01-01T00:00:00Z'})
    assert prediction.status_code==200,prediction.text
    assert len(a.get('/api/research/predictions',params={'chart_id':first['chart_id']}).json()['predictions'])==1
    assert b.get('/api/research/predictions',params={'chart_id':second['chart_id']}).json()['predictions']==[]
    response=b.post('/api/research/predictions/'+prediction.json()['id']+'/outcome',json={'chart_id':second['chart_id'],'observed':True})
    assert response.status_code==409 and 'different birth configuration' in response.text


def test_secure_cookie_over_https(application):
    client=TestClient(application,base_url='https://testserver')
    create(client)
    assert next(c for c in client.cookies.jar if c.name==COOKIE).secure
