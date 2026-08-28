/**
 * Minimal multi-page text PDF writer for verification reports.
 *
 * Not a general PDF library. Helvetica, WinAnsi, letter pages. Used only for the paid
 * verification report so we do not take a PDF-generation dependency.
 */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const FONT_NAME = "Helvetica";
const LEFT = 54;
const TOP = 54;
const LINE_HEIGHT = 13;
const BODY_SIZE = 10;
// At 13 pt leading, 52 lines leave a 75 pt bottom margin on letter paper. Keeping the
// standard successful report on one page also avoids a single wrapped disclaimer line
// being orphaned on an otherwise blank second page.
const MAX_LINES = 52;

export function writeTextPdf(pages: readonly string[][]): Uint8Array {
  if (pages.length === 0) throw new Error("a PDF needs at least one page");

  const chunks: string[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (text: string): void => {
    chunks.push(text);
    length += text.length;
  };

  const startObject = (): void => {
    offsets.push(length);
  };

  push("%PDF-1.4\n");
  push("%\u00E2\u00E3\u00CF\u00D3\n");

  const pageObjectStart = 4;
  const pageIds = pages.map((_, index) => pageObjectStart + index * 2);
  const contentIds = pages.map((_, index) => pageObjectStart + index * 2 + 1);

  startObject();
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObject();
  push(
    `2 0 obj\n<< /Type /Pages /Count ${pages.length} /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] >>\nendobj\n`,
  );

  startObject();
  push(
    `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /${FONT_NAME} /Encoding /WinAnsiEncoding >>\nendobj\n`,
  );

  for (const [index, lines] of pages.entries()) {
    const pageId = pageIds[index] as number;
    const contentId = contentIds[index] as number;

    startObject();
    push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );

    const content = contentStream(lines);
    startObject();
    push(
      `${contentId} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`,
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

  const text = chunks.join("");
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    bytes[index] = code <= 255 ? code : 63;
  }
  return bytes;
}

export function wrapReportLines(lines: readonly string[], width = 92): string[] {
  const wrapped: string[] = [];
  for (const line of lines) {
    const text = asciiReportText(line).replace(/\s+/g, " ").trimEnd();
    if (text === "") {
      wrapped.push("");
      continue;
    }
    let remaining = text;
    while (remaining.length > width) {
      let breakAt = remaining.lastIndexOf(" ", width);
      if (breakAt < 40) breakAt = width;
      wrapped.push(remaining.slice(0, breakAt));
      remaining = remaining.slice(breakAt).trimStart();
    }
    wrapped.push(remaining);
  }
  return wrapped;
}

/** Helvetica/WinAnsi reports must not silently turn unsupported punctuation into `?`. */
export function asciiReportText(value: string): string {
  return value
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u00B7\u2022]/g, "|")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "[unsupported]");
}

export function paginateLines(lines: readonly string[], max = MAX_LINES): string[][] {
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += max) {
    pages.push([...lines.slice(index, index + max)]);
  }
  return pages.length > 0 ? pages : [[""]];
}

function contentStream(lines: readonly string[]): string {
  const parts: string[] = ["BT\n", `/F1 ${BODY_SIZE} Tf\n`];
  for (const [index, line] of lines.entries()) {
    const baseline = PAGE_HEIGHT - TOP - index * LINE_HEIGHT;
    parts.push(`1 0 0 1 ${LEFT} ${round(baseline)} Tm\n`);
    parts.push(`(${escapeText(line)}) Tj\n`);
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
    if (char === "(" || char === ")" || char === "\\") out += `\\${char}`;
    else if (code < 32) out += " ";
    else if (code <= 255) out += char;
    else out += "?";
  }
  return out;
}
