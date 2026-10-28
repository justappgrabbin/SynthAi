#!/usr/bin/env python3
"""Install the ORIGINAL owner-provided Synthia-Neural-Standalone ZIP additively.

Usage: python3 computer/scripts/attach_neural_archive.py original.zip --destination /path/new/directory
The source ZIP is NEVER modified. Existing destination is NEVER overwritten.
Outputs the SYNTHIA_NEURAL_HOME path for existing Computer host.
"""
import argparse
import hashlib
import json
import os
import pathlib
import shutil
import stat
import tempfile
import zipfile

MAX_ENTRIES = 2000
MAX_TOTAL = 180_000_000
MAX_ENTRY = 90_000_000
EXPECTED_ROOT = 'Synthia-Neural'
EXPECTED_FILES = [
    'host/computer-adapter.mjs', 'host/alignment.mjs',
    'host/runtime.mjs', 'engine/worker.py', 'IMPLEMENTATION_MAP.md'
]

def install(archive, destination):
    source = pathlib.Path(archive).resolve(strict=True)
    dest = pathlib.Path(destination).resolve()
    if dest.exists():
        raise FileExistsError('Refusing to overwrite existing destination')
    if not dest.parent.is_dir():
        raise FileNotFoundError('Destination parent directory must already exist')
    if not zipfile.is_zipfile(source):
        raise ValueError('Expected the original standalone ZIP, not an executable')
    root_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    seen = set()
    total = 0
    with zipfile.ZipFile(source) as handle:
        entries = handle.infolist()
        if not 1 <= len(entries) <= MAX_ENTRIES:
            raise ValueError('Unexpected archive entry count')
        for item in entries:
            path = pathlib.PurePosixPath(item.filename)
            if (path.is_absolute() or '\\' in item.filename or
                any(piece in ('..', '.') for piece in path.parts) or
                not path.parts or path.parts[0] != EXPECTED_ROOT or
                ':' in item.filename or item.filename.startswith('/')):
                raise ValueError('Unsafe or unexpected archive path')
            if item.filename in seen:
                raise ValueError('Duplicate source path')
            seen.add(item.filename)
            if stat.S_ISLNK(item.external_attr >> 16):
                raise ValueError('Symlink entries prohibited')
            if item.file_size > MAX_ENTRY:
                raise ValueError('Oversized original source member')
            total += item.file_size
            if total > MAX_TOTAL:
                raise ValueError('Total source archive exceeds limit')
        if any(EXPECTED_ROOT + '/' + name not in seen for name in EXPECTED_FILES):
            raise ValueError('Missing required original neural source files')
        temporary = pathlib.Path(tempfile.mkdtemp(prefix='synthia-neural-', dir=dest.parent))
        try:
            # Extract exact source bytes, never execute the ZIP during inspection.
            for item in entries:
                path = temporary.joinpath(*pathlib.PurePosixPath(item.filename).parts)
                if item.is_dir():
                    path.mkdir(parents=True, exist_ok=True)
                    continue
                path.parent.mkdir(parents=True, exist_ok=True)
                with handle.open(item) as inp, path.open('xb') as out:
                    shutil.copyfileobj(inp, out, length=1024 * 1024)
            os.rename(temporary, dest)
        except Exception:
            shutil.rmtree(temporary, ignore_errors=True)
            raise
    installed = dest / EXPECTED_ROOT
    return {'mountedHome': str(installed), 'originalArchiveSha256': root_hash,
            'files': len(entries), 'uncompressedBytes': total, 'originalSourcePreserved': True}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive')
    parser.add_argument('--destination', required=True)
    args = parser.parse_args()
    print(json.dumps(install(args.archive, args.destination), indent=2))

if __name__ == '__main__':
    main()
