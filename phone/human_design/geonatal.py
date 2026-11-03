from __future__ import annotations

import json
from pathlib import Path
import subprocess
from typing import Any


class GeonatalRuntimeError(RuntimeError):
    pass


def calculate_geonatal(
    timestamp: str,
    *,
    latitude: float,
    longitude: float,
) -> dict[str, Any]:
    runtime = Path(__file__).resolve().parents[1] / "runtimes" / "isohuman"
    script = runtime / "dist" / "cli" / "geonatal.js"
    if not script.exists():
        raise GeonatalRuntimeError(
            "IsoHuman geonatal runtime is not built. Run `npm run build` in runtimes/isohuman."
        )
    completed = subprocess.run(
        [
            "node",
            str(script),
            timestamp,
            str(latitude),
            str(longitude),
        ],
        cwd=runtime,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if completed.returncode != 0:
        raise GeonatalRuntimeError(
            completed.stderr.strip() or "IsoHuman geonatal calculation failed."
        )
    payload = json.loads(completed.stdout)
    if not isinstance(payload, dict):
        raise GeonatalRuntimeError("IsoHuman returned an invalid geonatal payload.")
    return payload

