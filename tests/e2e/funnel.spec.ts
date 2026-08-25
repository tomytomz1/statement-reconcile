import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { generateFixture } from "@/lib/fixtures/generator";
import { writePdf } from "@/lib/fixtures/pdf-writer";

let fixtureCounter = 0;

function syntheticPdfPath(family = "checking-debit-credit-balance"): string {
  const bytes = writePdf(generateFixture(family, 1).pages);
  // The counter matters when several fixtures are written inside the same millisecond:
  // colliding names would silently hand the picker the same file more than once.
  fixtureCounter += 1;
  const path = join(tmpdir(), `statement-reconcile-e2e-${Date.now()}-${fixtureCounter}.pdf`);
  writeFileSync(path, bytes);
  return path;
}

test.describe("funnel and public pages", () => {
  test("homepage has an approved H1, CTA, brand, and a visible price", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /Convert PDF Bank Statements|Bank Statement Converter That/,
    );
    await expect(page.getByRole("button", { name: "Choose PDF Statements" })).toBeVisible();
    // The price is stated before a file is chosen: nobody should have to hand a bank
    // statement to an unknown tool to find out what it costs.
    await expect(page.locator("body")).toContainText("$19");
    await expect(page.getByText("Statement Reconcile").first()).toBeVisible();
    await expect(page).toHaveTitle(/Bank Statement.*Excel.*CSV/i);

    const copy = (await page.locator("body").innerText()).toLowerCase();
    expect(copy).not.toContain("testimonial");
    expect(copy).not.toContain("what our customers say");
    expect(copy).not.toMatch(/\b5 stars\b/);
  });

  test("retired landing pages redirect to their survivor in one hop", async ({ page }) => {
    // The unit test proves the redirect table is internally consistent. This proves Next
    // actually serves it — `dynamicParams = false` means a missing redirect is a 404, and a
    // 404 on a consolidated URL is the one outcome this migration had to avoid.
    const response = await page.goto("/pdf-bank-statement-to-excel");

    expect(new URL(page.url()).pathname).toBe("/bank-statement-to-excel");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // The redirect chain, if there were one, would show up as more than a single hop here.
    const chain: string[] = [];
    let hop = response?.request().redirectedFrom() ?? null;
    while (hop) {
      chain.push(new URL(hop.url()).pathname);
      hop = hop.redirectedFrom();
    }
    expect(chain).toEqual(["/pdf-bank-statement-to-excel"]);
  });

  test("SEO landing pages have unique H1s and bank pages disclose independence", async ({
    page,
  }) => {
    await page.goto("/bank-statement-to-excel");
    await expect(page.locator("body")).toContainText("$19");
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
    await page.getByRole("button", { name: "Choose PDF Statements" }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles(pdfPath);
    await expect(page).toHaveURL(/\/app$/, { timeout: 15_000 });

    const robots = page.locator('meta[name="robots"][content*="noindex"]');
    await expect(robots).toHaveCount(1);

    await expect(
      page.getByText(/This statement balances|Download verified|Unlock Excel|Unlock for/i).first(),
    ).toBeVisible({ timeout: 90_000 });
    await expect(page.locator("body")).toContainText("$19");

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

  test("removing a file from a multi-file pack re-assembles it server-side", async ({ page }) => {
    test.setTimeout(120_000);
    // Three different passing layouts, so the pack is not three copies of one document.
    const pdfPaths = [
      syntheticPdfPath("checking-debit-credit-balance"),
      syntheticPdfPath("checking-signed-amount-balance"),
      syntheticPdfPath("savings-with-interest"),
    ];

    await page.goto("/");
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Choose PDF Statements" }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles(pdfPaths);
    await expect(page).toHaveURL(/\/app$/, { timeout: 15_000 });

    // Every file has to pass before checkout is offered at all. The per-file Remove control
    // only renders while more than one file is in the pack, so counting it is an unambiguous
    // read of the pack's size — the surrounding page has several other "N files" strings.
    await expect(page.getByTestId("checkout-button")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(3);
    await expect(page.getByText("VERIFICATION REJECTED")).toHaveCount(0);

    // This is the only path that reaches POST /api/pack. Dropping a file cannot leave the
    // customer holding a digest that covers documents no longer in the pack, so the pack is
    // re-assembled and re-sealed on the server before checkout is offered again.
    const packResponse = page.waitForResponse(
      (response) => response.url().includes("/api/pack") && response.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Remove" }).first().click();
    expect((await packResponse).status()).toBe(200);

    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(2);
    await expect(page.getByTestId("checkout-button")).toBeVisible({ timeout: 30_000 });
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
