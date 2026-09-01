# Runbook — Stripe Checkout

Motive uses Stripe Checkout Sessions (not Payment Intents). Cards never touch our servers.

## Local (mock)

`ALLOW_MOCK_PAYMENTS=true` and a placeholder `STRIPE_SECRET_KEY` (`sk_test_...`) keep checkout on the mock path. Mock pay is refused when `NODE_ENV=production`.

## Test keys

1. Create a Stripe account (Ireland / EUR).
2. Put the **test** secret in `apps/api/.env` as `STRIPE_SECRET_KEY=sk_test_...` (a real test key, not the placeholder).
3. Set `ALLOW_MOCK_PAYMENTS=false`.
4. Forward webhooks:

```bash
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe
```

5. Copy the CLI `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
6. Pay with Stripe test card `4242 4242 4242 4242`.

Checkout Sessions include product lines, Ireland delivery when charged, and a one-time coupon when a promo reduced the order.

## Live

1. Switch to `sk_live_...` and a live webhook endpoint `https://<api-host>/api/v1/webhooks/stripe` for `checkout.session.completed`.
2. `ALLOW_MOCK_PAYMENTS` must not be `true`.
3. Success URL is `/order/:id?token=...`. Cancel URL is `/checkout?cancelled=1`.
4. Confirm VAT treatment with your accountant (prices are VAT-inclusive).
