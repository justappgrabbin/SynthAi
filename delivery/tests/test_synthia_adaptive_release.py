"""Offline regression tests. No credentials, GitHub API, or phone required."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from zipfile import ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from synthia_adaptive_release import assemble, DeliveryError, load_manifest, release_status


def sha(data):
    return hashlib.sha256(data).hexdigest()


def make_fixture(root):
    root = Path(root)
    apk = io.BytesIO()
    with ZipFile(apk, "w") as z:
        z.writestr("AndroidManifest.xml", b"manifest")
        z.writestr("classes.dex", b"DEX fixture bytes")
    apk_bytes = apk.getvalue()
    archive = io.BytesIO()
    with ZipFile(archive, "w") as z:
        z.writestr("Synthia-Adaptive-v0.5.4.apk", apk_bytes)
    zip_bytes = archive.getvalue()
    split = [zip_bytes[:80], zip_bytes[80:160], zip_bytes[160:]]
    root.mkdir(parents=True, exist_ok=True)
    parts = []
    for i, content in enumerate(split, start=1):
        name = f"Synthia-Adaptive-v0.5.4.zip.{i:03d}"
        (root / name).write_bytes(content)
        parts.append({"name": name, "size_bytes": len(content), "sha256": sha(content)})
    manifest = {
        "archive_name": "Synthia-Adaptive-v0.5.4.zip",
        "archive_size_bytes": len(zip_bytes),
        "apk_name": "Synthia-Adaptive-v0.5.4.apk",
        "apk_size_bytes": len(apk_bytes),
        "apk_sha256": sha(apk_bytes),
        "release_tag": "synthia-adaptive-v0.5.4",
        "parts": parts,
    }
    (root / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return manifest


class TestSynthiaDelivery(unittest.TestCase):
    def test_reassembles_one_exact_apk(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fixture = make_fixture(root / "parts")
            manifest = load_manifest(root / "parts" / "manifest.json")
            output = assemble(manifest, root / "parts", root / "out")
            self.assertEqual(output.name, fixture["apk_name"])
            self.assertEqual(sha(output.read_bytes()), fixture["apk_sha256"])
            self.assertTrue((root / "out" / fixture["archive_name"]).is_file())

    def test_rejects_corruption(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = make_fixture(root / "parts")
            corrupt = root / "parts" / manifest["parts"][1]["name"]
            corrupt.write_bytes(b"tampered" + corrupt.read_bytes())
            with self.assertRaisesRegex(DeliveryError, "size"):
                assemble(manifest, root / "parts", root / "out")
            self.assertFalse((root / "out" / manifest["apk_name"]).exists())

    def test_rejects_missing_parts(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = make_fixture(root / "parts")
            (root / "parts" / manifest["parts"][0]["name"]).unlink()
            with self.assertRaisesRegex(DeliveryError, "Missing"):
                assemble(manifest, root / "parts", root / "out")

    def test_release_never_accepts_bad_existing_asset(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = make_fixture(root / "parts")
            response = root / "release.json"
            response.write_text("{}")
            self.assertEqual(release_status(manifest, response), "missing")
            response.write_text(json.dumps({"id": 123, "assets": []}))
            self.assertEqual(release_status(manifest, response), "missing")
            asset = {
                "name": manifest["apk_name"],
                "size": manifest["apk_size_bytes"],
                "digest": "sha256:" + manifest["apk_sha256"],
            }
            response.write_text(json.dumps({"id": 123, "assets": [asset]}))
            self.assertEqual(release_status(manifest, response), "complete")
            asset["digest"] = "sha256:" + "0" * 64
            response.write_text(json.dumps({"id": 123, "assets": [asset]}))
            self.assertEqual(release_status(manifest, response), "conflict")


if __name__ == "__main__":
    unittest.main()
