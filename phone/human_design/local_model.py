"""Local inference adapter; never substitutes a template for model output."""
import os
from .providers import _post_json, ProviderConfigurationError, ProviderResponseError, _env_with_dotenv

class LocalModelClient:
    def __init__(self, transport=None):
        self.transport = transport or _post_json
        env = _env_with_dotenv()
        self.runtime = env.get("SYNTHIA_MODEL_RUNTIME", "ollama")
        self.model = env.get("SYNTHIA_MODEL", "")
        self.base = env.get("SYNTHIA_MODEL_URL", "http://127.0.0.1:11434" if self.runtime == "ollama" else "http://127.0.0.1:8080").rstrip("/")

    def chat(self, messages):
        if self.runtime not in ("ollama", "llamafile"):
            raise ProviderConfigurationError("Choose ollama or llamafile as SYNTHIA_MODEL_RUNTIME.")
        if self.runtime == "ollama" and not self.model:
            raise ProviderConfigurationError("Set SYNTHIA_MODEL to an installed Ollama model name.")
        payload = {"messages": messages, "stream": False, "model": self.model or "local"}
        route = "/api/chat" if self.runtime == "ollama" else "/v1/chat/completions"
        data = self.transport(self.base + route, {"Content-Type": "application/json"}, payload, 90.0)
        try:
            content = data["message"]["content"] if self.runtime == "ollama" else data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderResponseError("The local model returned no readable answer.") from exc
        if not isinstance(content, str) or not content.strip():
            raise ProviderResponseError("The local model returned an empty answer.")
        return content


def relevant_wisdom(query):
    from .wisdom import humandesign, iching, greene, coaching
    sources = humandesign.WISDOM + iching.WISDOM + greene.WISDOM + coaching.WISDOM
    matches = [w for w in sources if any(word.lower() in w["topic"].lower() for word in query.split())]
    return "\n".join(f"{m['source']} → {m['topic']}: {m['text']}" for m in matches[:3])
