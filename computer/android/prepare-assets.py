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


# The Android Computer is a real Node host; package the SAME existing
# workspace assets under computer/public so /workspace.html and the new
# Synthia Agent tab are usable from the APK with no external web hosting.
# These files are staged by the existing npm build, never modified here.
webroot = root.parent / 'public'
with ZipFile(destination, 'a', ZIP_DEFLATED, compresslevel=7) as archive:
    required = ['workspace.html', 'workspace.css', 'workspace.mjs', 'workspace-core.mjs']
    for name in required:
        path = webroot / name
        if not path.is_file():
            raise FileNotFoundError(f'Existing Computer Workspace asset missing: {path}')
        archive.write(path, 'public/' + name)
    mounted = webroot / 'computer-runtime'
    if not (mounted / 'ComputerRuntime.mjs').is_file() or not (mounted / 'services/proactive-synthia.mjs').is_file():
        raise FileNotFoundError('Computer browser runtime missing proactive module; run node computer/build-web.mjs')
    for path in sorted(mounted.rglob('*')):
        if path.is_file():
            archive.write(path, 'public/' + path.relative_to(webroot).as_posix())
print('Packaged original browser Workspace and Synthia Agent panel for Android')
