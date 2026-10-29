"""Run the supplied computer/social server and integrated phone API together."""
import os
from pathlib import Path
import subprocess
import sys
import uvicorn

if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    env = dict(os.environ, HOST="127.0.0.1", PORT=os.getenv("SYNTHIA_SOCIAL_PORT", "8787"), RESONANCE_DATA_DIR=os.getenv("RESONANCE_DATA_DIR", str(root/"data"/"resonance")))
    social = subprocess.Popen([sys.executable, str(root/"computer"/"server.py")], env=env, cwd=root, start_new_session=True)
    try:
        uvicorn.run("human_design.web_api:app", host="0.0.0.0", port=int(os.getenv("APP_PORT","8000")))
    finally:
        social.terminate()
        social.wait(timeout=10)
