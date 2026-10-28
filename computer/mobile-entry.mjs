// Android starts the same Computer service after extracting its source assets.
process.env.SYNTHIA_DATA_DIR = process.argv[2];
process.env.SYNTHIA_PORT = '8765';
// The Android activity creates a fresh 256-bit secret and provisions its WebView cookie.
if (!/^[a-f0-9]{64}$/.test(process.argv[3] ?? '')) throw new Error('Missing Android Computer session capability.');
process.env.SYNTHIA_API_TOKEN = process.argv[3];
await import('./host/server.mjs');
