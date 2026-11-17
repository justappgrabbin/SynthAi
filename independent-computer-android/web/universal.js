(function (g) {
  "use strict";
  const bytes = (x) => (x instanceof Uint8Array ? x : new Uint8Array(x));
  function identify(x) {
    const b = bytes(x),
      starts = (...a) => a.every((v, i) => b[i] === v);
    if (starts(0, 97, 115, 109)) return "wasm";
    if (starts(127, 69, 76, 70)) return "elf";
    if (starts(80, 75, 3, 4) || starts(80, 75, 5, 6)) return "zip";
    if (starts(37, 80, 68, 70)) return "pdf";
    if (starts(137, 80, 78, 71)) return "png";
    if (starts(255, 216, 255)) return "jpeg";
    if (starts(71, 71, 85, 70)) return "gguf";
    if (starts(77, 90)) return "pe";
    if (starts(31, 139)) return "gzip";
    if (starts(82, 97, 114, 33)) return "rar";
    if (starts(55, 122, 188, 175, 39, 28)) return "7z";
    if (new TextDecoder().decode(b.subarray(0, 16)) === "SQLite format 3\0") return "sqlite";
    try {
      const s = new TextDecoder("utf-8", { fatal: true }).decode(b);
      if (!/[\x00-\x08\x0e-\x1f]/.test(s)) return "text";
    } catch {}
    return "binary";
  }
  function inspect(x) {
    let b = bytes(x),
      format = identify(b),
      r = {
        format,
        size: b.length,
        preview: Array.from(b.subarray(0, 32)),
        runtime:
          format === "wasm"
            ? "WebAssembly"
            : format === "elf"
              ? "ELF loader required"
              : format === "text"
                ? "source analysis"
                : "preserved; decoder required",
      };
    if (format === "elf" && b.length >= 20) {
      r.bits = b[4] === 1 ? 32 : b[4] === 2 ? 64 : null;
      r.machine = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint16(18, b[5] === 1);
    }
    return r;
  }
  // Main-thread RV32I raw instruction interpreter. No host syscalls, bounded memory and fuel.
  function rv32(code, { fuel = 10000, memory = 65536 } = {}) {
    code = bytes(code);
    if (
      !Number.isInteger(fuel) ||
      fuel < 1 ||
      fuel > 1000000 ||
      !Number.isInteger(memory) ||
      memory < code.length ||
      memory > 16777216
    )
      throw Error("Invalid limits");
    const m = new Uint8Array(memory);
    m.set(code);
    const d = new DataView(m.buffer),
      r = new Int32Array(32);
    let pc = 0,
      steps = 0;
    const sx = (v, n) => (v << (32 - n)) >> (32 - n);
    const addr = (a, n) => {
      a >>>= 0;
      if (a + n > m.length || a % n) throw Error("Memory bounds/alignment");
      return a;
    };
    while (steps++ < fuel) {
      let w = d.getUint32(addr(pc, 4), true),
        op = w & 127,
        rd = (w >>> 7) & 31,
        f = (w >>> 12) & 7,
        a = r[(w >>> 15) & 31],
        b = r[(w >>> 20) & 31],
        imm = w >> 20,
        next = (pc + 4) >>> 0,
        v;
      switch (op) {
        case 0x13:
          switch (f) {
            case 0:
              v = a + imm;
              break;
            case 4:
              v = a ^ imm;
              break;
            case 6:
              v = a | imm;
              break;
            case 7:
              v = a & imm;
              break;
            case 2:
              v = +(a < imm);
              break;
            case 3:
              v = +(a >>> 0 < imm >>> 0);
              break;
            case 1:
              if (w >>> 25) throw Error("Unsupported shift");
              v = a << (imm & 31);
              break;
            case 5:
              if (![0, 32].includes(w >>> 25)) throw Error("Unsupported shift");
              v = (w >>> 30) & 1 ? a >> (imm & 31) : a >>> (imm & 31);
              break;
          }
          break;
        case 0x33: {
          let h = w >>> 25;
          if (h !== 0 && !(h === 32 && (f === 0 || f === 5))) throw Error("Unsupported extension");
          v = [
            () => (h ? a - b : a + b),
            () => a << (b & 31),
            () => +(a < b),
            () => +(a >>> 0 < b >>> 0),
            () => a ^ b,
            () => (h ? a >> (b & 31) : a >>> (b & 31)),
            () => a | b,
            () => a & b,
          ][f]();
          break;
        }
        case 0x37:
          v = w & 0xfffff000;
          break;
        case 0x17:
          v = pc + (w & 0xfffff000);
          break;
        case 0x03: {
          let p = a + imm;
          switch (f) {
            case 0:
              v = d.getInt8(addr(p, 1));
              break;
            case 1:
              v = d.getInt16(addr(p, 2), true);
              break;
            case 2:
              v = d.getInt32(addr(p, 4), true);
              break;
            case 4:
              v = d.getUint8(addr(p, 1));
              break;
            case 5:
              v = d.getUint16(addr(p, 2), true);
              break;
            default:
              throw Error("Unsupported load");
          }
          break;
        }
        case 0x23: {
          let p = a + sx(((w >>> 25) << 5) | ((w >>> 7) & 31), 12);
          if (f === 0) d.setInt8(addr(p, 1), b);
          else if (f === 1) d.setInt16(addr(p, 2), b, true);
          else if (f === 2) d.setInt32(addr(p, 4), b, true);
          else throw Error("Unsupported store");
          break;
        }
        case 0x63: {
          let i = sx(
            ((w >>> 31) << 12) |
              (((w >>> 7) & 1) << 11) |
              (((w >>> 25) & 63) << 5) |
              (((w >>> 8) & 15) << 1),
            13,
          );
          let c = [
            a === b,
            a !== b,
            null,
            null,
            a < b,
            a >= b,
            a >>> 0 < b >>> 0,
            a >>> 0 >= b >>> 0,
          ][f];
          if (c === null) throw Error("Unsupported branch");
          if (c) next = (pc + i) >>> 0;
          break;
        }
        case 0x6f:
          v = next;
          next =
            (pc +
              sx(
                ((w >>> 31) << 20) |
                  (((w >>> 12) & 255) << 12) |
                  (((w >>> 20) & 1) << 11) |
                  (((w >>> 21) & 1023) << 1),
                21,
              )) >>>
            0;
          break;
        case 0x67:
          if (f) throw Error("Unsupported jalr");
          v = next;
          next = (a + imm) & ~1;
          break;
        case 0x73:
          if (w === 0x00100073)
            return { status: "breakpoint", steps, registers: Array.from(r), result: r[10] };
          throw Error("System calls not provided");
        default:
          throw Error("Unsupported instruction " + w.toString(16));
      }
      if (v !== undefined && rd) r[rd] = v;
      pc = next >>> 0;
    }
    throw Error("Instruction budget exhausted");
  }
  async function wasm(x, name, args = []) {
    const b = bytes(x);
    if (identify(b) !== "wasm") throw Error("Not WebAssembly");
    const mod = await WebAssembly.compile(b);
    if (WebAssembly.Module.imports(mod).length) throw Error("Host imports not permitted");
    const instance = await WebAssembly.instantiate(mod);
    if (typeof instance.exports[name] !== "function") throw Error("Export not found");
    return { result: instance.exports[name](...args), exports: WebAssembly.Module.exports(mod) };
  }
  const api = { identify, inspect, rv32, wasm };
  if (typeof module !== "undefined") module.exports = api;
  else g.Universal = api;
})(globalThis);
