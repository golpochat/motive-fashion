# Runbook — WhatsApp go-live

1. Meta Business + WABA + phone number.
2. Set `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.
3. Callback URL: `https://<api-host>/api/v1/webhooks/whatsapp`
4. Customer flow: MENU → `CAT:hijabs` → `ADD:slug` → CART → CHECKOUT → Stripe payment link.
5. Broadcasts only to `whatsappOptIn` users.
