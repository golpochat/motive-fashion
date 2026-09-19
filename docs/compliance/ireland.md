# Ireland / EU compliance checklist

Not legal advice. Confirm with an Irish solicitor and accountant before go-live.

This shop is set up as a **sole trader** trading as Motive Fashion (not a CRO Ltd). Set `LEGAL_NAME` / `NEXT_PUBLIC_LEGAL_NAME` to the proprietor’s legal name when you have it. Receipts and `/legal` pages read that value.

- [ ] Revenue: register as a sole trader (income tax / self-assessment)
- [ ] Business name: if the public name is not your own name, file a business name
- [ ] VAT: register when you pass Revenue’s threshold, or earlier if you want to reclaim VAT on stock. Until then keep `VAT_REGISTERED=false` so the site does not claim “inc. VAT”
- [ ] After VAT registration: `VAT_REGISTERED=true`, `VAT_NUMBER=IE…`, prices and receipts show VAT
- [ ] Prices shown in euro (VAT-inclusive only once registered)
- [x] Distance selling: 14-day withdrawal, returns policy and model form at `/legal/returns`
- [x] Terms, privacy, cookies, and trader imprint pages live (solicitor should still review the wording)
- [x] GDPR: lawful basis, DSR export/delete (`/account/gdpr-export`); controller is the sole trader
- [ ] WhatsApp and email marketing: opt-in only
- [x] Cookie banner for non-essential cookies
- [x] EAA skip-to-content on storefront and consoles (keyboard, contrast, alt text still need a full pass)
- [ ] Stripe Ireland entity / EUR settlement (individual / sole trader onboarding)
- [x] Consumer Rights Act information duties at checkout (trader identity, total, 14-day right, Ireland-only)

Supplier seed contacts are **examples**. Do not outreach until verified; treat personal numbers as personal data.
