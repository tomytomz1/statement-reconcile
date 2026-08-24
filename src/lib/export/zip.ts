/**
 * Minimal ZIP (store method) for paid pack bundles.
 *
 * Used when a conversion pack contains more than one statement so the customer still
 * receives separate CSV/XLSX/report files. Compression is omitted on purpose: the
 * artefacts are already compact, and a store-only writer has no third-party zip dependency.
 */

export type ZipEntry = {
  name: string;
  data: Uint8Array;
};

const encoder = new TextEncoder();

export function buildZip(entries: readonly ZipEntry[]): Uint8Array {
  if (entries.length === 0) throw new Error("a zip archive needs at least one file");

  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(sanitizeZipName(entry.name));
    const crc = crc32(entry.data);
    const local = concat(
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(entry.data.byteLength),
      u32(entry.data.byteLength),
      u16(nameBytes.byteLength),
      u16(0),
      nameBytes,
      entry.data,
    );
    locals.push(local);

    const central = concat(
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(entry.data.byteLength),
      u32(entry.data.byteLength),
      u16(nameBytes.byteLength),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    );
    centrals.push(central);
    offset += local.byteLength;
  }

  const centralDirectory = concat(...centrals);
  const end = concat(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDirectory.byteLength),
    u32(offset),
    u16(0),
  );

  return concat(...locals, centralDirectory, end);
}

function sanitizeZipName(name: string): string {
  const cleaned = name
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\.\.\//g, "");
  return cleaned.slice(0, 180) || "file.bin";
}

function u16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  bytes[0] = value & 0xff;
  bytes[1] = (value >>> 8) & 0xff;
  return bytes;
}

function u32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  bytes[0] = value & 0xff;
  bytes[1] = (value >>> 8) & 0xff;
  bytes[2] = (value >>> 16) & 0xff;
  bytes[3] = (value >>> 24) & 0xff;
  return bytes;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[index] = crc >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
