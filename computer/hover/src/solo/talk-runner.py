"""Call the preserved Talk application without opening another network listener."""
import importlib.util
import json
import os
import pathlib
import sys
sys.dont_write_bytecode = True

source = pathlib.Path(os.environ.get("SYNTHIA_TALK_APP", pathlib.Path(__file__).resolve().parents[3] / "donors/synthia58/extras/Cynthia-Talk-v1-unmodified/app.py"))
spec = importlib.util.spec_from_file_location("preserved_cynthia_talk", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with module.app.test_client() as client:
    response = client.post("/api/chat", json=json.loads(sys.argv[1]))
    if response.status_code != 200:
        raise RuntimeError("Talk returned HTTP " + str(response.status_code))
    print(json.dumps(response.get_json()))
