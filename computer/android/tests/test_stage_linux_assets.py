"""Offline staging safety tests: python -m unittest discover -s computer/android/tests -v"""
import hashlib
import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "stage-linux-assets.py"
spec = importlib.util.spec_from_file_location("stage_linux_assets", SCRIPT)
stage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stage)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def make_tar(path, entries):
    with tarfile.open(path, "w:gz") as tar:
        for name, body in entries:
            data = body.encode()
            info = tarfile.TarInfo(name)
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))

class StageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.dir = Path(self.tmp.name)
        self.rootfs = self.dir / "rootfs.tar.gz"
        self.proot = self.dir / "proot"
        self.proot.write_bytes(b"\x7fELF" + b"fixture")
        make_tar(self.rootfs, [("bin/sh", "shell"), ("usr/bin/node", "node")])

    def test_staging_and_manifest(self):
        from zipfile import ZipFile
        out = self.dir / "linux-assets.zip"
        manifest = stage.build(self.rootfs, self.proot, sha(self.rootfs), sha(self.proot), out)
        self.assertEqual(manifest["rootfs"]["sha256"], sha(self.rootfs))
        with ZipFile(out) as z:
            self.assertEqual(set(z.namelist()), {"rootfs.tar.gz", "proot", "linux-manifest.json"})

    def test_refuse_overwrite(self):
        out = self.dir / "existing.zip"
        out.write_bytes(b"original")
        with self.assertRaises(FileExistsError):
            stage.build(self.rootfs, self.proot, sha(self.rootfs), sha(self.proot), out)
        self.assertEqual(out.read_bytes(), b"original")

    def test_wrong_digest(self):
        with self.assertRaises(ValueError):
            stage.build(self.rootfs, self.proot, "0" * 64, sha(self.proot), self.dir / "out.zip")

    def test_missing_node(self):
        make_tar(self.rootfs, [("bin/sh", "shell")])
        with self.assertRaises(ValueError):
            stage.build(self.rootfs, self.proot, sha(self.rootfs), sha(self.proot), self.dir / "out.zip")

    def test_reject_suffix_spoof(self):
        make_tar(self.rootfs, [("fake/bin/sh", "shell"), ("fake/usr/bin/node", "node")])
        with self.assertRaises(ValueError):
            stage.build(self.rootfs, self.proot, sha(self.rootfs), sha(self.proot), self.dir / "out.zip")

    def test_traversal(self):
        make_tar(self.rootfs, [("../bin/sh", "shell"), ("usr/bin/node", "node")])
        with self.assertRaises(ValueError):
            stage.build(self.rootfs, self.proot, sha(self.rootfs), sha(self.proot), self.dir / "out.zip")

    def test_invalid_elf(self):
        self.proot.write_bytes(b"not-elf")
        with self.assertRaises(ValueError):
            stage.build(self.rootfs, self.proot, sha(self.rootfs), sha(self.proot), self.dir / "out.zip")

if __name__ == "__main__":
    unittest.main()
