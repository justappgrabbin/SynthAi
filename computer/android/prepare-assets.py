"""Package this continuing Computer source and Kimi build for its local Node host."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
destination = root / 'android/app/src/main/assets/computer-assets.zip'
destination.parent.mkdir(parents=True, exist_ok=True)

def included(path):
    relative = path.relative_to(root)
    parts = relative.parts
    if parts[0] in {'android', 'tests', 'platforms'}:
        return False
    if any(part in {'node_modules', '.git', 'tests', 'test', 'source-archives', '__pycache__'} for part in parts):
        return False
    if parts[:2] == ('shell', 'kimi-linux') and 'dist' not in parts:
        return False
    if path.suffix in {'.zip', '.pdf', '.md', '.pyc'}:
        return False
    return True

with ZipFile(destination, 'w', ZIP_DEFLATED, compresslevel=7) as archive:
    for path in sorted(root.rglob('*')):
        if path.is_file() and included(path):
            archive.write(path, path.relative_to(root).as_posix())

print(f'{destination}: {destination.stat().st_size} bytes')
