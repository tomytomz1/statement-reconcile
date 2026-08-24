/**
 * Write synthetic statement PDFs into fixtures/generated/.
 *
 * These files are fabricated by the layout generator. Real customer statements must never
 * be written here or committed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { generateAllFixtures } from "@/lib/fixtures/generator";
import { writePdf } from "@/lib/fixtures/pdf-writer";

const OUT_DIR = join(process.cwd(), "fixtures", "generated");

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const fixtures = generateAllFixtures(1);
  for (const fixture of fixtures) {
    const pdf = writePdf(fixture.pages);
    writeFileSync(join(OUT_DIR, `${fixture.family}.pdf`), pdf);
  }
  console.log(`wrote ${fixtures.length} synthetic PDFs to fixtures/generated/`);
}

main();
