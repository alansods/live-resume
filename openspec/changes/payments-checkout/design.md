## Context

See proposal.md - Why. Relevant constraints already in the codebase: no database, no auth
(`CLAUDE.md`); the AI boundary (`lib/ai`) is the only place that knows which provider answers,
and nothing outside it imports a provider SDK — `payments` should mirror that isolation for
Stripe. The Stripe implementation planner (queried live against this account) recommended
**Stripe Checkout, hosted, one-time payment mode** for this shape: web, no existing account
system, single simple price, redirect acceptable.

## Goals / Non-Goals

**Goals:**
- Charge R$2,00 / US$0,40 once, before the first AI call, with no account system.
- Keep the "no accounts, nothing persisted but language" invariant intact — the payment session
  is provably stateless server-side (signed token, not a database row).
- Fail closed: any doubt about a token's validity blocks the AI call rather than letting it
  through.

**Non-Goals:**
- Multi-use credits, subscriptions, or any pricing model beyond a single one-time charge (see
  proposal.md - Fora de escopo).
- Refund automation.
- Currency detection by IP/geolocation — price follows the existing UI language toggle only.

## Decisions

**Stripe Checkout (hosted), payment mode, not Elements/Payment Intents directly.**
The implementation planner's decision tree (`boost_conversion_and_revenue` → web browser → not
Managed-Payments-eligible flow → standard checkout → "out-of-the-box, redirect is fine") landed
here given: no existing account system to attach a saved payment method to, no need to control
checkout state or apply promotions, and the lowest implementation surface for a R$2 charge.
Alternative considered: Elements + PaymentIntents embedded on the page — rejected, since it adds
custom 3DS handling and UI work for no benefit at this price point and this traffic shape.

**Paid-session token: HMAC-signed JWT-like token, no database.**
The token encodes an issuance timestamp and a single-use nonce, signed with
`PAYMENT_TOKEN_SECRET`. Verification is pure computation (signature + expiry check) — no lookup.
Single-use is enforced by an in-memory, process-local `Set` of consumed nonces with the same
30-minute TTL as the token itself (evicted on expiry), acceptable because: a multi-instance
double-spend at this price point (R$2) costs less to absorb than a database would cost to add,
and it strictly improves on the current state (free, unlimited). Alternative considered: Redis-
backed single-use tracking — rejected as disproportionate infrastructure for a R$2 gate on a
project whose explicit invariant is "no database."

**Token transport: URL query param → React state → request header. Never localStorage/cookie.**
Stripe's `success_url` redirects to step 01 with the token in the query string. The step 01
component reads it once on mount into component state and strips it from the URL
(`history.replaceState`), then sends it as a header (`X-Paid-Session`) on the import request.
This satisfies the existing `app-shell-navigation` invariant that only the language preference
persists in the browser. Alternative considered: short-lived cookie set by the webhook — rejected
because the webhook is server-to-server (Stripe → app), with no browser context to set a cookie
in; the browser only ever sees the redirect URL.

**The token is issued by a server-side confirm route, not by the async webhook.**
A webhook is server-to-server — Stripe calls it, the customer's browser is never involved, so
it has no channel to hand a token to the page the customer is looking at. The token is instead
issued by `GET /api/payments/confirm`, which `success_url` points the browser at
(`.../api/payments/confirm?session_id={CHECKOUT_SESSION_ID}`): the route retrieves that Checkout
Session from the Stripe API using the server's secret key, confirms `payment_status === "paid"`,
and only then mints the token — using the Checkout Session id itself as the token's nonce, so
confirming the same session twice reuses the same single-use slot (the nonce) rather than
minting an independent one, even though the signed token bytes differ each time. This
is the same trust boundary as a webhook (Stripe's own API, authenticated with our secret key),
just synchronous and reachable from a browser redirect. A separate webhook on
`checkout.session.completed` still exists for signature-verified server-side logging (useful for
reconciliation and detecting anomalies), but the browser's access to the app never depends on it
arriving in time — avoiding a race between the redirect and the webhook delivery.

**Isolation pattern: `lib/payments/` mirrors `lib/ai/`.**
Pure functions (`signToken`, `verifyToken`, `priceForLocale`) live in `lib/payments/`, Stripe SDK
usage is isolated behind a thin provider file, and route handlers (`app/api/payments/checkout`,
`app/api/payments/webhook`) are the only server code that touches it — matching the existing
`AiProvider` boundary convention so the rest of the app never imports `stripe` directly.

## Risks / Trade-offs

- **In-memory single-use tracking is lost on server restart / doesn't work across instances** →
  Mitigation: acceptable given the price point and the project's explicit no-database stance;
  worst case is a token reused once before its 30-minute expiry, costing at most one extra
  Gemini call (~R$2 of exposure). Documented here so it isn't silently forgotten if traffic ever
  justifies revisiting it.
- **Token in a query param is visible in browser history / referrer headers** → Mitigation: the
  component strips it from the URL immediately via `history.replaceState`; the token is single-
  use and 30-minute-lived, so even a leaked value has a narrow, self-limiting blast radius.
- **User closes the tab after paying but before uploading** → Mitigation: token dies with the
  tab (by design, matches every other piece of session state); Stripe still recorded the
  successful charge, and a manual refund via Dashboard is the documented recourse (see proposal's
  Fora de escopo).

## Migration Plan

No existing data to migrate (feature is net-new). Deploy order: (1) set
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_TOKEN_SECRET` in the environment, (2)
register the webhook endpoint in the Stripe Dashboard pointing at
`/api/payments/webhook`, (3) deploy the route handlers and UI gate together — the `402` on
`/api/resume-import` and the step-01 gate ship in the same release so the API is never
enforcing a precondition the UI doesn't yet satisfy. Rollback is a plain revert; nothing
persisted needs cleanup.
