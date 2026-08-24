import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { generateFixture } from "@/lib/fixtures/generator";
import { writePdf } from "@/lib/fixtures/pdf-writer";

function syntheticPdfPath(): string {
  const bytes = writePdf(generateFixture("checking-debit-credit-balance", 1).pages);
  const path = join(tmpdir(), `statement-reconcile-e2e-${Date.now()}.pdf`);
  writeFileSync(path, bytes);
  return path;
}

test.describe("funnel and public pages", () => {
  test("homepage has the category H1, CTA, price, brand, and no fake testimonials", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Convert Bank Statements to Excel & CSV",
    );
    await expect(
      page.getByRole("link", { name: "Convert My Bank Statement" }).first(),
    ).toBeVisible();
    await expect(page.locator("body")).toContainText("$19");
    await expect(page.getByText("Statement Reconcile").first()).toBeVisible();
    await expect(page).toHaveTitle(/Bank Statement.*Excel.*CSV/i);

    const copy = (await page.locator("body").innerText()).toLowerCase();
    expect(copy).not.toContain("testimonial");
    expect(copy).not.toContain("what our customers say");
    expect(copy).not.toMatch(/\b5 stars\b/);
  });

  test("SEO landing pages have unique H1s and bank pages disclose independence", async ({
    page,
  }) => {
    await page.goto("/bank-statement-to-excel");
    const excelH1 = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
    expect(excelH1.length).toBeGreaterThan(0);
    expect(excelH1).not.toBe("Convert Bank Statements to Excel & CSV");

    await page.goto("/chase-statement-to-excel");
    const chaseH1 = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
    expect(chaseH1).not.toBe(excelH1);
    await expect(page.getByText(/not affiliated/i).first()).toBeVisible();
  });

  test("app is noindex and the mock-pay funnel reaches download", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/app");
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/i);

    await page.getByTestId("pdf-input").setInputFiles(syntheticPdfPath());
    await expect(
      page.getByText(/This statement balances|Download verified|Unlock Excel|Unlock for/i).first(),
    ).toBeVisible({ timeout: 90_000 });

    await page.getByTestId("checkout-button").click();
    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 30_000 });
    await expect(page.getByTestId("download-xlsx")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("download-csv")).toBeVisible();
  });

  test("checkout cancel page loads", async ({ page }) => {
    await page.goto("/checkout/cancel");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Checkout cancelled");
  });

  test("privacy, terms, and refund pages exist", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy Policy");
    await page.goto("/terms");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms of Service");
    await page.goto("/refund-policy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Refund Policy");
  });

  test("homepage has no serious or critical axe violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious).toEqual([]);
  });

  test("robots.txt disallows app and checkout; sitemap covers marketing pages only", async ({
    request,
  }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    const robotsText = await robots.text();
    expect(robotsText).toMatch(/Disallow:\s*\/app/);
    expect(robotsText).toMatch(/Disallow:\s*\/checkout/);

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    const xml = await sitemap.text();
    expect(xml).toContain("bank-statement-to-excel");
    expect(xml).toMatch(/<loc>[^<]*\/<\/loc>|<loc>[^<]*\/\/[^/]+<\/loc>/);
    expect(xml).not.toContain("/app");
    expect(xml).not.toContain("/checkout");
  });
});
