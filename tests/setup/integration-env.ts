/**
 * Environment for integration tests.
 *
 * Integration tests exercise the real route handlers, so they need a deterministic
 * environment: no external parsing provider, an in-memory rate limiter, and the
 * test-only payment bypass that lets the paid export gate be tested without Stripe.
 */
process.env.APP_ENV = "test";
// NODE_ENV is typed as read-only, but the mock-payment guard reads it at runtime, so the
// test environment has to be able to set it.
(process.env as Record<string, string>).NODE_ENV ??= "test";
process.env.PARSER_PROVIDER = "none";
process.env.PARSER_DETERMINISTIC_ONLY = "1";
process.env.RATE_LIMIT_PROVIDER = "memory";
process.env.E2E_MOCK_PAYMENTS = "1";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
/**
 * Sealing is exercised for real. Running the integration suite in plaintext mode would test a
 * fallback the production deployment is not supposed to use, and would not catch a regression
 * in the envelope's authentication.
 */
process.env.EXPORT_SEAL_SECRET = "integration-test-seal-secret-not-used-anywhere-real";
