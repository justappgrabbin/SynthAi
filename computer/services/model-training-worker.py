#!/usr/bin/env python3
"""Invoke ORIGINAL Modelmaker train_model without editing or replacing the donor.
No Hugging Face push, no external API key. Returns locally exported model files.
"""
from __future__ import annotations
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import uuid
import zipfile

MAX_CORPUS_BYTES = 750_000
MAX_EXPORT_BYTES = 1_200_000_000


def run():
    if len(sys.argv) != 3:
        raise ValueError("Usage: model-training-worker.py <original-app.py> <local-model-dir>")
    original = Path(sys.argv[1]).resolve()
    base = Path(sys.argv[2]).resolve()
    if not original.is_file():
        raise FileNotFoundError("Original Modelmaker app.py is not configured")
    if not base.is_dir():
        raise FileNotFoundError("Configured model output directory must exist")
    request = json.loads(sys.stdin.readline())
    text = request.get("corpus")
    name = request.get("name", "synthia-seed")
    epochs = request.get("epochs", 1)
    if not isinstance(text, str) or len(text.strip()) < 200 or len(text.encode("utf-8")) > MAX_CORPUS_BYTES:
        raise ValueError("Training corpus must contain 200 to 750000 bytes")
    if not isinstance(name, str) or not name or len(name) > 48 or not all(
        c.isalnum() or c in "_-" for c in name
    ):
        raise ValueError("Model name must be an alphanumeric slug (up to 48 chars)")
    if not isinstance(epochs, int) or isinstance(epochs, bool) or epochs not in (1, 2, 3):
        raise ValueError("This local training API supports 1-3 epochs")
    config = request.get("architecture") or {}
    if not isinstance(config, dict) or any(k not in
        ("vocab_size","context_length","layers","heads","embedding_size","batch_size","learning_rate")
        for k in config
    ):
        raise ValueError("Unknown model architecture option")
    vocab = config.get("vocab_size", 512)
    context = config.get("context_length", 64)
    layers = config.get("layers", 1)
    heads = config.get("heads", 2)
    embed = config.get("embedding_size", 64)
    batch = config.get("batch_size", 2)
    lr = config.get("learning_rate", 0.0003)
    if not (isinstance(vocab,int) and 512<=vocab<=4096
        and isinstance(context,int) and 32<=context<=128
        and isinstance(layers,int) and 1<=layers<=4
        and isinstance(heads,int) and heads in (1,2,4)
        and isinstance(embed,int) and embed in (64,128,256) and embed%heads==0
        and isinstance(batch,int) and 1<=batch<=8
        and isinstance(lr,(float,int)) and 0.00001<=lr<=0.005):
        raise ValueError("Architecture parameters outside local training bounds")
    # Import the untouched owner Modelmaker implementation from a trusted
    # operator-configured local path, never from the HTTP request body.
    spec = importlib.util.spec_from_file_location("owner_modelmaker", original)
    if spec is None or spec.loader is None:
        raise ImportError("Cannot load original Modelmaker source")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    summary, saved_zip = module.train_model(
        model_name=name, pasted_text=text, files=None, vocab_size=vocab,
        context_length=context, layers=layers, heads=heads, embedding_size=embed,
        epochs=epochs, batch_size=batch, learning_rate=lr,
        push_to_hub=False, progress=lambda *a, **k: None
    )
    if not saved_zip:
        raise RuntimeError("Original Modelmaker did not produce a model: " + str(summary)[:500])
    archive = Path(saved_zip).resolve()
    if not archive.is_file():
        raise RuntimeError("Original Modelmaker returned a missing model package")
    out = base / (name + "-" + uuid.uuid4().hex[:12])
    out.mkdir(parents=False, exist_ok=False)
    try:
        with zipfile.ZipFile(archive) as zf:
            members = zf.infolist()
            if sum(item.file_size for item in members) > MAX_EXPORT_BYTES:
                raise ValueError("Model export exceeds 1.2 GB")
            for item in members:
                path = Path(item.filename)
                if item.filename.startswith("/") or any(seg in ("..", "") for seg in path.parts):
                    raise ValueError("Unsafe exported model member")
                if not item.is_dir():
                    target = (out / path).resolve()
                    if not target.is_relative_to(out):
                        raise ValueError("Unsafe exported model target")
            zf.extractall(out)
        if not (out / "config.json").is_file() or not (out / "tokenizer.json").is_file():
            raise RuntimeError("Original Modelmaker did not create a loadable model")
    except Exception:
        shutil.rmtree(out, ignore_errors=True)
        raise
    return {"trained": True, "original_modelmaker_source": str(original),
            "model_dir": str(out), "epochs": epochs, "summary": str(summary)[:1500],
            "export_zip": str(archive), "ready_for_inference": True}


if __name__ == "__main__":
    try:
        print(json.dumps({"ok": True, "result": run()}))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": type(exc).__name__ + ": " + str(exc)}))
        sys.exit(1)
