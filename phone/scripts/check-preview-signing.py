"""Public certificate pin; never prints or exports the private signing key."""
from pathlib import Path
import hashlib

actual=hashlib.sha256(Path('preview-certificate.der').read_bytes()).hexdigest()
pin=Path('android/preview-signing.sha256')
if pin.exists() and pin.read_text().strip()!=actual:
    raise SystemExit('Preview signing certificate changed. Restore the pinned owner key; refusing to publish an incompatible update.')
print('Preview signing certificate SHA256:',actual)
