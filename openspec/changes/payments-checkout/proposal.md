## Why

Every run of the import pipeline (`lib/parsing` → `estruturar`) costs a real Gemini call, and the
app is public and free today — anyone can hit `/api/resume-import` repeatedly with no cost to
themselves. The product has no accounts and no plan to add them, so the only lever available is a
small one-time charge collected before the first AI call, sized to cover that call's cost rather
than to monetize the product.

## What Changes

- Add a Stripe Checkout (hosted) integration: creates a one-time-payment Checkout Session priced
  at R$2,00 (BRL) / US$0,40 (USD), selected by the export-language toggle already in the app
  (`lib/i18n`), not by geolocation.
- Add a server-side payment gate in front of the import pipeline. `POST /api/resume-import`
  refuses to run `estruturar` (the AI call) unless the request carries a valid, unexpired,
  unused paid-session token.
- Add a signed, short-lived paid-session token (HMAC-signed, no database row) issued by a new
  webhook route handler on `checkout.session.completed`, and consumed exactly once by the import
  route. No accounts, no stored customer record — the token is the entire session model. The
  token lives only in page memory (arrives via a URL query param after the Stripe redirect, held
  in component state, sent as a request header) — it is never written to `localStorage` or a
  cookie, so it does not conflict with the existing invariant that only the language preference
  survives in the browser, and a reload loses it exactly like everything else in the flow does.
- Add a "Pagar para começar" gate to step 01 (etapa 01, `app-shell-navigation`), ahead of the file
  upload control: user clicks pay → redirected to Stripe-hosted Checkout → redirected back to
  step 01 with the token in the URL → upload unlocks.
- **BREAKING**: `/api/resume-import` now returns `402 Payment Required` for requests without a
  valid token, where it previously accepted any request.

## Capabilities

### New Capabilities
- `payments`: Stripe Checkout session creation, webhook verification and handling, paid-session
  token issuance/verification, refund is out of scope (see Fora de escopo).

### Modified Capabilities
- `resume-import`: the import pipeline now requires a valid paid-session token as a precondition;
  `estruturar` (the AI call) never runs without one, and the route returns `402` otherwise.
- `app-shell-navigation`: etapa 01 gains a payment step before the upload control becomes usable,
  and the paid-session token follows the same "gone on reload, nothing persisted but language"
  rule already governing everything else the shell holds in memory.

## Impact

- New: `lib/payments/` (pure functions: token sign/verify, price selection by locale), one new
  provider file if a Stripe SDK wrapper is needed to keep the SDK out of components (mirrors the
  `lib/ai/providers` isolation pattern already in the codebase).
- New route handlers: `app/api/payments/checkout` (creates the Checkout Session),
  `app/api/payments/webhook` (verifies Stripe signature, issues the token).
- Modified: `app/api/resume-import` (route handler) gains the token precondition; etapa 01's
  component (under `components/app-shell` or equivalent) gains the payment CTA, the
  post-redirect token pickup from the URL, and the gated dropzone.
- Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_TOKEN_SECRET` — env-only, never
  hardcoded, following the existing `AI_PROVIDERS`-style convention.
- Design reference: `claude-design/styles.css` for tokens/spacing/radii/shadows on the new payment
  CTA and any confirmation state; no `.dc.html` exists yet for this screen since it's new, so the
  new UI follows the Nocturne theme conventions documented in `claude-design/README.md` rather
  than recreating a specific mock.

## Fora de escopo

- Contas de usuário, login, ou qualquer forma de identificar o mesmo usuário entre sessões.
- Créditos, pacotes, assinatura, ou qualquer modelo de cobrança recorrente.
- Reembolso automático ou fluxo de disputa — tratado manualmente pelo Stripe Dashboard se preciso.
- Gatilho de pagamento em qualquer outro ponto do fluxo (Atualizar, Revisar, Exportar): o gate é
  único, antes da primeira chamada de IA.
- Nota fiscal/invoicing formal — o recibo do Stripe Checkout é suficiente para uma cobrança de
  R$2,00.
- Detecção de país/geolocalização para moeda — a escolha de BRL vs USD segue o toggle de idioma
  da interface (`lib/i18n`), não IP nem geolocalização.
