(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    BV = globalThis.BooleanVisual;
  let frames = [],
    playing = false,
    token = 0;
  const canvas = $("bvcanvas"),
    ctx = canvas.getContext("2d"),
    out = $("bvout");
  function show(frame) {
    canvas.width = frame.width;
    canvas.height = frame.height;
    const d = BV.decode(frame);
    ctx.putImageData(new ImageData(d, frame.width, frame.height), 0, 0);
  }
  function status(x) {
    out.textContent = typeof x === "string" ? x : JSON.stringify(x, null, 2);
  }
  function download(name, blob) {
    const a = document.createElement("a"),
      url = URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  $("bvload").onclick = async () => {
    try {
      const input = $("bvfiles");
      if (!input.files.length) throw Error("Choose image files first");
      if (input.files.length > 120) throw Error("Maximum 120 frames");
      const next = [];
      for (const file of input.files) {
        if (!file.type.startsWith("image/")) throw Error("Not an image: " + file.name);
        const bmp = await createImageBitmap(file);
        try {
          const max = +$("bvsize").value || 256,
            scale = Math.min(1, max / Math.max(bmp.width, bmp.height)),
            w = Math.max(1, Math.round(bmp.width * scale)),
            h = Math.max(1, Math.round(bmp.height * scale));
          const off = document.createElement("canvas");
          off.width = w;
          off.height = h;
          const c = off.getContext("2d", { willReadFrequently: true });
          c.drawImage(bmp, 0, 0, w, h);
          const f = BV.encode(c.getImageData(0, 0, w, h).data, w, h, +$("bvthreshold").value);
          f.source = { name: file.name, originalWidth: bmp.width, originalHeight: bmp.height };
          next.push(f);
        } finally {
          bmp.close();
        }
      }
      frames = next;
      show(frames[0]);
      status({
        frames: frames.length,
        dimensions: frames.map((f) => [f.width, f.height]),
        note: "Binary threshold planes; original images are not overwritten. Import order determines sequence.",
      });
    } catch (e) {
      status("Error: " + e.message);
    }
  };
  $("bvnext").onclick = () => {
    if (!frames.length) return;
    const i = (+canvas.dataset.index || 0) % frames.length;
    show(frames[i]);
    canvas.dataset.index = i + 1;
  };
  $("bvdiff").onclick = () => {
    try {
      if (frames.length < 2) throw Error("Choose at least two images");
      const d = BV.difference(frames[0], frames[1]);
      status({ changedPixels: d.pixels, ratio: d.ratio, changedRGBChannels: d.channelChanges });
      const mask = new Uint8ClampedArray(d.width * d.height * 4);
      for (let i = 0; i < d.width * d.height; i++) {
        const bit = BV.get(d.changed, i);
        mask.set([bit * 255, 0, 0, 255], i * 4);
      }
      canvas.width = d.width;
      canvas.height = d.height;
      ctx.putImageData(new ImageData(mask, d.width, d.height), 0, 0);
    } catch (e) {
      status("Error: " + e.message);
    }
  };
  $("bvplay").onclick = async () => {
    if (!frames.length) return;
    playing = true;
    const t = ++token;
    for (let i = 0; playing && t === token; i++) {
      show(frames[i % frames.length]);
      await new Promise((r) => setTimeout(r, Math.max(60, +$("bvdelay").value || 250)));
    }
  };
  $("bvstop").onclick = () => {
    playing = false;
    token++;
  };
  $("bvpng").onclick = () => {
    if (!frames.length) return;
    show(frames[0]);
    canvas.toBlob((b) => {
      if (b) download("boolean-reconstruction.png", b);
    }, "image/png");
  };
  $("bvexport").onclick = () => {
    if (!frames.length) return;
    download(
      "boolean-visual-frames.json",
      new Blob(
        [JSON.stringify({ format: "boolean-visual-v1", frames: frames.map(BV.serialize) })],
        { type: "application/json" },
      ),
    );
  };
})();
