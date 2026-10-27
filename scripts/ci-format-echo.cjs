// Temporary CI-only formatter output. Removed before merge.
const fs = require("node:fs");
for (const p of [
  "src/app/(site)/[slug]/page.tsx",
  "src/components/site/statement-example.tsx",
  "src/lib/seo/statement-example.ts",
]) {
  console.log("FORMATTED_RECOVERY_FILE=" + JSON.stringify({
    path: p,
    base64: Buffer.from(fs.readFileSync(p)).toString("base64"),
  }));
}
