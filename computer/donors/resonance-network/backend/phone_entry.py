"""Phone host for the supplied app: original API plus its built React surface."""
import os
from pathlib import Path
from fastapi import HTTPException
from fastapi.responses import FileResponse
from main import app

FRONTEND = Path(os.environ.get('RESONANCE_FRONTEND', '../frontend/dist')).resolve()
# The original root health route would shadow the phone application's index.
app.router.routes = [route for route in app.router.routes if getattr(route, 'path', None) != '/']

@app.get('/{path:path}', include_in_schema=False)
async def phone_surface(path: str):
    if path == 'api' or path.startswith('api/'):
        raise HTTPException(404)
    candidate = (FRONTEND / path).resolve()
    if not candidate.is_relative_to(FRONTEND):
        raise HTTPException(403)
    if candidate.is_file():
        return FileResponse(candidate)
    if Path(path).suffix:
        raise HTTPException(404)
    return FileResponse(FRONTEND / 'index.html')
