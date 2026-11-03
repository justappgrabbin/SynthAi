import pytest
from human_design.local_model import LocalModelClient
from human_design.providers import ProviderConfigurationError, ProviderResponseError

def test_ollama_protocol(monkeypatch):
    monkeypatch.setenv("SYNTHIA_MODEL_RUNTIME", "ollama")
    monkeypatch.setenv("SYNTHIA_MODEL", "test-model")
    def transport(url, headers, payload, timeout):
        assert url.endswith("/api/chat")
        assert payload["model"] == "test-model" and payload["stream"] is False
        return {"message": {"content": "A measured reflective practice."}}
    assert LocalModelClient(transport).chat([]) == "A measured reflective practice."

def test_llamafile_protocol(monkeypatch):
    monkeypatch.setenv("SYNTHIA_MODEL_RUNTIME", "llamafile")
    def transport(url, headers, payload, timeout):
        assert url.endswith("/v1/chat/completions")
        return {"choices": [{"message": {"content": "English answer"}}]}
    assert LocalModelClient(transport).chat([]) == "English answer"

def test_missing_model_is_not_fake_inference(monkeypatch):
    monkeypatch.setenv("SYNTHIA_MODEL_RUNTIME", "ollama")
    monkeypatch.delenv("SYNTHIA_MODEL", raising=False)
    with pytest.raises(ProviderConfigurationError): LocalModelClient().chat([])

def test_empty_response_rejected(monkeypatch):
    monkeypatch.setenv("SYNTHIA_MODEL_RUNTIME", "llamafile")
    with pytest.raises(ProviderResponseError): LocalModelClient(lambda *args: {}).chat([])
