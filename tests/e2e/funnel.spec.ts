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
    // Scoped to the hero upload card rather than the body. A body-level match is satisfied
    // by the footer, which is how /app passed this assertion while showing the customer no
    // price at all next to the uploader.
    // The hero upload card is rendered twice — once for the mobile column, once for the
    // desktop one — so the assertion targets whichever is actually on screen. Exactly one
    // should be, at any viewport.
    const heroOffer = page.getByTestId("hero-offer").locator("visible=true");
    await expect(heroOffer).toHaveCount(1);
    await expect(heroOffer).toContainText("$19");
    await expect(page.getByText("Statement Reconcile").first()).toBeVisible();
    await expect(page).toHaveTitle(/Bank Statement.*Excel.*CSV/i);

    const copy = (await page.locator("body").innerText()).toLowerCase();
    expect(copy).not.toContain("testimonial");
    expect(copy).not.toContain("what our customers say");
    expect(copy).not.toMatch(/\b5 stars\b/);
  });

  test("/app states the price beside the uploader, before any file is chosen", async ({ page }) => {
    await page.goto("/app");

    // The offer has to be readable where the customer is looking — next to the dropzone,
    // not in a footer they would have to scroll past the fold to reach.
    const offer = page.getByTestId("uploader-offer");
    await expect(offer).toBeVisible();
    await expect(offer).toContainText("$19");
    await expect(offer).toContainText(/no signup/i);
    await expect(offer).toContainText(/no subscription/i);

    // Above the dropzone, and both above the fold at a standard viewport.
    const offerBox = await offer.boundingBox();
    const zoneBox = await page.getByTestId("pdf-input").locator("..").boundingBox();
    expect(offerBox).not.toBeNull();
    expect(zoneBox).not.toBeNull();
    expect(offerBox!.y).toBeLessThan(zoneBox!.y);
    expect(offerBox!.y + offerBox!.height).toBeLessThan(page.viewportSize()!.height);

    // Nothing has been selected yet: the price is pre-commitment, not post-verification.
    await expect(page.getByTestId("paywall-price")).toHaveCount(0);
  });

  test("the paid download page offers a recovery link carrying the session reference", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const pdfPath = syntheticPdfPath();

    await page.goto("/");
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Choose PDF Statements" }).click();
    (await chooserPromise).setFiles(pdfPath);
    await expect(page).toHaveURL(/\/app$/, { timeout: 15_000 });

    await expect(page.getByTestId("checkout-button")).toBeVisible({ timeout: 90_000 });
    await page.getByTestId("checkout-button").click();
    await expect(page.getByTestId("download-xlsx")).toBeVisible({ timeout: 30_000 });

    // Recovery needs the session reference, and the customer is about to leave the only
    // page that has it. If this is missing, "keep your payment reference" is advice nobody
    // can act on.
    const link = page.getByTestId("recovery-link");
    await expect(link).toBeVisible();

    const href = (await link.innerText()).trim();
    const sessionId = new URL(href).searchParams.get("session_id");
    expect(sessionId).toBeTruthy();
    expect(href).toContain("/app?session_id=");

    await page.getByTestId("copy-recovery-link").click();
    await expect(page.getByTestId("copy-recovery-link")).toContainText(/copied/i);

    // The link must actually reach the recovery flow rather than merely look like a URL.
    await page.goto(`/app?session_id=${sessionId}`);
    await expect(page.getByText(/payment recovery is active/i)).toBeVisible({ timeout: 15_000 });
  });

  test("processing routes use processing chrome, not the marketing footer", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByTestId("app-footer")).toBeVisible();
    // The SEO conversion directory must not appear while a statement can be on screen.
    await expect(page.getByTestId("marketing-footer")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Chase Statement to Excel" })).toHaveCount(0);
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);

    await page.goto("/checkout/cancel");
    await expect(page.getByTestId("app-footer")).toBeVisible();
    await expect(page.getByTestId("marketing-footer")).toHaveCount(0);
  });

  test("marketing routes keep the full marketing footer", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("marketing-footer")).toBeVisible();
    await expect(page.getByTestId("app-footer")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Chase Statement to Excel" })).toBeVisible();
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
    await expect(page.getByTestId("lander-offer")).toContainText("$19");
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
    await expect(page.getByTestId("paywall-price")).toContainText("$19");

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

  test("the pdf.js worker is served from our own origin as real JavaScript", async ({
    request,
  }) => {
    /**
     * A11 release guard.
     *
     * `src/lib/client/pdf.ts` pins `workerSrc` to this exact same-origin URL, and
     * `public/pdf.worker.min.mjs` is gitignored — it exists only because the build wrote it.
     * When the build did not, production served a 404 HTML error page at this path and every
     * PDF failed as unreadable. Nothing in the suite noticed, because no test had ever asked
     * for the file.
     *
     * The status assertion is what catches the outage that actually happened: the response
     * was a 404, so `toBe(200)` alone is sufficient for that case.
     *
     * The content-type, HTML, and size assertions cover failures this one did not take, but
     * a neighbouring misconfiguration would. A rewrite or catch-all route can return an HTML
     * error page with a 200 status, and a partial copy or a stub can return a 200 of real
     * JavaScript content type that is far too small to be the worker. Both would serve
     * something at this URL while leaving pdf.js unable to start, which is indistinguishable
     * from the original outage to a customer. The observed 404 body was 65 KB of `text/html`,
     * so a size-only check is not sufficient either.
     */
    const response = await request.get("/pdf.worker.min.mjs");

    expect(response.status(), "the worker must be served, not 404").toBe(200);

    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType, `expected JavaScript, got "${contentType}"`).toMatch(
      /(javascript|ecmascript)/i,
    );
    expect(
      contentType,
      "an HTML error page is what the production failure looked like",
    ).not.toMatch(/text\/html/i);

    const body = await response.body();

    // Big enough to be the real worker. The minified bundle is over a megabyte; a stub, an
    // empty file, or a truncated copy would all be far smaller.
    expect(
      body.byteLength,
      "worker body is too small to be the real pdf.js worker",
    ).toBeGreaterThan(100_000);

    // And it must actually be script, not markup that happens to be large.
    const head = body.subarray(0, 2048).toString("utf8").trimStart();
    expect(head.startsWith("<"), "worker body begins like markup, not JavaScript").toBe(false);
    expect(head).not.toMatch(/<!doctype html|<html[\s>]/i);
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
