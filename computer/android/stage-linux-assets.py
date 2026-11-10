#!/usr/bin/env python3
"""Stage an embedded Linux userspace without changing existing Computer assets.

Inputs are explicit, locally supplied, independently verified files. Never
download an unverified rootfs or silently substitute Android's host runtime.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tarfile
from zipfile import ZipFile, ZIP_DEFLATED

def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def check_hash(path, expected):
    if len(expected) != 64 or any(c not in "0123456789abcdef" for c in expected.lower()):
        raise ValueError("Expected a 64-character SHA-256 hash")
    actual = digest(path)
    if actual != expected.lower():
        raise ValueError(f"Hash mismatch for {path.name}: {actual}")
    return actual

def validate_tar(path):
    # Reject absolute paths, traversal, devices and links escaping the root.
    with tarfile.open(path, "r:*") as tar:
        names = set()
        for item in tar:
            name = item.name.removeprefix("./")
            parts = Path(name).parts
            if not name or name.startswith("/") or ".." in parts:
                raise ValueError(f"Unsafe rootfs member: {item.name}")
            if item.ischr() or item.isblk() or item.isfifo():
                raise ValueError(f"Unsupported device member: {item.name}")
            if item.issym() or item.islnk():
                # Rootfs symlinks need a separate confined extractor at install time.
                # Keep them in the archive; do not unpack this tar on the build host.
                if item.linkname.startswith("/") or ".." in Path(item.linkname).parts:
                    raise ValueError(f"Unconfined rootfs link: {item.name}")
            names.add(name)
        if not any(n.endswith("bin/sh") for n in names):
            raise ValueError("Rootfs must contain bin/sh")
        if not any(n.endswith("usr/bin/node") or n.endswith("bin/node") for n in names):
            raise ValueError("Rootfs must contain Linux Node.js; Android libnode is not a substitute")

def build(rootfs, proot, rootfs_sha, proot_sha, output):
    for file in (rootfs, proot):
        if not file.is_file() or file.is_symlink():
            raise ValueError(f"Missing or symlinked input: {file}")
    rh = check_hash(rootfs, rootfs_sha)
    ph = check_hash(proot, proot_sha)
    validate_tar(rootfs)
    if not proot.read_bytes()[:4] == b"\x7fELF":
        raise ValueError("PRoot input is not an ELF binary")
    manifest = {
        "schema": 1, "platform": "android-arm64", "runtime": "linux-proot",
        "rootfs": {"asset": "rootfs.tar.gz", "sha256": rh, "bytes": rootfs.stat().st_size},
        "proot": {"asset": "proot", "sha256": ph, "bytes": proot.stat().st_size},
        "startup": "linux userspace must be extracted privately and started by Android before the Computer",
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite {output}")
    with ZipFile(output, "w", ZIP_DEFLATED, compresslevel=6) as archive:
        archive.write(rootfs, "rootfs.tar.gz")
        archive.write(proot, "proot")
        archive.writestr("linux-manifest.json", json.dumps(manifest, indent=2) + "\n")
    return manifest

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rootfs", type=Path, required=True)
    parser.add_argument("--rootfs-sha256", required=True)
    parser.add_argument("--proot", type=Path, required=True)
    parser.add_argument("--proot-sha256", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(build(args.rootfs, args.proot, args.rootfs_sha256,
                           args.proot_sha256, args.output), indent=2))

if __name__ == "__main__":
    main()
