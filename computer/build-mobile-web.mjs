import { cp, rm, mkdir, writeFile } from 'node:fs/promises';

await import('./build-web.mjs');

const src = new URL('../public/', import.meta.url);
const out = new URL('../mobile-web/', import.meta.url);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(src, out, { recursive: true });

await writeFile(new URL('./index.html', out), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#12091d">
<title>SynthAI IndiVerse</title>
<script>location.replace('./indiverse-shell.html');</script>
</head>
<body style="margin:0;background:#0d0714;color:#fff;font-family:system-ui;padding:24px">
Launching SynthAI IndiVerse…
</body>
</html>\n`, 'utf8');

console.log('SynthAI mobile APK web bundle staged');
