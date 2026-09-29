"""Stage official nodejs-mobile v18.20.4 Android binaries in the Gradle tree."""
import sys
from pathlib import Path
from zipfile import ZipFile

archive_path = Path(sys.argv[1])
target = Path(__file__).resolve().parent / 'app/libnode'
with ZipFile(archive_path) as archive:
    names = archive.namelist()
    for abi in ('arm64-v8a', 'x86_64'):
        matches = [name for name in names if name.endswith(f'/{abi}/libnode.so')]
        if len(matches) != 1:
            raise RuntimeError(f'Expected one {abi} libnode.so, found {len(matches)}')
        output = target / 'bin' / abi / 'libnode.so'
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(archive.read(matches[0]))
    node_headers = [name for name in names if name.endswith('/node.h')]
    if len(node_headers) != 1:
        raise RuntimeError(f'Expected one Node header root, found {node_headers}')
    prefix = node_headers[0][:-len('node.h')]
    headers = [name for name in names if name.startswith(prefix) and not name.endswith('/')]
    for name in headers:
        relative = name[len(prefix):]
        output = target / 'include/node' / relative
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(archive.read(name))
print('Node Android binaries and headers staged')
