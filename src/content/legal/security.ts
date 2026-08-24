import type { LegalDocument } from "./types";

export const securityPolicy: LegalDocument = {
  slug: "security",
  title: "Security | Statement Reconcile",
  metaDescription:
    "How Statement Reconcile removes risk instead of managing it: no accounts, no stored statements, no PDF upload, a strict CSP, and a verified, paid-only export gate.",
  h1: "Security",
  lastUpdated: "2026-08-24",
  summary: [
    "This page describes how the service is built to be safe, in enough detail that you can judge the claims rather than take them on trust.",
    "The theme throughout is removing risk instead of mitigating it. The safest way to protect a stored statement is not to store one.",
  ],
  plainEnglish: [
    "There are no accounts, so there are no passwords to steal.",
    "There are no stored statements, so there is no archive to breach.",
    "Your PDF is never uploaded, so it cannot be intercepted or left behind on a server.",
    "Card details are entered on Stripe's own page and never reach our code.",
  ],
  sections: [
    {
      id: "design-decisions",
      heading: "Decisions that remove risk rather than manage it",
      blocks: [
        {
          kind: "paragraph",
          text: "Most security pages describe controls layered over a risky design. The controls below matter, but the important work was done earlier, by not creating the risk.",
        },
        {
          kind: "definitions",
          items: [
            {
              term: "No accounts",
              definition:
                "There is no sign-up, no password, and no session to hijack. There are no credentials to phish, leak, reuse, or reset, and no account takeover is possible because there is no account.",
            },
            {
              term: "No stored statements",
              definition:
                "There is no database, no object storage, and no file written on our side. Extracted statement text lives in the memory of a single request and goes out of scope when the response is sent. There is no archive to exfiltrate and no backup to leak.",
            },
            {
              term: "No PDF upload",
              definition:
                "The PDF is opened and read in your browser with pdf.js. The file never reaches our infrastructure, so it cannot be intercepted in transit to us, mishandled in a temporary directory, or forgotten in a bucket.",
            },
            {
              term: "No payment data",
              definition:
                "Card details are entered on Stripe's hosted page. Our code never sees a card number, so there is nothing card-related for an attack on us to reach.",
            },
          ],
        },
        {
          kind: "callout",
          tone: "verified",
          text: "The practical consequence: a full compromise of our application would expose no stored statements, no credentials, and no card data, because none of those exist here.",
        },
      ],
    },
    {
      id: "transport-and-headers",
      heading: "Transport and browser headers",
      blocks: [
        {
          kind: "bullets",
          items: [
            "HTTPS everywhere. Plain HTTP requests are redirected and the site is served only over TLS.",
            "HTTP Strict Transport Security, so a browser that has seen the site once will refuse to connect to it insecurely again.",
            "A strict Content-Security-Policy. The processing route loads no third-party script at all, which is what makes the in-browser handling of your statement meaningful.",
            "X-Content-Type-Options: nosniff, so a response cannot be reinterpreted as a different content type.",
            "A restrictive Referrer-Policy, so URLs from this site are not leaked to other origins.",
            "Frame denial, so the site cannot be embedded in another page and used for clickjacking.",
          ],
        },
        {
          kind: "paragraph",
          text: "The Content-Security-Policy is the load-bearing one. Any script that runs on our origin can see what the page can see. Keeping third-party script off the route where your statement is processed is the reason that route is trustworthy.",
        },
      ],
    },
    {
      id: "the-sealed-result",
      heading: "The sealed result, and what it does and does not protect",
      blocks: [
        {
          kind: "paragraph",
          text: "After parsing, the full result is returned to your browser as a sealed envelope. It is held in IndexedDB, encrypted at rest with an AES-256-GCM key generated on your device and marked non-extractable, so the key material cannot be read out by page script. The envelope expires after 60 minutes and there is a control that deletes it immediately.",
        },
        {
          kind: "paragraph",
          text: "It is worth being precise about what this design achieves.",
        },
        {
          kind: "definitions",
          items: [
            {
              term: "What it protects",
              definition:
                "Your converted result at rest on your own device. Another site cannot read it, and a casual inspection of browser storage does not reveal your transactions. It also bounds exposure in time: after an hour, the data is gone whether or not you remembered to delete it.",
            },
            {
              term: "What it also achieves",
              definition:
                "It makes the paywall real rather than cosmetic. The full result is sealed, so it cannot simply be lifted out of the page before payment. The file is generated server-side only after payment is verified.",
            },
            {
              term: "What it does not protect against",
              definition:
                "Script running on our own origin. A non-extractable key stops the key being copied, but any code executing on the page could still ask the browser to use it. That is precisely why the Content-Security-Policy is strict and why no third-party script runs on the processing route. Nor does it protect a device that is already compromised by malware.",
            },
          ],
        },
      ],
    },
    {
      id: "payment-isolation",
      heading: "Payment isolation",
      blocks: [
        {
          kind: "paragraph",
          text: "Payments go through Stripe Checkout. You are sent to Stripe's own hosted page to enter card details, and those details never touch our servers or our code. We create no Stripe Customer object, so there is no stored payment profile linked to you.",
        },
        {
          kind: "paragraph",
          text: "The only metadata attached to a Checkout Session is a SHA-256 digest of the converted result, an opaque job id, the page count, the transaction count, and the product and schema versions. No balance, bank name, account number, description, statement date, or filename is sent to Stripe.",
        },
        {
          kind: "callout",
          tone: "neutral",
          text: "Stripe is a PCI-compliant payment provider. We make no PCI claim of our own — we are out of scope for it because we never see, handle, or transmit card data.",
        },
      ],
    },
    {
      id: "export-gate",
      heading: "The export gate",
      blocks: [
        {
          kind: "paragraph",
          text: "Before any file is produced, three checks must pass in order. All three run on the server; none can be satisfied from the browser alone.",
        },
        {
          kind: "numbered",
          items: [
            "Live verification with Stripe. We ask Stripe directly whether the Checkout Session is paid. A session id presented by the browser proves nothing on its own.",
            "Constant-time digest comparison. The SHA-256 digest recorded on the paid session is compared against a digest of the data presented for export, using a constant-time comparison so the check cannot be probed by timing. Data that does not match what was paid for is refused.",
            "Reconciliation re-run. The reconciliation engine runs again over the presented data. If it does not balance now, no file is generated, regardless of payment status.",
          ],
        },
        {
          kind: "paragraph",
          text: "Together these mean a paid session cannot be pointed at different data, an unpaid session cannot produce a file, and a file is never generated from figures that do not reconcile.",
        },
      ],
    },
    {
      id: "formula-injection",
      heading: "Spreadsheet formula injection",
      blocks: [
        {
          kind: "paragraph",
          text: "A transaction description is attacker-controlled text as far as a spreadsheet is concerned. If a description begins with an equals sign, a plus, a minus, an at sign, or certain control characters, Excel and other spreadsheet applications may treat the cell as a formula and execute it when the file is opened.",
        },
        {
          kind: "paragraph",
          text: "Every text field we write is neutralised against this before it reaches the file, in both the CSV and the XLSX output. Dangerous leading characters are defused so the cell is stored and displayed as text, and quoting and escaping are applied so a value cannot break out of its field.",
        },
        {
          kind: "callout",
          tone: "neutral",
          text: "The visible text of your descriptions is preserved. The change is to how the spreadsheet interprets the cell, not to what it says.",
        },
      ],
    },
    {
      id: "rate-limiting",
      heading: "Rate limiting and abuse controls",
      blocks: [
        {
          kind: "bullets",
          items: [
            "Request rate limits protect the parsing and export endpoints from automated bulk use.",
            "Where rate limiting is backed by Upstash Redis on a deployment, the counters hold only a hashed client identifier and a request count. No statement content is involved.",
            "Hard input limits are enforced server-side as well as in the browser: 50 pages and 20 MB per file, plus bounds on the size of the extracted text payload.",
            "Malformed or oversized payloads are rejected early, before parsing begins.",
            "The service is built for one human-initiated conversion pack at a time. Scripted bulk use is not permitted and is blocked where detected.",
          ],
        },
      ],
    },
    {
      id: "logging-discipline",
      heading: "Logging discipline",
      blocks: [
        {
          kind: "paragraph",
          text: "Logs are a common place for sensitive data to leak, so the logging vocabulary is deliberately narrow: event names, coarse counts, enum values, booleans, and error codes.",
        },
        {
          kind: "bullets",
          items: [
            "Statement text, descriptions, amounts, balances, and filenames are never logged.",
            "Provider request and response payloads are never logged.",
            "Exception messages are not logged. Only the exception's constructor name is recorded, because an exception message can quote the value that caused it.",
          ],
        },
      ],
    },
    {
      id: "dependencies",
      heading: "Dependencies and supply chain",
      blocks: [
        {
          kind: "bullets",
          items: [
            "The dependency set is kept deliberately small. Every package added is another party that can ship code into the build.",
            "Dependencies are pinned by a lockfile, so builds are reproducible and a version cannot change underneath us.",
            "Automated advisory checks run against the dependency tree, and security updates are applied promptly.",
            "The strict Content-Security-Policy limits the damage a compromised front-end dependency could do, because it cannot load or contact arbitrary origins.",
            "No third-party analytics, advertising, or tag-manager script runs on the route where your statement is processed.",
          ],
        },
      ],
    },
    {
      id: "what-we-do-not-claim",
      heading: "What we do not claim",
      blocks: [
        {
          kind: "paragraph",
          text: "It is easy to imply certifications by listing acronyms. We would rather state the position plainly.",
        },
        {
          kind: "bullets",
          items: [
            "We are not SOC 2 audited and we hold no ISO 27001 certification.",
            "We hold no PCI-DSS certification of our own. Stripe is PCI-compliant; we are out of scope because card data never reaches us.",
            "We have not commissioned a third-party penetration test.",
            "We do not run a bug bounty programme and we do not pay for reports.",
            "We make no HIPAA claim, and the service is not intended for protected health information.",
            "We carry no cyber-liability insurance that would back a claim against us.",
          ],
        },
        {
          kind: "callout",
          tone: "neutral",
          text: "What we offer instead is a design you can reason about: no accounts, no stored statements, no uploaded files, and no card data. Those are checkable properties, not assurances.",
        },
      ],
    },
    {
      id: "responsible-disclosure",
      heading: "Responsible disclosure",
      blocks: [
        {
          kind: "paragraph",
          text: "If you find a security problem, report it to {{securityEmail}}. Please include enough detail to reproduce it: the affected URL or endpoint, the steps you took, and what you observed. We aim to acknowledge a report within 2 business days and will tell you honestly what we intend to do and roughly when.",
        },
        {
          kind: "paragraph",
          text: "In scope:",
        },
        {
          kind: "bullets",
          items: [
            "Any way to obtain a converted file without a verified paid Stripe session.",
            "Any way to make the export gate accept data that does not match the paid digest, or that does not reconcile.",
            "Any way to read another person's sealed result, or to extract the encryption key from the browser.",
            "Cross-site scripting, Content-Security-Policy bypasses, or any injection of script onto our origin.",
            "Server-side vulnerabilities in the parsing or export endpoints, including denial of service through crafted input.",
            "Formula injection or escaping failures that survive into the CSV or XLSX output.",
            "Any leak of statement content into logs, URLs, referrers, or third-party requests.",
          ],
        },
        {
          kind: "paragraph",
          text: "Out of scope:",
        },
        {
          kind: "bullets",
          items: [
            "Reports produced only by automated scanners, with no demonstrated impact.",
            "Missing headers or configuration hardening with no exploitable consequence.",
            "Volumetric denial-of-service traffic, load testing, or stress testing of any kind.",
            "Social engineering of us or of anyone who works with us, and physical attacks.",
            "Vulnerabilities in Stripe, Vercel, or another third party. Report those to that provider.",
            "Weaknesses that require a device already compromised by malware, or a browser that is out of date.",
            "Email configuration findings such as SPF, DKIM, or DMARC policy, absent a working attack.",
          ],
        },
        {
          kind: "callout",
          tone: "caution",
          text: "Test only against your own data and your own payments. Do not access anyone else's data, do not degrade the service for other users, and do not run bulk or automated scanning. If you encounter someone else's data, stop and tell us.",
        },
        {
          kind: "paragraph",
          text: "If you follow those rules, we will not pursue legal action against you, and we will not ask your hosting provider or employer to. We will credit you publicly if you would like that. We cannot offer payment: there is no bug bounty programme and no reward budget, and we would rather say so than imply one.",
        },
      ],
    },
  ],
};
