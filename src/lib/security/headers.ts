/**
 * Security headers and Content-Security-Policy.
 *
 * There are two policies, because the two halves of the site have genuinely different threat
 * models and pretending otherwise would mean weakening the half that matters.
 *
 * **Processing routes** (`/app`, `/checkout/*`, `/api/*`) can hold a live statement, and the
 * browser holds the sealed result in IndexedDB. Script injected into one of those pages is the
 * one attack that could actually reach a customer's transactions, so those routes get the
 * strict policy: a per-request nonce, `strict-dynamic`, no `'unsafe-inline'` for script, and
 * `connect-src 'self'` — not even our own analytics may open a socket from a page that has a
 * statement on it. These routes are dynamically rendered, which is what makes a per-request
 * nonce possible.
 *
 * **Marketing routes** are statically generated, and Next inlines the RSC payload as inline
 * scripts. A nonce cannot be applied to a page that was rendered at build time, so `script-src`
 * there permits `'unsafe-inline'`. That is a real trade-off and it is accepted deliberately for
 * three reasons: those pages render no customer data and read no storage; they have no input
 * that reaches a sink; and the rest of the policy stays closed, so an injected script would
 * have nowhere to send anything — `connect-src` is our origin plus at most the analytics
 * endpoint, `form-action` is our origin, `object-src` and `frame-src` are `'none'`.
 */

export type CspOptions = {
  /** Present only for the strict policy; static pages cannot carry one. */
  nonce?: string | undefined;
  /** True for routes that can hold statement data. */
  processing: boolean;
  /** Extra origins the browser may connect to, e.g. a configured analytics endpoint. */
  connectSrc?: readonly string[];
  development: boolean;
};

export function contentSecurityPolicy(options: CspOptions): string {
  const { nonce, processing, development } = options;

  const scriptSrc = ["'self'"];
  if (processing && nonce) {
    scriptSrc.push(
      `'nonce-${nonce}'`,
      // Lets the nonced Next bootstrap load its own chunks without enumerating hashes.
      "'strict-dynamic'",
    );
  } else {
    scriptSrc.push("'unsafe-inline'");
  }
  if (development) {
    // React Refresh needs eval. Never present in a production build.
    scriptSrc.push("'unsafe-eval'");
  }

  const connectSrc = ["'self'", ...(processing ? [] : (options.connectSrc ?? []))];
  if (development) {
    // Hot reload uses a websocket back to the dev server.
    connectSrc.push("ws:", "wss:");
  }

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    ["base-uri", ["'self'"]],
    ["script-src", scriptSrc],
    // Next inlines critical CSS as a style element, which cannot be nonced on a static page.
    // Style injection cannot exfiltrate data on its own, and no origin other than ours is
    // permitted, so this is a much smaller concession than the script equivalent.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:"]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", connectSrc],
    // pdf.js runs in a worker built from a script served by our own origin.
    ["worker-src", ["'self'", "blob:"]],
    ["object-src", ["'none'"]],
    ["frame-src", ["'none'"]],
    ["frame-ancestors", ["'none'"]],
    ["form-action", ["'self'"]],
    ["manifest-src", ["'self'"]],
    ["media-src", ["'none'"]],
    ["upgrade-insecure-requests", []],
  ];

  return directives
    .map(([name, values]) => (values.length > 0 ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

/**
 * Headers applied to every response.
 *
 * `Permissions-Policy` denies everything the product does not use, which is nearly
 * everything: a statement converter has no business asking for a camera, a microphone, a
 * location, or a payment handler. Denying them explicitly means a future dependency cannot
 * quietly start using one.
 */
export function securityHeaders(options: { production: boolean }): Record<string, string> {
  const headers: Record<string, string> = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-dns-prefetch-control": "off",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
    "origin-agent-cluster": "?1",
    "permissions-policy": [
      "accelerometer=()",
      "ambient-light-sensor=()",
      "autoplay=()",
      "browsing-topics=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "geolocation=()",
      "gyroscope=()",
      "hid=()",
      "idle-detection=()",
      "local-fonts=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "picture-in-picture=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "serial=()",
      "usb=()",
      "xr-spatial-tracking=()",
    ].join(", "),
  };

  if (options.production) {
    // Two years, subdomains included, preload-eligible.
    headers["strict-transport-security"] = "max-age=63072000; includeSubDomains; preload";
  }

  return headers;
}

/** Cache directives for any route that can carry statement data. */
export const NO_STORE = "no-store, no-cache, must-revalidate, max-age=0";
