/**
 * Copy the PDF.js worker into `public/` so the browser can load it from our own origin.
 *
 * Serving the worker from the application origin keeps the Content-Security-Policy tight:
 * `worker-src 'self'` needs no CDN allowance, and no third-party script is involved in
 * reading the customer's statement.
 *
 * `public/pdf.worker.min.mjs` is gitignored, so it exists only because this script wrote it.
 * It used to be written by `postinstall` alone, which meant a build whose install step was
 * satisfied from cache — Vercel reporting "Already up to date" — never ran it and shipped an
 * application whose `/pdf.worker.min.mjs` returned a 404 HTML page. Every PDF then failed as
 * unreadable. `pnpm run build` now runs this first, so the worker cannot depend on install
 * lifecycle scripts or cache behaviour.
 *
 * `--strict` turns a missing worker into a build failure. Without it the script only warns,
 * which is right for `postinstall` (where `pdfjs-dist` may legitimately not be resolvable
 * yet) and exactly wrong for a build, where warning and continuing is how the broken
 * deployment happened in the first place.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
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
  const strict = process.argv.includes("--strict");
  const source = locateWorker();

  if (!source) {
    if (strict) {
      console.error(
        "[copy-pdf-worker] pdfjs-dist worker not found. Refusing to build: the app would " +
          "serve a 404 for /pdf.worker.min.mjs and every PDF would fail as unreadable.",
      );
      process.exit(1);
    }
    console.warn("[copy-pdf-worker] pdfjs-dist worker not found; skipping.");
    return;
  }

  mkdirSync(dirname(TARGET), { recursive: true });
  copyFileSync(source, TARGET);

  // Verify what was written rather than trusting the copy. A zero-byte or truncated worker
  // would be served as a 200 and fail at runtime instead of at build time.
  const written = statSync(TARGET).size;
  if (written < 1024) {
    console.error(`[copy-pdf-worker] wrote only ${written} bytes to ${TARGET}; refusing.`);
    process.exit(1);
  }

  console.log(`[copy-pdf-worker] wrote ${TARGET} (${written} bytes)`);
}

main();
