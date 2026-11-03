from fastapi.testclient import TestClient
from human_design.web_api import create_app, HumanDesignWebStore

def test_one_birth_chart_drives_frames_and_human_design(monkeypatch,tmp_path):
    monkeypatch.setenv('SYNTHIA_COGNITIVE_DB',str(tmp_path/'cognitive.db'))
    client=TestClient(create_app(HumanDesignWebStore()))
    birth={'birth_date':'1988-10-09','birth_time':'12:30','timezone_name':'UTC','city':'London','latitude':51.5074,'longitude':-.1278}
    a=client.post('/api/charts',json=birth)
    assert a.status_code==200,a.text
    data=a.json(); anchor=data['birth_anchor']
    sun=next(x for x in data['geonatal']['placements'] if x['planetary']=='Sun' and x['orientation']=='personality' and x['frame']=='tropical')
    assert anchor['tropical_sun']['longitude']==sun['longitude']
    assert anchor['location']=={'latitude':51.5074,'longitude':-.1278}
    hd_sun=next(x for x in data['chart']['personality']['activations'] if x['planet_code']=='sun')
    assert hd_sun['gate']==sun['gate'] and abs(hd_sun['longitude']-sun['longitude'])<1e-6
    b=client.post('/api/charts',json=birth).json()
    assert b['birth_anchor']['configuration_id']==anchor['configuration_id']
    assert client.get('/api/charts/'+data['chart_id']).json()['birth_anchor']==anchor

def test_timezone_without_place_cannot_create_master_chart(monkeypatch,tmp_path):
    monkeypatch.setenv('SYNTHIA_COGNITIVE_DB',str(tmp_path/'cognitive.db'))
    client=TestClient(create_app(HumanDesignWebStore()))
    result=client.post('/api/charts',json={'birth_date':'1988-10-09','birth_time':'12:30','timezone_name':'UTC'})
    assert result.status_code==422 and 'latitude' in result.text

def test_birth_configuration_survives_store_restart(monkeypatch,tmp_path):
    monkeypatch.setenv('SYNTHIA_COGNITIVE_DB',str(tmp_path/'cognitive.db'))
    path=tmp_path/'profiles.db'
    client=TestClient(create_app(HumanDesignWebStore(path)))
    data=client.post('/api/charts',json={'birth_date':'1988-10-09','birth_time':'12:30','timezone_name':'UTC','latitude':51.5,'longitude':-.12}).json()
    restarted=TestClient(create_app(HumanDesignWebStore(path)))
    restarted.cookies.update(client.cookies)
    result=restarted.get('/api/charts/'+data['chart_id'])
    assert result.status_code==200,result.text
    assert result.json()['birth_anchor']==data['birth_anchor']
    assert result.json()['bodygraph_svg']==data['bodygraph_svg']
