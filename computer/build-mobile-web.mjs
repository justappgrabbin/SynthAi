import { cp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';

await import('./build-web.mjs');

const src = new URL('../public/', import.meta.url);
const out = new URL('../mobile-web/', import.meta.url);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(src, out, { recursive: true });

const mobilePage = new URL('./mobile-computer.html', out);
let mobileHtml = await readFile(mobilePage, 'utf8');
if (!mobileHtml.includes('kimi-client-panel.mjs')) {
  mobileHtml = mobileHtml.replace('</body>', '<script type="module" src="./kimi-client-panel.mjs"></script>\n</body>');
  await writeFile(mobilePage, mobileHtml, 'utf8');
}

await writeFile(new URL('./index.html', out), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#12091d">
<title>Kimi SynthAI Computer</title>
<script>location.replace('./mobile-computer.html');</script>
</head>
<body style="margin:0;background:#0d0714;color:#fff;font-family:system-ui;padding:24px">
Launching Kimi SynthAI Computer…
</body>
</html>\n`, 'utf8');

console.log('Kimi SynthAI mobile APK web bundle staged');
