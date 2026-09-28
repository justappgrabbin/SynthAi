// Pure Synthia Automata — script: write three sample artifacts to /tmp
//
// Generates real files with the pure-JS artifact layer (no DOM, no deps):
//   /tmp/picture.bmp  one 64x64 render of gate 24's field state (24-bit BMP)
//   /tmp/morph.gif    8-frame morph gate 24 -> gate 41 (animated GIF89a)
//   /tmp/counter.js   woven "gate resonance counter" module (text/javascript)
//
// Run: node scripts/write-sample-artifacts.mjs

import { writeFileSync } from 'node:fs';
import { MediaField, CodeWeaver } from '../src/merged/media-field.js';
import { ArtifactWriter, encodeBMP, encodeGIF } from '../src/merged/artifacts.js';

const field = new MediaField({ width: 64, height: 64 });
const writer = new ArtifactWriter();

// picture: one state-pure frame of gate 24's field state -> BMP
const picture = writer.write('picture', {
  fileName: 'picture.bmp',
  bytes: encodeBMP(64, 64, field.morphFrames(24, 24, 1)[0]),
  mime: 'image/bmp',
}).artifact;

// video: 8-frame morph gate 24 -> gate 41 -> animated GIF (8 cs/frame)
const frames = field.morphFrames(24, 41, 8);
const video = writer.write('video', {
  fileName: 'morph.gif',
  bytes: encodeGIF(64, 64, frames.map((rgba) => ({ rgba, delayCs: 8 })), { loop: true }),
  mime: 'image/gif',
}).artifact;

// code: woven gate-resonance-counter module -> text/javascript
const code = new CodeWeaver().weaveArtifact({
  name: 'gate resonance counter',
  gates: [24, 41],
  purpose: 'count gate resonance over the 6-bit line pattern',
}, writer).artifact;

writeFileSync('/tmp/picture.bmp', picture.bytes);
writeFileSync('/tmp/morph.gif', video.bytes);
writeFileSync('/tmp/counter.js', code.text, 'utf8');

const written = [['/tmp/picture.bmp', picture], ['/tmp/morph.gif', video], ['/tmp/counter.js', code]];
for (const [path, a] of written) {
  console.log(`${a.id}  ${path}  ${a.mime}  ${a.size} bytes  fnv1a ${a.hash}`);
}
