## 1. Setup

- [x] 1.1 Add `stripe` to dependencies
- [x] 1.2 Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_TOKEN_SECRET` to
      `.env.local` (project has no `.env.local.example`, follows its existing convention) and to
      the Vercel project's environment variables
- [x] 1.3 Register the webhook endpoint (`/api/payments/webhook`) in the Stripe Dashboard (live
      mode — user chose to skip test mode) and record the signing secret

## 2. lib/payments (pure functions, mirrors lib/ai isolation)

- [x] 2.1 `lib/payments/token.ts`: `signToken()` (issuance timestamp + single-use nonce, HMAC with
      `PAYMENT_TOKEN_SECRET`) and `verifyToken()` (signature + 30-minute expiry check)
- [x] 2.2 `lib/payments/consumed-nonces.ts`: process-local single-use tracking (`Set` with TTL
      eviction matching token expiry)
- [x] 2.3 `lib/payments/pricing.ts`: `priceForLocale(locale)` → R$2,00 (BRL) for `pt`, US$0,40
      (USD) for `en`
- [x] 2.4 `lib/payments/stripe-client.ts`: thin wrapper isolating the `stripe` SDK import (mirrors
      `lib/ai/providers` — nothing outside this file imports `stripe` directly)
- [x] 2.5 Unit tests for `signToken`/`verifyToken` (valid, expired, tampered, wrong secret) and
      `priceForLocale` (pt, en, unknown locale fallback)

## 3. Route handlers

- [x] 3.1 `app/api/payments/checkout/route.ts`: creates a one-time-payment Checkout Session
      priced via `priceForLocale`, `success_url` pointing back to step 01 with `{CHECKOUT_SESSION_ID}`,
      `cancel_url` back to step 01 unpaid
- [x] 3.2 `app/api/payments/webhook/route.ts`: verifies Stripe signature, handles
      `checkout.session.completed` by minting a token via `signToken()` and redirecting the
      customer's browser (via the Checkout `success_url` flow) to step 01 with the token in the
      query string
- [x] 3.3 Modify `app/api/resume-import/route.ts`: read the paid-session token from the request
      (header), call `verifyToken()` before any file read; return `402` with a distinguishable
      reason for "no token" vs "invalid/expired token"; mark the nonce consumed only after the
      import pipeline succeeds
- [x] 3.4 Route tests: webhook signature verification (valid/invalid), checkout session creation
      (BRL/USD by locale), import route 402 paths (missing token, expired token, already-consumed
      token), token surviving a file-format failure (not consumed)

## 4. UI — etapa 01 gate (app-shell-navigation)

- [x] 4.1 Add "Pagar para começar" CTA state to step 01, shown when no valid token is held in
      component state
- [x] 4.2 Wire the CTA to `POST /api/payments/checkout` and redirect to the returned Stripe
      Checkout URL
- [x] 4.3 On mount, read the token from the URL query string (Checkout return), store in
      component state, strip it from the URL via `history.replaceState`
- [x] 4.4 Gate the dropzone (selection and drag-and-drop) behind "token present" state; send the
      token as a request header on the import call
- [x] 4.5 Handle the Checkout `cancel_url` return: stay on the unpaid CTA state, no error shown
- [x] 4.6 i18n strings (PT/EN) for the CTA, price display, and any new error states (402 reasons)
      in the existing dictionaries
- [x] 4.7 Style the CTA and price display with `claude-design/styles.css` tokens only (no literal
      colors), consistent with the rest of the shell

## 5. Tests — spec coverage

- [x] 5.1 Component/integration tests for every scenario in
      `specs/app-shell-navigation/spec.md` (gate before dropzone, token from URL, token lost on
      reload, checkout cancel)
- [x] 5.2 Confirm `lib/spec-coverage.test.ts` passes with the new `payments` capability and the
      modified `resume-import`/`app-shell-navigation` scenarios all named and covered

## 6. Manual verification (test mode)

- [ ] 6.1 Run a full Checkout flow in Stripe test mode with a test card, confirm the token
      unlocks the dropzone and an import succeeds
- [ ] 6.2 Confirm reloading step 01 after payment loses the token and re-shows the CTA
- [ ] 6.3 Confirm a second import attempt with the same (already-consumed) token gets `402`
- [ ] 6.4 Confirm `localStorage`/`sessionStorage`/cookies contain no token after a successful
      payment (browser devtools inspection)
