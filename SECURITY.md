# Security

Report vulnerabilities to **security@statementreconcile.com**. First response target: 2 business days. There is no bug bounty and no payment for reports.

Test only against your own data and your own payments. Do not scan, load-test, or access anyone else’s conversion.

## In scope

- Obtaining a CSV/XLSX without a Stripe Checkout Session that Stripe reports as `paid`
- Pointing a paid session at a different digest / sealed envelope
- Exporting a statement the reconciliation engine would reject
- XSS or CSP bypass on `/app` or `/checkout` (the routes that can hold a live statement)
- Formula injection that survives into CSV or XLSX
- Statement content in logs, analytics, Stripe metadata, URLs, or referrers
- Server-side issues on `/api/parse`, `/api/checkout`, `/api/export`, `/api/stripe/webhook`

## Out of scope

- Automated scanner output with no demonstrated impact
- Volumetric DoS / load testing
- Issues in Stripe, Vercel, Upstash, or an LLM vendor — report those to the vendor
- Device malware, outdated browsers, missing SPF/DKIM/DMARC without a working attack
- Social engineering or physical access

## How the product removes risk

| Decision                     | Consequence                                          |
| ---------------------------- | ---------------------------------------------------- |
| No accounts                  | No passwords, no session hijack, no account takeover |
| No database                  | No statement archive to breach                       |
| PDF stays in the browser     | File never lands on our disk or object storage       |
| Stripe hosted Checkout       | Card data never touches this codebase                |
| Digest-bound entitlement     | A paid session unlocks exactly one canonical result  |
| Reconciliation is local code | An LLM cannot mark a result `passed`                 |

A full compromise of the application still has no stored statements, credentials, or card numbers to steal. The remaining blast radius is in-flight request memory, browser storage on `/app`, and whatever an optional parser provider received.

## What we do not claim

Not SOC 2 audited. No ISO 27001. No PCI-DSS certification of our own (Stripe is PCI; we never see cards). No HIPAA claim. No commissioned pentest. No cyber-liability insurance backing a claim.

Public page: [https://statementreconcile.com/security](https://statementreconcile.com/security). Operator model: [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md), [`docs/INCIDENT_RESPONSE.md`](docs/INCIDENT_RESPONSE.md).
