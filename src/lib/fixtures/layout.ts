import type { ExtractedPdfText, PdfPageText, PdfTextItem } from "@/lib/extraction/types";

import { textWidth } from "./helvetica";

/**
 * A page of positioned text, shared by the two fixture outputs.
 *
 * The same placed-text model is converted into (a) the positioned text items the parser
 * consumes, and (b) real PDF bytes for end-to-end tests. Using one model for both means a
 * fixture cannot pass the unit tests while being unreadable as a PDF.
 */

export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;
export const MARGIN = 54;

export type PlacedText = {
  text: string;
  /** Left edge, in PDF user-space units. */
  x: number;
  /** Distance from the top of the page. */
  top: number;
  size: number;
};

export type PlacedPage = {
  items: PlacedText[];
};

export class PageBuilder {
  readonly pages: PlacedPage[] = [];
  private current: PlacedPage = { items: [] };
  private cursor = MARGIN;

  constructor(readonly defaultSize = 9) {
    this.pages.push(this.current);
  }

  get top(): number {
    return this.cursor;
  }

  get pageIndex(): number {
    return this.pages.length - 1;
  }

  get remaining(): number {
    return PAGE_HEIGHT - MARGIN - this.cursor;
  }

  newPage(): void {
    this.current = { items: [] };
    this.pages.push(this.current);
    this.cursor = MARGIN;
  }

  advance(amount: number): void {
    this.cursor += amount;
  }

  left(text: string, x: number, size = this.defaultSize): void {
    if (text === "") return;
    this.current.items.push({ text, x, top: this.cursor, size });
  }

  /** Place text so that its right edge lands on `right`, as amount columns do. */
  right(text: string, right: number, size = this.defaultSize): void {
    if (text === "") return;
    this.current.items.push({ text, x: right - textWidth(text, size), top: this.cursor, size });
  }

  centered(text: string, size = this.defaultSize): void {
    if (text === "") return;
    const x = (PAGE_WIDTH - textWidth(text, size)) / 2;
    this.current.items.push({ text, x, top: this.cursor, size });
  }

  /** Place text at an absolute vertical offset without moving the cursor. */
  absolute(text: string, x: number, top: number, size = this.defaultSize): void {
    if (text === "") return;
    this.current.items.push({ text, x, top, size });
  }
}

/**
 * Convert placed text into the payload the browser would send.
 *
 * `w` and `h` mirror what a PDF text layer reports: advance width and glyph height.
 * Values are rounded the same way the client rounds them, so fixture-driven tests
 * exercise the same numeric precision as production.
 */
export function toExtractedPdfText(pages: readonly PlacedPage[]): ExtractedPdfText {
  const converted: PdfPageText[] = pages.map((page, index) => ({
    page: index + 1,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    items: page.items.map<PdfTextItem>((item) => ({
      t: item.text,
      x: round(item.x),
      y: round(item.top),
      w: round(textWidth(item.text, item.size)),
      h: round(item.size),
    })),
  }));
  return { pageCount: converted.length, pages: converted };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
