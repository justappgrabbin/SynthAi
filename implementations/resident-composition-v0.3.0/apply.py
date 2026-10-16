"""Apply the verified overlay to an extracted supplied v0.3.0 source tree."""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('target', type=Path)
parser.add_argument('--check', action='store_true', help='Validate without writing')
args = parser.parse_args()
root = Path(__file__).resolve().parent
target = args.target.resolve()
manifest = json.loads((root / 'manifest.json').read_text())
pending = []
for entry in manifest['files']:
    relative = Path(entry['path'])
    destination = (target / relative).resolve()
    if not destination.is_relative_to(target):
        raise SystemExit(f'Unsafe path: {relative}')
    source = root / 'overlay' / relative
    content = source.read_bytes()
    if hashlib.sha256(content).hexdigest() != entry['updatedSha256']:
        raise SystemExit(f'Overlay checksum mismatch: {relative}')
    current = hashlib.sha256(destination.read_bytes()).hexdigest() if destination.exists() else None
    if current == entry['updatedSha256']:
        continue
    if current != entry['baseSha256']:
        raise SystemExit(f'Source differs from supplied baseline: {relative}. No files written.')
    pending.append((destination, content))
if not args.check:
    for destination, content in pending:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
print(f'{len(pending)} files validated' + ('; check only' if args.check else '; overlay applied'))
