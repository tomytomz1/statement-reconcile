import { describe, expect, it } from "vitest";

import {
  findPeriod,
  inferDateOrder,
  isIsoDate,
  isWithinPeriod,
  normalizeDate,
} from "@/lib/dates/normalize";

describe("isIsoDate", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2023-02-29")).toBe(false);
    expect(isIsoDate("2024-13-01")).toBe(false);
    expect(isIsoDate("2024-04-31")).toBe(false);
    expect(isIsoDate("2024-4-1")).toBe(false);
    expect(isIsoDate("not-a-date")).toBe(false);
  });
});

describe("normalizeDate", () => {
  it("handles unambiguous numeric dates", () => {
    expect(normalizeDate("03/15/2024")).toBe("2024-03-15");
    expect(normalizeDate("15/03/2024")).toBe("2024-03-15");
    expect(normalizeDate("2024-03-15")).toBe("2024-03-15");
    expect(normalizeDate("2024/03/15")).toBe("2024-03-15");
    expect(normalizeDate("15.03.2024")).toBe("2024-03-15");
  });

  it("uses the document order hint when both parts could be a month", () => {
    expect(normalizeDate("03/04/2024", { order: "MDY" })).toBe("2024-03-04");
    expect(normalizeDate("03/04/2024", { order: "DMY" })).toBe("2024-04-03");
  });

  it("refuses to guess when the order is unknown", () => {
    expect(normalizeDate("03/04/2024", { order: "unknown" })).toBeNull();
    expect(normalizeDate("03/04/2024")).toBeNull();
  });

  it("resolves a missing year from the statement period", () => {
    const context = { periodStart: "2024-03-01", periodEnd: "2024-03-31", order: "MDY" as const };
    expect(normalizeDate("3/15", context)).toBe("2024-03-15");
    expect(normalizeDate("Mar 15", context)).toBe("2024-03-15");
    expect(normalizeDate("15 Mar", context)).toBe("2024-03-15");
  });

  it("refuses a missing year when the period is unknown", () => {
    expect(normalizeDate("3/15", { order: "MDY" })).toBeNull();
  });

  it("picks the right year across a period that crosses new year", () => {
    const context = { periodStart: "2023-12-20", periodEnd: "2024-01-19" };
    expect(normalizeDate("Dec 28", context)).toBe("2023-12-28");
    expect(normalizeDate("Jan 4", context)).toBe("2024-01-04");
  });

  it("expands two-digit years against the period", () => {
    expect(normalizeDate("03/15/24", { periodEnd: "2024-03-31" })).toBe("2024-03-15");
    expect(normalizeDate("03/15/99", { periodEnd: "1999-03-31" })).toBe("1999-03-15");
  });

  it("rejects impossible dates", () => {
    expect(normalizeDate("02/31/2024")).toBeNull();
    expect(normalizeDate("13/13/2024")).toBeNull();
    expect(normalizeDate("Feb 30, 2024")).toBeNull();
    expect(normalizeDate("00/10/2024")).toBeNull();
  });

  it("accepts long and ordinal month forms", () => {
    expect(normalizeDate("March 15, 2024")).toBe("2024-03-15");
    expect(normalizeDate("15th March 2024")).toBe("2024-03-15");
    expect(normalizeDate("Sept 3, 2024")).toBe("2024-09-03");
  });

  it("rejects junk", () => {
    for (const value of ["", "abc", "1234567890", "5 STAR", "12/", "//", "2024"]) {
      expect(normalizeDate(value), value).toBeNull();
    }
  });
});

describe("inferDateOrder", () => {
  it("detects day-first from a day above twelve", () => {
    expect(inferDateOrder(["01/02/2024", "15/02/2024"])).toBe("DMY");
  });

  it("detects month-first from a day above twelve in second position", () => {
    expect(inferDateOrder(["01/02/2024", "02/15/2024"])).toBe("MDY");
  });

  it("detects ISO", () => {
    expect(inferDateOrder(["2024-02-01", "2024-02-15"])).toBe("YMD");
  });

  it("returns unknown when every date is ambiguous", () => {
    expect(inferDateOrder(["01/02/2024", "03/04/2024"])).toBe("unknown");
  });
});

describe("findPeriod", () => {
  it("reads common period phrasings", () => {
    expect(findPeriod("Statement Period: March 1, 2024 through March 31, 2024")).toEqual({
      start: "2024-03-01",
      end: "2024-03-31",
    });
    expect(findPeriod("01/03/2024 - 31/03/2024")).toEqual({
      start: "2024-03-01",
      end: "2024-03-31",
    });
    expect(findPeriod("Mar 1, 2024 to Mar 31, 2024")).toEqual({
      start: "2024-03-01",
      end: "2024-03-31",
    });
  });

  it("returns null when there is no period", () => {
    expect(findPeriod("Account Number XXXX1234")).toBeNull();
  });

  /**
   * A period whose own two dates are internally ambiguous.
   *
   * `07/09/26 - 08/08/26` has every component <= 12, so month-versus-day cannot be settled
   * from those two dates alone. Without a hint the only honest answer is null. But the rest
   * of the statement usually settles it — a transaction dated `07-15` proves MDY — and the
   * parser computes exactly that. Passing it in is the difference between reading the period
   * and giving up on the document.
   *
   * This mattered: a real statement failed entirely because the period went unread, so no
   * year could be attached to its `MM-DD` transaction dates and every row was discarded.
   */
  it("uses a supplied date order when the period's own dates are ambiguous", () => {
    expect(findPeriod("Statement Period 07/09/26 - 08/08/26")).toBeNull();

    expect(findPeriod("Statement Period 07/09/26 - 08/08/26", "MDY")).toEqual({
      start: "2026-07-09",
      end: "2026-08-08",
    });
    // Read as DMY the same text would start on 7 September and end on 8 August, so the
    // start-before-end check rejects it. A hint widens what can be read; it does not switch
    // off the sanity checks.
    expect(findPeriod("Statement Period 07/09/26 - 08/08/26", "DMY")).toBeNull();

    // A period that is coherent under DMY is read under DMY.
    expect(findPeriod("Statement Period 09/07/26 - 08/08/26", "DMY")).toEqual({
      start: "2026-07-09",
      end: "2026-08-08",
    });
  });

  it("prefers evidence in the period itself over the supplied order", () => {
    // 15 and 20 exceed 12, so the period is self-disambiguating. A wrong hint must not
    // override what the document plainly says.
    expect(findPeriod("Statement Period 07/15/26 - 08/20/26", "DMY")).toEqual({
      start: "2026-07-15",
      end: "2026-08-20",
    });
  });

  it("still refuses when neither the period nor the hint can settle the order", () => {
    expect(findPeriod("Statement Period 07/09/26 - 08/08/26", "unknown")).toBeNull();
  });
});

describe("isWithinPeriod", () => {
  const context = { periodStart: "2024-03-01", periodEnd: "2024-03-31" };

  it("accepts dates inside the period and a small slack", () => {
    expect(isWithinPeriod("2024-03-15", context)).toBe(true);
    expect(isWithinPeriod("2024-02-27", context)).toBe(true);
  });

  it("rejects dates well outside the period", () => {
    expect(isWithinPeriod("2024-01-15", context)).toBe(false);
    expect(isWithinPeriod("2025-03-15", context)).toBe(false);
  });

  it("accepts anything when the period is unknown", () => {
    expect(isWithinPeriod("1999-01-01", {})).toBe(true);
  });
});
