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
    headers = [name for name in names if '/include/node/' in name and not name.endswith('/')]
    if not any(name.endswith('/include/node/node.h') for name in headers):
        raise RuntimeError('Node headers missing from mobile release')
    for name in headers:
        relative = name.split('/include/node/', 1)[1]
        output = target / 'include/node' / relative
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(archive.read(name))
print('Node Android binaries and headers staged')
