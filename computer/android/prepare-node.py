"""Stage pinned nodejs-mobile binaries and their C++ runtime for Android.

libnode.so depends on libc++_shared.so. Gradle will package both only when
the C++ library is copied into the same ABI-specific jniLibs directory.
"""
import shutil
import sys
from pathlib import Path
from zipfile import ZipFile

if len(sys.argv) != 3:
    raise SystemExit("Usage: prepare-node.py <nodejs-mobile-archive.zip> <android-ndk-dir>")

archive_path = Path(sys.argv[1])
ndk_root = Path(sys.argv[2])
target = Path(__file__).resolve().parent / 'app/libnode'

# The NDK installation contains one prebuilt host toolchain (Linux in CI,
# Windows/macOS on local machines); the Android libraries live underneath it.
sysroot_dirs = list((ndk_root / 'toolchains/llvm/prebuilt').glob('*/sysroot/usr/lib'))
if len(sysroot_dirs) != 1:
    raise RuntimeError(f'Expected exactly one NDK sysroot under {ndk_root}, found {sysroot_dirs}')
sysroot_lib = sysroot_dirs[0]

abi_triplets = {
    'arm64-v8a': 'aarch64-linux-android',
    'x86_64': 'x86_64-linux-android',
}
with ZipFile(archive_path) as archive:
    names = archive.namelist()
    for abi, triplet in abi_triplets.items():
        matches = [name for name in names if name.endswith(f'/{abi}/libnode.so')]
        if len(matches) != 1:
            raise RuntimeError(f'Expected one {abi} libnode.so, found {len(matches)}')
        abi_dir = target / 'bin' / abi
        abi_dir.mkdir(parents=True, exist_ok=True)
        (abi_dir / 'libnode.so').write_bytes(archive.read(matches[0]))

        cxx_library = sysroot_lib / triplet / 'libc++_shared.so'
        if not cxx_library.is_file():
            raise FileNotFoundError(f'Missing Android C++ runtime: {cxx_library}')
        shutil.copyfile(cxx_library, abi_dir / 'libc++_shared.so')

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

print('Node Android binaries, C++ runtime and headers staged for ' + ', '.join(abi_triplets))
