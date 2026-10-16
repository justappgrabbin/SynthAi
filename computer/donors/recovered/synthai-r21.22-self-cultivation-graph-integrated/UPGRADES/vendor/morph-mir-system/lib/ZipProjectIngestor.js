/**
 * Dependency-free ZIP reader for Synthia source ingestion.
 *
 * Supports stored and DEFLATE entries. It parses ZIP metadata directly and
 * uses the platform's native DEFLATE implementation (Web DecompressionStream
 * or Node's built-in zlib), never Python or an npm package.
 */
class ZipProjectIngestor {
  constructor(options = {}) {
    this.maxEntries = options.maxEntries ?? 10000;
    this.maxEntryBytes = options.maxEntryBytes ?? 16 * 1024 * 1024;
    this.maxTotalBytes = options.maxTotalBytes ?? 128 * 1024 * 1024;
    this.verifyCrc = options.verifyCrc ?? true;
  }

  async ingest(source, options = {}) {
    const bytes = await this.toBytes(source);
    const archiveName = options.archiveName || source?.name || "archive.zip";
    const extensions = this.normalizeExtensions(options.extensions);
    const entries = this.readCentralDirectory(bytes);
    const files = [];
    let totalBytes = 0;

    for (const entry of entries) {
      if (entry.directory) continue;
      if (extensions && !extensions.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
        continue;
      }
      if (entry.encrypted) {
        files.push(this.skipped(entry, archiveName, "encrypted-entry"));
        continue;
      }
      if (entry.uncompressedSize > this.maxEntryBytes) {
        files.push(this.skipped(entry, archiveName, "entry-too-large"));
        continue;
      }

      totalBytes += entry.uncompressedSize;
      if (totalBytes > this.maxTotalBytes) {
        throw new Error(`ZIP expanded source exceeds ${this.maxTotalBytes} bytes.`);
      }

      try {
        const payload = await this.readEntry(bytes, entry);
        if (this.verifyCrc && this.crc32(payload) !== entry.crc32) {
          throw new Error("CRC32 mismatch");
        }

        const content = new TextDecoder("utf-8", { fatal: false }).decode(payload);
        files.push({
          id: `zip_${this.hash(`${archiveName}:${entry.name}:${content}`)}`,
          name: entry.name,
          originalName: entry.name,
          content,
          originalContent: content,
          metadata: {
            archiveName,
            archivePath: entry.name,
            compressedSize: entry.compressedSize,
            uncompressedSize: entry.uncompressedSize,
            crc32: entry.crc32,
            compressionMethod: entry.method,
            status: "ingested"
          }
        });
      } catch (error) {
        files.push(this.skipped(entry, archiveName, error instanceof Error ? error.message : String(error)));
      }
    }

    return {
      archiveName,
      entries: entries.length,
      files: files.filter((file) => file.metadata.status === "ingested"),
      skipped: files.filter((file) => file.metadata.status === "skipped")
    };
  }

  normalizeExtensions(extensions) {
    if (!extensions?.length) return null;
    return extensions.map((value) => {
      const ext = String(value).toLowerCase();
      return ext.startsWith(".") ? ext : `.${ext}`;
    });
  }

  async toBytes(source) {
    if (source instanceof Uint8Array) return source;
    if (source instanceof ArrayBuffer) return new Uint8Array(source);
    if (ArrayBuffer.isView(source)) {
      return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    }
    if (source?.arrayBuffer) return new Uint8Array(await source.arrayBuffer());
    if (source?.bytes) return this.toBytes(source.bytes);
    throw new TypeError("ZIP source must be a Blob/File, ArrayBuffer, Uint8Array, or { bytes }.");
  }

  readCentralDirectory(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const eocd = this.findEndOfCentralDirectory(view);
    const entryCount = view.getUint16(eocd + 10, true);
    const centralSize = view.getUint32(eocd + 12, true);
    const centralOffset = view.getUint32(eocd + 16, true);

    if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
      throw new Error("ZIP64 archives are not supported by this ingestion organ.");
    }
    if (entryCount > this.maxEntries) {
      throw new Error(`ZIP contains ${entryCount} entries; limit is ${this.maxEntries}.`);
    }
    if (centralOffset + centralSize > bytes.byteLength) {
      throw new Error("Invalid ZIP central directory bounds.");
    }

    const decoder = new TextDecoder("utf-8", { fatal: false });
    const entries = [];
    let offset = centralOffset;

    for (let index = 0; index < entryCount; index += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) {
        throw new Error(`Invalid ZIP central-directory signature at entry ${index}.`);
      }

      const flags = view.getUint16(offset + 8, true);
      const method = view.getUint16(offset + 10, true);
      const crc32 = view.getUint32(offset + 16, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localHeaderOffset = view.getUint32(offset + 42, true);
      const nameStart = offset + 46;
      const rawName = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
      const name = this.safePath(rawName);

      if ([compressedSize, uncompressedSize, localHeaderOffset].includes(0xffffffff)) {
        throw new Error(`ZIP64 entry is unsupported: ${name}`);
      }

      entries.push({
        name,
        flags,
        method,
        crc32,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
        encrypted: Boolean(flags & 0x0001),
        directory: rawName.endsWith("/")
      });

      offset = nameStart + nameLength + extraLength + commentLength;
    }

    return entries;
  }

  findEndOfCentralDirectory(view) {
    const minimum = Math.max(0, view.byteLength - 65557);
    for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
      if (view.getUint32(offset, true) === 0x06054b50) return offset;
    }
    throw new Error("End-of-central-directory record not found.");
  }

  async readEntry(bytes, entry) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const offset = entry.localHeaderOffset;
    if (view.getUint32(offset, true) !== 0x04034b50) {
      throw new Error(`Invalid local header for ${entry.name}`);
    }

    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const dataStart = offset + 30 + nameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    if (dataEnd > bytes.byteLength) throw new Error(`Truncated ZIP entry: ${entry.name}`);

    const compressed = bytes.subarray(dataStart, dataEnd);
    if (entry.method === 0) return compressed.slice();
    if (entry.method === 8) return this.inflateRaw(compressed);
    throw new Error(`Unsupported ZIP compression method ${entry.method}`);
  }

  async inflateRaw(compressed) {
    if (typeof DecompressionStream !== "undefined") {
      try {
        const stream = new Blob([compressed])
          .stream()
          .pipeThrough(new DecompressionStream("deflate-raw"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      } catch {
        // Fall through to Node's dependency-free built-in when available.
      }
    }

    if (typeof process !== "undefined" && process.versions?.node) {
      const { inflateRawSync } = await import("node:zlib");
      const result = inflateRawSync(compressed);
      return new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
    }

    throw new Error("This platform cannot inflate DEFLATE ZIP entries.");
  }

  safePath(value) {
    const normalized = String(value).replace(/\\/g, "/").replace(/^\/+/, "");
    const parts = normalized.split("/").filter((part) => part && part !== ".");
    if (parts.some((part) => part === "..")) {
      throw new Error(`Unsafe ZIP path: ${value}`);
    }
    return parts.join("/");
  }

  skipped(entry, archiveName, reason) {
    return {
      id: `skip_${this.hash(`${archiveName}:${entry.name}:${reason}`)}`,
      name: entry.name,
      originalName: entry.name,
      content: "",
      originalContent: "",
      metadata: {
        archiveName,
        archivePath: entry.name,
        status: "skipped",
        reason
      }
    };
  }

  hash(value) {
    let hash = 0x811c9dc5;
    const bytes = new TextEncoder().encode(String(value));
    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }

  crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
}

export { ZipProjectIngestor };
