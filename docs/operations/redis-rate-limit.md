# Restoring the production Redis rate limiter

Statement Reconcile uses an Upstash Redis REST API as its durable, fail-closed fixed-window rate limiter. The parser, checkout, export, and first-party GA4 marketing relay must not bypass it.

## Current configuration

- Redis service: Upstash, persistent Free Tier, US East
- Database label: `statement-reconcile-rate-limit`
- The Vercel project's encrypted `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables supply the Redis REST endpoint and bearer token.
- `RATE_LIMIT_PROVIDER=upstash` is required for the protected production routes.
- GA4 events require analytics opt-in and are relayed only from allowlisted public marketing routes.
- Server-side Google Analytics secrets must never be exposed to browser JavaScript.

## Recovery process

1. Confirm the Upstash console lists the database as active and its REST hostname resolves.
2. Re-provision persistent Redis if the database was deleted. Do not use expiring trials or an in-process limiter for production.
3. Rotate the URL and token in Vercel **encrypted** environment variables. Never write those credentials into GitHub or issue comments.
4. Build and deploy through GitHub Actions CI. Environment-variable updates require a new production deployment to take effect.
5. Confirm the first-party GA4 consent test no longer logs `rate_limit_backend_unavailable`, and verify that GA4 Realtime receives the accepted events.
6. Test protected routes and the fail-closed behavior using safe synthetic tests, without submitting genuine financial documents or making real charges.

### Incident history

The previous Redis REST hostname stopped resolving (public DNS returned NXDOMAIN), leaving marketing analytics requests blocked by the safe fail-closed rate limiter. It was replaced with a persistent Free Tier database on October 20, 2026. The retired hostname and all secrets are intentionally omitted.
