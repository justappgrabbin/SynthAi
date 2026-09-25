process.env.PORT = '6969';
process.env.HOST = '127.0.0.1';
process.env.SYNTHIA_AUTO_OPEN = '1';
await import('./serve.mjs');
