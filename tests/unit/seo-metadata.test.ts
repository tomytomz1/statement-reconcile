import { describe, expect, it } from "vitest";

import { metadata as homepageMetadata } from "@/app/(site)/page";
import { siteConfig } from "@/config/site";
import { HOMEPAGE_TITLE, pageMetadata } from "@/lib/seo/metadata";

describe("homepage metadata", () => {
  it("uses its complete title without applying the root brand template twice", () => {
    expect(homepageMetadata.title).toEqual({ absolute: HOMEPAGE_TITLE });
  });

  it("treats any already-branded page title as complete", () => {
    const title = `Example | ${siteConfig.brandName}`;
    const metadata = pageMetadata({ title, description: "Example", path: "/example" });

    expect(metadata.title).toEqual({ absolute: title });
  });

  it("leaves unbranded titles for the root template", () => {
    const metadata = pageMetadata({ title: "Example", description: "Example", path: "/example" });

    expect(metadata.title).toBe("Example");
  });
});
