#!/usr/bin/env python3
"""Synthia read-only model inference worker.
Loads actual model weights from admin-configured paths. Never trains or downloads
models and never returns a fabricated model response.
"""
from __future__ import annotations
import argparse
import importlib.util
import json
from pathlib import Path
import sys
import traceback


def status(backend, source, checkpoint, model_dir):
    if backend == "trident":
        return {
            "backend": backend,
            "architecture_source": str(source) if source else None,
            "architecture_present": bool(source and source.is_file()),
            "checkpoint_present": bool(checkpoint and checkpoint.is_file()),
            "torch_installed": importlib.util.find_spec("torch") is not None,
            "inference_ready": bool(source and source.is_file() and checkpoint and checkpoint.is_file()
                                    and importlib.util.find_spec("torch")),
        }
    return {
        "backend": "modelmaker",
        "model_dir": str(model_dir) if model_dir else None,
        "model_files_present": bool(model_dir and model_dir.is_dir() and
                                    (model_dir / "config.json").is_file() and
                                    any((model_dir / n).is_file() for n in
                                        ("model.safetensors", "pytorch_model.bin"))),
        "tokenizer_present": bool(model_dir and model_dir.is_dir() and
                                  (model_dir / "tokenizer.json").is_file()),
        "transformers_installed": importlib.util.find_spec("transformers") is not None,
        "torch_installed": importlib.util.find_spec("torch") is not None,
        "inference_ready": bool(model_dir and (model_dir / "config.json").is_file() and
                                (model_dir / "tokenizer.json").is_file() and
                                any((model_dir / n).is_file() for n in
                                    ("model.safetensors", "pytorch_model.bin")) and
                                importlib.util.find_spec("transformers") and
                                importlib.util.find_spec("torch")),
    }


def trident_generate(source, checkpoint, query):
    if not source or not source.is_file() or not checkpoint or not checkpoint.is_file():
        raise RuntimeError("TRIDENT requires original model.py and existing trained checkpoint")
    import torch
    spec = importlib.util.spec_from_file_location("synthia_trident_original", source)
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load configured TRIDENT architecture")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    model = module.Trident()
    # Original source model unchanged. Only trusted local checkpoint path accepted.
    state = torch.load(str(checkpoint), map_location="cpu", weights_only=True)
    model.load_state_dict(state, strict=True)
    model.eval()
    prompt = query["prompt"]
    # Matches the author's train.py character-token format, not a new tokenizer.
    ids = [ord(char) % model.cfg.vocab_size for char in prompt][-model.cfg.max_seq_len:]
    if not ids:
        raise ValueError("Empty TRIDENT prompt")
    input_ids = torch.tensor([ids], dtype=torch.long)
    max_new = query["max_new_tokens"]
    head = query.get("head")
    if head is not None and head not in model.cfg.heads:
        raise ValueError("Unknown specialist head")
    with torch.inference_mode():
        generated = model.generate(input_ids, max_new=max_new, temp=query["temperature"],
                                   head=head)
    token_ids = generated[0, len(ids):].tolist()
    # The original character-token training is lossy for non-BMP characters.
    text = "".join(chr(v) if 32 <= v <= 126 or v in (9, 10, 13) else "\ufffd"
                   for v in token_ids)
    return {
        "backend": "trident", "weights_loaded": True,
        "head": head or "router", "new_tokens": len(token_ids),
        "text": text, "decoding": "original-char-tokenizer-lossy",
        "checkpoint": str(checkpoint), "architecture_source": str(source)
    }


def modelmaker_generate(model_dir, query):
    if not model_dir or not model_dir.is_dir():
        raise RuntimeError("Modelmaker requires an existing exported local model directory")
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained(str(model_dir), local_files_only=True,
                                               trust_remote_code=False)
    model = AutoModelForCausalLM.from_pretrained(str(model_dir),
                                                 local_files_only=True,
                                                 trust_remote_code=False).eval()
    enc = tokenizer(query["prompt"], return_tensors="pt", truncation=True,
                    max_length=min(int(getattr(model.config, "n_positions", 256)), 512))
    with torch.inference_mode():
        tokens = model.generate(**enc, max_new_tokens=query["max_new_tokens"],
                                do_sample=True, temperature=query["temperature"],
                                pad_token_id=tokenizer.eos_token_id)
    text = tokenizer.decode(tokens[0][enc["input_ids"].shape[1]:],
                            skip_special_tokens=True)
    return {"backend": "modelmaker", "weights_loaded": True,
            "new_tokens": int(tokens.shape[1] - enc["input_ids"].shape[1]),
            "text": text, "model_dir": str(model_dir)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", choices=("trident", "modelmaker"), required=True)
    parser.add_argument("--operation", choices=("status", "generate"), required=True)
    parser.add_argument("--source", default="")
    parser.add_argument("--checkpoint", default="")
    parser.add_argument("--model-dir", default="")
    args = parser.parse_args()
    source = Path(args.source).resolve() if args.source else None
    checkpoint = Path(args.checkpoint).resolve() if args.checkpoint else None
    model_dir = Path(args.model_dir).resolve() if args.model_dir else None
    try:
        if args.operation == "status":
            result = status(args.backend, source, checkpoint, model_dir)
        else:
            payload = json.loads(sys.stdin.readline())
            prompt = payload.get("prompt")
            count = payload.get("max_new_tokens", 24)
            temperature = payload.get("temperature", 0.8)
            if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 4096:
                raise ValueError("Prompt must contain 1-4096 characters")
            if not isinstance(count, int) or isinstance(count, bool) or not 1 <= count <= 64:
                raise ValueError("max_new_tokens must be between 1 and 64")
            if not isinstance(temperature, (int, float)) or isinstance(temperature, bool) or not 0.05 <= temperature <= 2:
                raise ValueError("temperature must be between 0.05 and 2")
            if args.backend == "trident":
                result = trident_generate(source, checkpoint, payload)
            else:
                result = modelmaker_generate(model_dir, payload)
        print(json.dumps({"ok": True, "result": result}, ensure_ascii=False))
        return 0
    except Exception as exc:
        # Never falsely describe a missing model or incompatible weights as success.
        print(json.dumps({"ok": False, "error": type(exc).__name__ + ": " + str(exc)}))
        return 1


if __name__ == "__main__":
    sys.exit(main())
