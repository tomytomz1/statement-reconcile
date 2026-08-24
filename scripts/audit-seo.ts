/**
 * SEO uniqueness and internal-link audit.
 *
 * Fails the process if two landing pages share a title, meta description, or H1, if a
 * related href does not resolve to a real route, or if an issuer-named page is missing
 * its independence notice. Prints names and slugs only — never secrets.
 */
import { routes, siteConfig } from "@/config/site";
import { footerGroups, seoPages } from "@/content/seo";
import { DESCRIPTION_SOFT_LIMIT, HOMEPAGE_TITLE, TITLE_SOFT_LIMIT } from "@/lib/seo/metadata";

const failures: string[] = [];
const warnings: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function duplicates(values: Array<{ key: string; slug: string }>, label: string): void {
  const seen = new Map<string, string>();
  for (const entry of values) {
    const previous = seen.get(entry.key);
    if (previous) fail(`${label} duplicated between /${previous} and /${entry.slug}`);
    else seen.set(entry.key, entry.slug);
  }
}

duplicates(
  seoPages.map((page) => ({ key: page.title, slug: page.slug })),
  "title",
);
duplicates(
  seoPages.map((page) => ({ key: page.metaDescription, slug: page.slug })),
  "meta description",
);
duplicates(
  seoPages.map((page) => ({ key: page.h1, slug: page.slug })),
  "h1",
);

if (!HOMEPAGE_TITLE.trim()) fail("homepage title constant is empty");
if (seoPages.some((page) => page.title === HOMEPAGE_TITLE)) {
  fail("homepage title constant is not unique against SEO landing pages");
}
if (seoPages.some((page) => page.h1 === siteConfig.primaryOutcome)) {
  fail("homepage H1 is not unique against SEO landing pages");
}

const knownPaths = new Set<string>([
  routes.home,
  routes.app,
  routes.pricing,
  routes.howItWorks,
  routes.security,
  routes.privacy,
  routes.terms,
  routes.refundPolicy,
  routes.faq,
  routes.contact,
  ...seoPages.map((page) => `/${page.slug}`),
]);

for (const page of seoPages) {
  for (const link of page.related) {
    const path = (link.href.split("#")[0] ?? link.href).replace(/\/$/, "") || "/";
    if (!knownPaths.has(path) && !knownPaths.has(link.href)) {
      fail(`/${page.slug} related href does not exist: ${link.href}`);
    }
  }
}

const bankSlugs = new Set<string>(
  footerGroups.find((group) => group.heading === "By bank or issuer")?.slugs ?? [],
);
for (const page of seoPages) {
  if (!bankSlugs.has(page.slug)) continue;
  if (!page.independenceNotice?.trim()) {
    fail(`/${page.slug} is a bank/issuer page without independenceNotice`);
  }
}

for (const page of seoPages) {
  if (page.title.length > TITLE_SOFT_LIMIT) {
    warnings.push(
      `/${page.slug} title is ${page.title.length} characters (soft limit ${TITLE_SOFT_LIMIT})`,
    );
  }
  if (page.metaDescription.length > DESCRIPTION_SOFT_LIMIT) {
    warnings.push(
      `/${page.slug} description is ${page.metaDescription.length} characters (soft limit ${DESCRIPTION_SOFT_LIMIT})`,
    );
  }
}

console.log(`ok    homepage title constant: documented (${HOMEPAGE_TITLE.length} chars)`);
console.log(`ok    ${seoPages.length} SEO landing pages scanned`);

if (warnings.length > 0) {
  console.log("warnings:");
  for (const warning of warnings) console.log(`  ${warning}`);
}

if (failures.length > 0) {
  console.log("failures:");
  for (const failure of failures) console.log(`  ${failure}`);
  process.exit(1);
}

console.log("audit-seo: passed");
