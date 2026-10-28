import importlib.util
import pathlib
import tempfile
import unittest
import zipfile

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'scripts' / 'attach_neural_archive.py'
spec = importlib.util.spec_from_file_location('original_archive_installer', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class SafeInstallTests(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root=pathlib.Path(self.folder.name)
        self.archive=self.root/'original.zip'
        self.destination=self.root/'Synthia-source'

    def write_zip(self, additional=()):
        paths=['Synthia-Neural/'+p for p in module.EXPECTED_FILES]
        with zipfile.ZipFile(self.archive,'w') as z:
            for path in paths: z.writestr(path,'original source content '+path)
            for path in additional:z.writestr(path,'sentinel')

    def test_additive_original_bytes_and_refuse_overwrite(self):
        self.write_zip()
        before=self.archive.read_bytes()
        receipt=module.install(self.archive,self.destination)
        self.assertTrue(receipt['originalSourcePreserved'])
        self.assertEqual(self.archive.read_bytes(),before)
        path=self.destination/'Synthia-Neural'/'host'/'computer-adapter.mjs'
        self.assertIn('original source',path.read_text())
        with self.assertRaises(FileExistsError):
            module.install(self.archive,self.destination)
        self.assertEqual(path.read_text(),'original source content Synthia-Neural/host/computer-adapter.mjs')

    def test_zip_slip_never_extracted(self):
        self.write_zip(['Synthia-Neural/../../attack.txt'])
        with self.assertRaises(ValueError):
            module.install(self.archive,self.destination)
        self.assertFalse((self.root/'attack.txt').exists())
        self.assertFalse(self.destination.exists())

    def test_missing_original_adapter_refused(self):
        with zipfile.ZipFile(self.archive,'w') as z:
            z.writestr('Synthia-Neural/README.md','not a model')
        with self.assertRaises(ValueError):
            module.install(self.archive,self.destination)
        self.assertFalse(self.destination.exists())

if __name__=='__main__':
    unittest.main()
