/**
 * Helvetica glyph advance widths, in 1/1000 em, for the printable ASCII range.
 *
 * The synthetic fixture generator needs real metrics for two reasons: right-aligned
 * amount columns must actually line up in the emitted PDF, and the positioned text items
 * handed to the parser must match what a PDF engine would report for the same page.
 * Approximating widths would produce fixtures that only the fixture generator can parse.
 */

const WIDTHS_32_126 = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
  611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
  222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
] as const;

/** Latin-1 supplement widths that appear in fixture descriptions (accents, symbols). */
const WIDTHS_160_255: Record<number, number> = {
  160: 278,
  161: 333,
  162: 556,
  163: 556,
  164: 556,
  165: 556,
  169: 737,
  174: 737,
  176: 400,
  180: 333,
  183: 278,
  191: 611,
  192: 667,
  193: 667,
  196: 667,
  199: 722,
  200: 667,
  201: 667,
  202: 667,
  214: 778,
  220: 722,
  223: 611,
  224: 556,
  225: 556,
  226: 556,
  227: 556,
  228: 556,
  229: 556,
  231: 500,
  232: 556,
  233: 556,
  234: 556,
  235: 556,
  237: 278,
  241: 556,
  243: 556,
  244: 556,
  246: 556,
  250: 556,
  252: 556,
};

const DEFAULT_WIDTH = 556;

export function glyphWidth(codePoint: number): number {
  if (codePoint >= 32 && codePoint <= 126) {
    return WIDTHS_32_126[codePoint - 32] ?? DEFAULT_WIDTH;
  }
  return WIDTHS_160_255[codePoint] ?? DEFAULT_WIDTH;
}

/** Advance width of a string at a given font size, in PDF user-space units. */
export function textWidth(text: string, fontSize: number): number {
  let total = 0;
  for (const char of text) {
    total += glyphWidth(char.codePointAt(0) ?? 32);
  }
  return (total / 1000) * fontSize;
}
