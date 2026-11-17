/* Project folder ingestion and lossless, non-destructive ZIP export. No external dependencies. */
(function (root) {
  "use strict";
  const encode = new TextEncoder(),
    dec = new TextDecoder();
  function u16(n) {
    return [n & 255, (n >>> 8) & 255];
  }
  function u32(n) {
    return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    for (let j = 0; j < 8; j++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  function crc32(bytes) {
    let c = 0xffffffff;
    for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zip(files) {
    const chunks = [],
      central = [];
    let offset = 0;
    const put = (bytes) => {
      chunks.push(Uint8Array.from(bytes));
      offset += bytes.length;
    };
    for (const f of files) {
      const name = encode.encode(f.path),
        data = f.bytes instanceof Uint8Array ? f.bytes : encode.encode(f.text || "");
      if (name.length > 65535 || data.length > 0xffffffff)
        throw Error("ZIP entry exceeds classic ZIP limits");
      const crc = crc32(data),
        start = offset;
      put([
        ...u32(0x04034b50),
        ...u16(20),
        ...u16(0x800),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u32(crc),
        ...u32(data.length),
        ...u32(data.length),
        ...u16(name.length),
        ...u16(0),
        ...name,
      ]);
      put(data);
      central.push([
        ...u32(0x02014b50),
        ...u16(20),
        ...u16(20),
        ...u16(0x800),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u32(crc),
        ...u32(data.length),
        ...u32(data.length),
        ...u16(name.length),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u32(0),
        ...u32(start),
        ...name,
      ]);
    }
    const start = offset;
    for (const c of central) put(c);
    put([
      ...u32(0x06054b50),
      ...u16(0),
      ...u16(0),
      ...u16(central.length),
      ...u16(central.length),
      ...u32(offset - start),
      ...u32(start),
      ...u16(0),
    ]);
    return new Blob(chunks, { type: "application/zip" });
  }
  function normalize(path) {
    if (
      typeof path !== "string" ||
      path.startsWith("/") ||
      path.includes("\\") ||
      path.split("/").some((x) => x === ".." || x === "")
    )
      throw Error("Unsafe project path: " + path);
    return path;
  }
  function connections(files) {
    const paths = new Set(files.map((f) => f.path)),
      edges = [],
      unresolved = [];
    for (const f of files) {
      if (!/\.(?:m?js|cjs|jsx|ts|tsx)$/i.test(f.path) || typeof f.text !== "string") continue;
      const re =
        /(?:\bimport\s*(?:[\s\S]*?\s+from\s*)?|\bexport\s*[^;\n]*?\s+from\s*|\brequire\s*\()\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = re.exec(f.text))) {
        const spec = m[1];
        if (!spec.startsWith(".")) {
          unresolved.push({ from: f.path, specifier: spec, kind: "external-package" });
          continue;
        }
        const dir = f.path.split("/").slice(0, -1);
        for (const part of spec.split("/")) {
          if (part === "..") dir.pop();
          else if (part !== ".") dir.push(part);
        }
        const candidate = dir.join("/");
        const resolved = [
          candidate,
          candidate + ".js",
          candidate + ".mjs",
          candidate + ".cjs",
          candidate + ".ts",
          candidate + ".tsx",
          candidate + "/index.js",
          candidate + "/index.ts",
        ].find((x) => paths.has(x));
        if (resolved) edges.push({ from: f.path, to: resolved, specifier: spec });
        else unresolved.push({ from: f.path, specifier: spec, kind: "unresolved-local" });
      }
    }
    return {
      files: files.length,
      edges,
      unresolved,
      limitations:
        "Static literal import/require resolution only; no package resolution, bundling or dynamic import analysis.",
    };
  }
  const api = { zip, normalize, connections, crc32 };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ProjectIntake = api;
})(globalThis);
