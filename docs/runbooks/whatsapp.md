# Runbook — WhatsApp go-live

1. Meta Business + WABA + phone number.
2. Set `WHATSAPP_VERIFY_TOKEN` (not `change-me`), `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`.
3. Callback URL: `https://<api-host>/api/v1/webhooks/whatsapp` (GET verify + POST inbound).
4. Production refuses unsigned callbacks when the app secret is missing.
5. Customer flow: MENU → `CAT:hijabs` → `ADD:slug` → CART → CHECKOUT → Stripe payment link.
6. Broadcasts are ADMIN-only and only to `whatsappOptIn` users.

