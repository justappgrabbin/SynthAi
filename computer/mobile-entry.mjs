// Android starts the same Computer service after extracting its source assets.
process.env.SYNTHIA_DATA_DIR = process.argv[2];
process.env.SYNTHIA_PORT = '8765';
await import('./host/server.mjs');
