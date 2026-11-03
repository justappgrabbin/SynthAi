from fastapi.testclient import TestClient
from human_design.web_api import create_app, HumanDesignWebStore
from human_design.local_model import LocalModelClient

def test_system_questions_use_documented_capabilities(monkeypatch, tmp_path):
    monkeypatch.setenv('SYNTHIA_COGNITIVE_DB', str(tmp_path/'cognitive.db'))
    def answer(self, messages):
        assert 'Answer in English' in messages[0]['content']
        assert 'Datababy' in messages[1]['content']
        assert 'simulation' in messages[1]['content']
        return 'The game collects reflection fragments.'
    monkeypatch.setattr(LocalModelClient,'chat',answer)
    client=TestClient(create_app(HumanDesignWebStore()))
    result=client.post('/api/system/ask',json={'question':'What does the game do?'})
    assert result.status_code == 200
    assert result.json()['answer']=='The game collects reflection fragments.'

def test_missing_ollama_model_is_explicit(monkeypatch,tmp_path):
    monkeypatch.setenv('SYNTHIA_COGNITIVE_DB',str(tmp_path/'cognitive.db'))
    monkeypatch.setenv('SYNTHIA_MODEL_RUNTIME','ollama')
    monkeypatch.delenv('SYNTHIA_MODEL',raising=False)
    client=TestClient(create_app(HumanDesignWebStore()))
    result=client.post('/api/system/ask',json={'question':'Explain perspectives'})
    assert result.status_code==503 and 'installed Ollama' in result.json()['detail']
