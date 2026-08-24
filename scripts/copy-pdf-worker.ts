/**
 * Copy the PDF.js worker into `public/` so the browser can load it from our own origin.
 *
 * Serving the worker from the application origin keeps the Content-Security-Policy tight:
 * `worker-src 'self'` needs no CDN allowance, and no third-party script is involved in
 * reading the customer's statement.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);

const TARGET = resolve(process.cwd(), "public", "pdf.worker.min.mjs");

const CANDIDATES = [
  "pdfjs-dist/build/pdf.worker.min.mjs",
  "pdfjs-dist/build/pdf.worker.mjs",
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
];

function locateWorker(): string | null {
  for (const candidate of CANDIDATES) {
    try {
      return require.resolve(candidate);
    } catch {
      continue;
    }
  }
  // Fall back to walking the package directory, in case the export map changes.
  try {
    const packageJson = require.resolve("pdfjs-dist/package.json");
    const buildDir = join(dirname(packageJson), "build");
    for (const name of ["pdf.worker.min.mjs", "pdf.worker.mjs"]) {
      const candidate = join(buildDir, name);
      if (existsSync(candidate)) return candidate;
    }
  } catch {
    // pdfjs-dist is not installed yet.
  }
  return null;
}

function main(): void {
  const source = locateWorker();
  if (!source) {
    console.warn("[copy-pdf-worker] pdfjs-dist worker not found; skipping.");
    return;
  }
  mkdirSync(dirname(TARGET), { recursive: true });
  copyFileSync(source, TARGET);
  console.log(`[copy-pdf-worker] wrote ${TARGET}`);
}

main();
