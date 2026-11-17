/* Boolean visual primitives. Original JS adaptation informed by b_vector bit packing and ndarray-vector-bool boolean vector semantics. */
(function (root) {
  "use strict";
  function check(w, h) {
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w * h > 4194304)
      throw Error("Invalid dimensions or image exceeds 4,194,304 pixels");
  }
  function plane(n) {
    return new Uint8Array(Math.ceil(n / 8));
  }
  function get(p, i) {
    return (p[i >> 3] >> (i & 7)) & 1;
  }
  function set(p, i, v) {
    const b = 1 << (i & 7);
    if (v) p[i >> 3] |= b;
    else p[i >> 3] &= ~b;
  }
  function count(p, n) {
    let c = 0;
    for (let i = 0; i < n; i++) c += get(p, i);
    return c;
  }
  function encode(data, w, h, threshold = 128) {
    check(w, h);
    if (!data || data.length !== w * h * 4) throw Error("Expected RGBA pixel buffer");
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 255)
      throw Error("Invalid threshold");
    const n = w * h,
      channels = [plane(n), plane(n), plane(n)],
      alpha = plane(n);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 3; k++) set(channels[k], i, data[i * 4 + k] >= threshold);
      set(alpha, i, data[i * 4 + 3] >= 128);
    }
    return { width: w, height: h, threshold, channels, alpha, encoding: "packed-rgb-threshold-v1" };
  }
  function decode(frame) {
    const { width: w, height: h, channels, alpha } = frame;
    check(w, h);
    const d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      for (let k = 0; k < 3; k++) d[i * 4 + k] = get(channels[k], i) * 255;
      d[i * 4 + 3] = get(alpha, i) * 255;
    }
    return d;
  }
  function difference(a, b) {
    if (a.width !== b.width || a.height !== b.height) throw Error("Frame dimensions differ");
    const n = a.width * a.height,
      changed = plane(n);
    let pixels = 0,
      channelChanges = 0;
    for (let i = 0; i < n; i++) {
      let diff = get(a.alpha, i) !== get(b.alpha, i);
      for (let k = 0; k < 3; k++) {
        if (get(a.channels[k], i) !== get(b.channels[k], i)) {
          diff = true;
          channelChanges++;
        }
      }
      if (diff) {
        set(changed, i, 1);
        pixels++;
      }
    }
    return { width: a.width, height: a.height, changed, pixels, channelChanges, ratio: pixels / n };
  }
  function overlay(a, b, mask) {
    if (a.width !== b.width || a.height !== b.height) throw Error("Frame dimensions differ");
    const n = a.width * a.height;
    if (mask.length !== Math.ceil(n / 8)) throw Error("Invalid mask");
    const channels = [plane(n), plane(n), plane(n)],
      alpha = plane(n);
    for (let i = 0; i < n; i++) {
      let src = get(mask, i) ? b : a;
      for (let k = 0; k < 3; k++) set(channels[k], i, get(src.channels[k], i));
      set(alpha, i, get(src.alpha, i));
    }
    return {
      width: a.width,
      height: a.height,
      channels,
      alpha,
      encoding: "packed-rgb-threshold-v1",
    };
  }
  function serialize(f) {
    return {
      width: f.width,
      height: f.height,
      threshold: f.threshold ?? 128,
      encoding: f.encoding,
      channels: f.channels.map((x) => Array.from(x)),
      alpha: Array.from(f.alpha),
    };
  }
  function deserialize(o) {
    check(o.width, o.height);
    const len = Math.ceil((o.width * o.height) / 8);
    if (
      !Array.isArray(o.channels) ||
      o.channels.length !== 3 ||
      o.channels.some((x) => !Array.isArray(x) || x.length !== len) ||
      !Array.isArray(o.alpha) ||
      o.alpha.length !== len
    )
      throw Error("Invalid serialized frame");
    return {
      width: o.width,
      height: o.height,
      threshold: o.threshold,
      encoding: o.encoding,
      channels: o.channels.map((x) => Uint8Array.from(x)),
      alpha: Uint8Array.from(o.alpha),
    };
  }
  root.BooleanVisual = {
    encode,
    decode,
    difference,
    overlay,
    get,
    set,
    count,
    serialize,
    deserialize,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
