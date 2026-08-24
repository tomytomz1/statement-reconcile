import type { ExtractedPdfText, PdfPageText, PdfTextItem, StatementLine } from "../types";

/**
 * Reconstruct visual lines from positioned PDF text items.
 *
 * A PDF text layer has no concept of a line or a table cell: it is a bag of positioned
 * text runs. Statements are tables, so column positions carry meaning (a number in the
 * "Deposits" column is a credit). Grouping runs by vertical position and keeping their
 * horizontal offsets preserves the only structural signal available.
 *
 * `y` is measured from the top of the page, so larger values are further down.
 */

/** Two items belong to the same line when their baselines are within this fraction of glyph height. */
const LINE_TOLERANCE_RATIO = 0.6;
const MIN_LINE_TOLERANCE = 1.5;

/** A horizontal gap wider than this fraction of the glyph height starts a new cell. */
const CELL_GAP_RATIO = 0.9;

export function medianHeight(items: readonly PdfTextItem[]): number {
  const heights = items
    .map((item) => item.h ?? 0)
    .filter((height) => height > 0)
    .sort((a, b) => a - b);
  if (heights.length === 0) return 10;
  const middle = Math.floor(heights.length / 2);
  return heights[middle] ?? 10;
}

export function buildPageLines(page: PdfPageText): StatementLine[] {
  const items = page.items.filter((item) => item.t.trim() !== "");
  if (items.length === 0) return [];

  const height = medianHeight(items);
  const tolerance = Math.max(MIN_LINE_TOLERANCE, height * LINE_TOLERANCE_RATIO);

  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const groups: PdfTextItem[][] = [];
  let current: PdfTextItem[] = [];
  let anchorY = Number.NaN;

  for (const item of sorted) {
    if (current.length === 0 || Math.abs(item.y - anchorY) <= tolerance) {
      if (current.length === 0) anchorY = item.y;
      current.push(item);
    } else {
      groups.push(current);
      current = [item];
      anchorY = item.y;
    }
  }
  if (current.length > 0) groups.push(current);

  return groups.map((group) => toLine(group, page.page, height));
}

function toLine(group: PdfTextItem[], page: number, glyphHeight: number): StatementLine {
  const ordered = [...group].sort((a, b) => a.x - b.x);
  const gapThreshold = Math.max(1.5, glyphHeight * CELL_GAP_RATIO);

  const cells: StatementLine["cells"] = [];
  for (const [index, item] of ordered.entries()) {
    const text = item.t.replace(/\s+/g, " ");
    const width = item.w ?? estimateWidth(text, glyphHeight);
    const height = item.h && item.h > 0 ? item.h : glyphHeight;
    const itemId =
      item.id ??
      `p${page}x${Math.round(item.x * 10)}y${Math.round(item.y * 10)}i${index}`.slice(0, 40);
    const last = cells[cells.length - 1];
    if (last) {
      const gap = item.x - (last.x + last.width);
      if (gap <= gapThreshold) {
        const joiner = gap > glyphHeight * 0.15 && !last.text.endsWith(" ") ? " " : "";
        last.text = `${last.text}${joiner}${text}`;
        last.width = item.x + width - last.x;
        last.height = Math.max(last.height, height);
        last.itemIds.push(itemId);
        continue;
      }
    }
    cells.push({ text, x: item.x, width, y: item.y, height, itemIds: [itemId] });
  }

  const trimmed = cells
    .map((cell) => ({ ...cell, text: cell.text.trim() }))
    .filter((cell) => cell.text !== "");

  const y = Math.min(...group.map((item) => item.y));
  const height = Math.max(...group.map((item) => item.h ?? glyphHeight), glyphHeight);

  return {
    page,
    y,
    height,
    text: trimmed
      .map((cell) => cell.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
    cells: trimmed,
  };
}

function estimateWidth(text: string, glyphHeight: number): number {
  return text.length * glyphHeight * 0.5;
}

export function buildDocumentLines(document: ExtractedPdfText): StatementLine[] {
  return [...document.pages]
    .sort((a, b) => a.page - b.page)
    .flatMap((page) => buildPageLines(page));
}

/** Whole-document plain text, used only for keyword and period detection. */
export function documentText(lines: readonly StatementLine[]): string {
  return lines.map((line) => line.text).join("\n");
}

/** Right edge of a cell, which is where amount columns align. */
export function cellRight(cell: { x: number; width: number }): number {
  return cell.x + cell.width;
}
