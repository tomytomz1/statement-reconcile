import { PAGE_HEIGHT, PAGE_WIDTH, type PlacedPage } from "./layout";

/**
 * Minimal PDF writer for synthetic fixtures.
 *
 * End-to-end tests need real PDF files: the browser upload path, the page-count guard,
 * and the PDF.js text layer are all part of what we ship, and a JSON fixture would skip
 * them. This emits an uncompressed PDF 1.4 with a single Type1 Helvetica font, which is
 * the simplest artefact that a real PDF engine will read as a text-bearing statement.
 *
 * It is deliberately not a general-purpose PDF library and is only used by tests and the
 * fixture script.
 */

const FONT_NAME = "Helvetica";

export function writePdf(pages: readonly PlacedPage[]): Uint8Array {
  if (pages.length === 0) throw new Error("a PDF needs at least one page");

  const chunks: string[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (text: string): void => {
    chunks.push(text);
    length += byteLength(text);
  };

  const startObject = (): void => {
    offsets.push(length);
  };

  push("%PDF-1.4\n");
  // A binary comment marks the file as containing binary data, which keeps naive
  // transports from treating it as text.
  push("%\u00E2\u00E3\u00CF\u00D3\n");

  const pageObjectStart = 4;
  const pageIds = pages.map((_, index) => pageObjectStart + index * 2);
  const contentIds = pages.map((_, index) => pageObjectStart + index * 2 + 1);

  // 1: Catalog
  startObject();
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // 2: Pages
  startObject();
  push(
    `2 0 obj\n<< /Type /Pages /Count ${pages.length} /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] >>\nendobj\n`,
  );

  // 3: Font
  startObject();
  push(
    `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /${FONT_NAME} /Encoding /WinAnsiEncoding >>\nendobj\n`,
  );

  for (const [index, page] of pages.entries()) {
    const pageId = pageIds[index] as number;
    const contentId = contentIds[index] as number;

    startObject();
    push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );

    const content = contentStream(page);
    startObject();
    push(
      `${contentId} 0 obj\n<< /Length ${byteLength(content)} >>\nstream\n${content}endstream\nendobj\n`,
    );
  }

  const xrefOffset = length;
  const objectCount = offsets.length + 1;
  push(`xref\n0 ${objectCount}\n`);
  push("0000000000 65535 f \n");
  for (const offset of offsets) {
    push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return latin1Bytes(chunks.join(""));
}

function contentStream(page: PlacedPage): string {
  const parts: string[] = ["BT\n"];
  let currentSize = -1;
  for (const item of page.items) {
    if (item.size !== currentSize) {
      parts.push(`/F1 ${item.size} Tf\n`);
      currentSize = item.size;
    }
    // PDF user space has its origin at the bottom-left; placed text measures from the top.
    const baseline = PAGE_HEIGHT - item.top - item.size;
    parts.push(`1 0 0 1 ${round(item.x)} ${round(baseline)} Tm\n`);
    parts.push(`(${escapeText(item.text)}) Tj\n`);
  }
  parts.push("ET\n");
  return parts.join("");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function escapeText(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 32;
    if (char === "(" || char === ")" || char === "\\") {
      out += `\\${char}`;
    } else if (code < 32) {
      out += " ";
    } else if (code <= 255) {
      out += char;
    } else {
      // WinAnsiEncoding cannot represent this glyph; fall back to a visible placeholder
      // so the fixture stays byte-safe. Unicode handling is covered by the text-item
      // fixtures, which do not go through PDF encoding.
      out += "?";
    }
  }
  return out;
}

/**
 * Byte length under the Latin-1 encoding used by {@link latin1Bytes}: exactly one byte
 * per UTF-16 code unit. Keeping the two in lockstep is what makes the xref offsets valid.
 */
function byteLength(text: string): number {
  return text.length;
}

function latin1Bytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    bytes[index] = code <= 255 ? code : 63;
  }
  return bytes;
}
