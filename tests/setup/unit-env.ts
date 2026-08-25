/**
 * Environment for unit tests.
 *
 * The reason this exists is narrow and worth stating. `seal()` degrades to an unsealed
 * envelope when `EXPORT_SEAL_SECRET` is absent, so without this file every unit test that
 * sealed and reopened a pack was exercising the plaintext fallback — a path production is
 * not supposed to use — while appearing to prove that tamper resistance worked.
 *
 * Setting the secret here means the digest-bound AES-GCM envelope is what the pack and
 * payment-boundary tests actually run against.
 *
 * The value is a fixed non-secret string: unit tests must be deterministic, and nothing here
 * protects anything real.
 */
process.env.APP_ENV = "test";
// NODE_ENV is typed read-only, but the test-only guards read it at runtime.
(process.env as Record<string, string>).NODE_ENV ??= "test";
process.env.PARSER_PROVIDER = "none";
process.env.PARSER_DETERMINISTIC_ONLY = "1";
process.env.RATE_LIMIT_PROVIDER = "memory";
process.env.EXPORT_SEAL_SECRET = "unit-test-seal-secret-not-used-anywhere-real";
