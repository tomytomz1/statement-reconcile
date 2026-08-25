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
  test("homepage has the product H1, CTA, price, brand, and no fake testimonials", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Convert Bank Statements to Excel & CSV",
    );
    await expect(page.getByRole("button", { name: "Check My Statements Free" })).toBeVisible();
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
    const pdfPath = syntheticPdfPath();
    const pdfName = pdfPath.split(/[\\/]/).at(-1) ?? "statement.pdf";

    await page.goto("/");
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Check My Statements Free" }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles(pdfPath);
    await expect(page).toHaveURL(/\/app$/);

    const robots = page.locator('meta[name="robots"][content*="noindex"]');
    await expect(robots).toHaveCount(1);

    await expect(
      page.getByText(/This statement balances|Download verified|Unlock Excel|Unlock for/i).first(),
    ).toBeVisible({ timeout: 90_000 });

    expect(page.url()).not.toContain(encodeURIComponent(pdfName));
    const resourceUrls = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((entry) => entry.name),
    );
    expect(resourceUrls.join("\n")).not.toContain(pdfName);

    const storedBytes = await page.evaluate(async () => {
      const databases = await indexedDB.databases();
      const bytes: number[] = [];
      for (const database of databases) {
        if (!database.name) continue;
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(database.name as string);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        for (const storeName of Array.from(db.objectStoreNames)) {
          if (storeName === "keys") continue;
          const records = await new Promise<unknown[]>((resolve, reject) => {
            const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          for (const record of records) {
            if (!record || typeof record !== "object") continue;
            for (const value of Object.values(record)) {
              if (value instanceof ArrayBuffer) bytes.push(...new Uint8Array(value));
            }
          }
        }
        db.close();
      }
      return bytes;
    });
    const storedAscii = String.fromCharCode(...storedBytes);
    expect(storedAscii).not.toContain("%PDF");
    expect(storedAscii).not.toContain(pdfName);

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
