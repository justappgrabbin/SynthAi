#!/usr/bin/env python3
"""Checksum-locked release handoff for the ORIGINAL Synthia Adaptive APK.

Does not build, re-sign, patch, or change the Android app. No LLM/model is removed.
The workflow uses only GitHub Actions build artifacts and GitHub Releases.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys
from zipfile import ZipFile, BadZipFile


class DeliveryError(Exception):
    pass


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as src:
        for block in iter(lambda: src.read(4 * 1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def verify_file(path, size, sha):
    path = Path(path)
    if not path.is_file():
        raise DeliveryError(f"Missing: {path.name}")
    actual_size = path.stat().st_size
    if actual_size != size:
        raise DeliveryError(f"{path.name}: size {actual_size} != expected {size}")
    if digest(path) != sha:
        raise DeliveryError(f"{path.name}: SHA-256 mismatch")
    return path


def load_manifest(path):
    obj = json.loads(Path(path).read_text(encoding="utf-8"))
    required = ("archive_name", "archive_size_bytes", "apk_name",
                "apk_sha256", "apk_size_bytes", "release_tag", "parts")
    if any(key not in obj for key in required):
        raise DeliveryError("Incomplete release manifest")
    for key in ("archive_name", "apk_name"):
        name = obj[key]
        if not isinstance(name, str) or Path(name).name != name or "/" in name or "\\" in name:
            raise DeliveryError(f"Unsafe {key}")
    if not re.fullmatch(r"[a-f0-9]{64}", obj["apk_sha256"]):
        raise DeliveryError("Bad APK checksum format")
    if not obj["parts"] or len({p["name"] for p in obj["parts"]}) != len(obj["parts"]):
        raise DeliveryError("Missing or duplicate archive parts")
    for p in obj["parts"]:
        if Path(p["name"]).name != p["name"] or "/" in p["name"] or "\\" in p["name"]:
            raise DeliveryError("Unsafe archive part name")
        if not re.fullmatch(r"[a-f0-9]{64}", p["sha256"]):
            raise DeliveryError("Bad archive part checksum")
        if not isinstance(p["size_bytes"], int) or p["size_bytes"] <= 0:
            raise DeliveryError("Bad archive part size")
    if sum(p["size_bytes"] for p in obj["parts"]) != obj["archive_size_bytes"]:
        raise DeliveryError("Manifest archive sizes disagree")
    return obj


def assemble(manifest, parts_dir, output_dir):
    parts_dir, output_dir = Path(parts_dir), Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    # Check every input before writing an output. Fail closed on incomplete delivery.
    for p in manifest["parts"]:
        verify_file(parts_dir / p["name"], p["size_bytes"], p["sha256"])

    archive_path = output_dir / manifest["archive_name"]
    apk_path = output_dir / manifest["apk_name"]
    archive_tmp = archive_path.with_suffix(archive_path.suffix + ".tmp")
    apk_tmp = apk_path.with_suffix(apk_path.suffix + ".tmp")
    try:
        with archive_tmp.open("wb") as assembled:
            for p in manifest["parts"]:
                with (parts_dir / p["name"]).open("rb") as src:
                    shutil.copyfileobj(src, assembled, length=4 * 1024 * 1024)
        if archive_tmp.stat().st_size != manifest["archive_size_bytes"]:
            raise DeliveryError("Reassembled archive size mismatch")

        with ZipFile(archive_tmp, "r") as archive:
            apk_entries = [i for i in archive.infolist() if i.filename.lower().endswith(".apk")]
            if len(apk_entries) != 1 or apk_entries[0].filename != manifest["apk_name"]:
                raise DeliveryError("Archive must contain the one named original APK")
            entry = apk_entries[0]
            if entry.file_size != manifest["apk_size_bytes"]:
                raise DeliveryError("APK size in archive differs from manifest")
            with archive.open(entry, "r") as src, apk_tmp.open("wb") as dst:
                shutil.copyfileobj(src, dst, length=4 * 1024 * 1024)

        verify_file(apk_tmp, manifest["apk_size_bytes"], manifest["apk_sha256"])
        with ZipFile(apk_tmp, "r") as apk_zip:
            if apk_zip.getinfo("AndroidManifest.xml").file_size == 0:
                raise DeliveryError("Android manifest is empty")
            if not any(n.startswith("classes") and n.endswith(".dex") for n in apk_zip.namelist()):
                raise DeliveryError("No Android dex code in APK")
        apk_tmp.replace(apk_path)
        archive_tmp.replace(archive_path)
        print(f"VERIFIED ORIGINAL APK: {apk_path.name} ({apk_path.stat().st_size} bytes)")
        print(f"SHA-256: {manifest['apk_sha256']}")
        return apk_path
    except (BadZipFile, KeyError) as exc:
        raise DeliveryError(f"Malformed APK/archive: {exc}") from exc
    finally:
        for tmp in (archive_tmp, apk_tmp):
            tmp.unlink(missing_ok=True)


def verify_apk(manifest, apk_path):
    """Verify the original APK without requiring Drive or the split archive."""
    apk_path = verify_file(apk_path, manifest["apk_size_bytes"],
                           manifest["apk_sha256"])
    try:
        with ZipFile(apk_path, "r") as apk_zip:
            if apk_zip.getinfo("AndroidManifest.xml").file_size == 0:
                raise DeliveryError("Android manifest is empty")
            if not any(name.startswith("classes") and name.endswith(".dex")
                       for name in apk_zip.namelist()):
                raise DeliveryError("No Android dex code in APK")
    except (BadZipFile, KeyError) as exc:
        raise DeliveryError(f"Malformed APK: {exc}") from exc
    print(f"VERIFIED APK: {apk_path.name} ({apk_path.stat().st_size} bytes)")
    print(f"SHA-256: {manifest['apk_sha256']}")
    return apk_path


def release_status(manifest, release_json):
    """Return missing, complete, or conflict; never silently replace an asset."""
    data = json.loads(Path(release_json).read_text(encoding="utf-8"))
    if not data.get("id"):
        return "missing"
    matches = [asset for asset in data.get("assets", [])
               if asset.get("name") == manifest["apk_name"]]
    if not matches:
        return "missing"
    if len(matches) != 1:
        return "conflict"
    asset = matches[0]
    expected_digest = "sha256:" + manifest["apk_sha256"]
    if asset.get("size") != manifest["apk_size_bytes"]:
        return "conflict"
    # GitHub's server-reported digest is needed to declare an existing asset verified.
    return "complete" if asset.get("digest") == expected_digest else "conflict"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True)
    actions = parser.add_subparsers(dest="action", required=True)
    direct = actions.add_parser("verify-apk")
    direct.add_argument("--apk", required=True)
    verify = actions.add_parser("assemble")
    verify.add_argument("--parts-dir", required=True)
    verify.add_argument("--output-dir", required=True)
    status = actions.add_parser("release-status")
    status.add_argument("--release-json", required=True)
    args = parser.parse_args()
    manifest = load_manifest(args.manifest)
    if args.action == "verify-apk":
        verify_apk(manifest, args.apk)
    elif args.action == "assemble":
        assemble(manifest, args.parts_dir, args.output_dir)
    elif args.action == "release-status":
        state = release_status(manifest, args.release_json)
        print(state)
        if state == "conflict":
            raise DeliveryError("Existing release asset differs, is unverified, or is duplicated; human review required")


if __name__ == "__main__":
    try:
        main()
    except (DeliveryError, OSError, ValueError, json.JSONDecodeError) as error:
        print(f"RELEASE BLOCKED: {error}", file=sys.stderr)
        sys.exit(1)
