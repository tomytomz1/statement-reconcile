import { describe, expect, it } from "vitest";

import { seoSlugs } from "@/content/seo";

import { RETIRED_SLUG_REDIRECTS } from "../../next.config";

/**
 * The landing route sets `dynamicParams = false`, so deleting a page's data file turns its
 * URL into a 404 immediately. The redirect table in `next.config.ts` is the only thing
 * standing between a consolidated slug and a dead link, which makes it worth testing as
 * carefully as any other code path.
 */
describe("retired landing page redirects", () => {
  const live = new Set(seoSlugs());
  const sources = RETIRED_SLUG_REDIRECTS.map(([source]) => source);

  it("sends every retired slug to a page that actually exists", () => {
    for (const [source, destination] of RETIRED_SLUG_REDIRECTS) {
      expect(live.has(destination), `/${source} redirects to missing /${destination}`).toBe(true);
    }
  });

  it("never redirects a slug that is still a live page", () => {
    for (const source of sources) {
      expect(live.has(source), `/${source} is both a live page and a redirect source`).toBe(false);
    }
  });

  it("resolves in a single hop", () => {
    // A destination that is itself a source would produce a chain. Search engines follow
    // them, but each hop dilutes the signal and §100 of the PRD forbids them outright.
    const sourceSet = new Set(sources);
    for (const [source, destination] of RETIRED_SLUG_REDIRECTS) {
      expect(sourceSet.has(destination), `/${source} redirects into another redirect`).toBe(false);
    }
  });

  it("declares each retired slug exactly once", () => {
    expect(new Set(sources).size).toBe(sources.length);
  });
});
