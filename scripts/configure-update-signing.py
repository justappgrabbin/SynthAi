#!/usr/bin/env python3
"""Create a persistent private APK key and configure GitHub Actions via gh.

Never commit the output directory. Existing key material is always reused.
Run with an authenticated gh CLI and a JDK keytool on PATH.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import secrets
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--directory', type=Path, required=True)
parser.add_argument('--prepare-only', action='store_true')
args = parser.parse_args()
root = args.directory.resolve()
root.mkdir(parents=True, exist_ok=True, mode=0o700)
os.chmod(root, 0o700)
metadata = root / 'signing.json'
store = root / 'computer-updates.p12'
if metadata.exists() != store.exists():
    raise SystemExit('Incomplete signing files; restore the matching key and metadata. No replacement key was generated.')
if not metadata.exists():
    password = secrets.token_urlsafe(32)
    info = dict(password=password, alias='synthai-computer')
    subprocess.run(['keytool', '-genkeypair', '-noprompt', '-keystore', str(store),
                    '-storetype', 'PKCS12', '-storepass', password, '-keypass', password,
                    '-alias', info['alias'], '-keyalg', 'RSA', '-keysize', '3072',
                    '-validity', '10000', '-dname', 'CN=SynthAI Computer Updates'],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    metadata.write_text(json.dumps(info))
    os.chmod(metadata, 0o600)
    os.chmod(store, 0o600)
info = json.loads(metadata.read_text())
if not args.prepare_only:
    subprocess.run(['gh', 'auth', 'status'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    values = {
        'SYNTHAI_UPDATE_KEYSTORE_BASE64': base64.b64encode(store.read_bytes()).decode(),
        'SYNTHAI_UPDATE_STORE_PASSWORD': info['password'],
        'SYNTHAI_UPDATE_KEY_PASSWORD': info['password'],
        'SYNTHAI_UPDATE_KEY_ALIAS': info['alias'],
    }
    for name, value in values.items():
        subprocess.run(['gh', 'secret', 'set', name, '--repo', 'justappgrabbin/SynthAi'],
                       input=value.encode(), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('Persistent signing configured for the computer update channel.')
else:
    print('Private signing files prepared. No key values were printed or uploaded.')
