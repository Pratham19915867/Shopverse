# Shopverse

A responsive marketplace built with Next.js App Router, PostgreSQL, and Drizzle ORM.

## Included

- Phone OTP login and signup, expiring one-time challenges, attempt limits, and hashed session cookies.
- An interactive lamp login screen.
- Four-question onboarding: shopping/selling intent, categories, personal style, and budget, plus a display name.
- A personalized feed and visible profile tags, with editable preferences.
- Search, sorting, category and price filters, saved finds, and shopping bags.
- Seller listings with 1–4 uploaded images, product information, stock, and immediate storefront publishing.
- Database-backed demo checkout and order history. **No real payment is collected and no shipment is arranged.**

## SMS configuration

By default, when no Twilio credentials are available, sign-in uses an explicitly labeled preview code. No SMS is sent in this mode. Set these server-side environment variables to enable actual SMS via Twilio Verify:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `AUTH_MODE=live`

Create a Twilio Verify service and configure a six-digit code. Verify the sender/region and trial recipient permissions in Twilio. Live mode fails closed when credentials are missing. Never use preview mode for a public production launch. `AUTH_MODE=demo` explicitly forces demo mode. Add deployment-specific IP rate limits and SMS spending limits before public launch.

## Local setup

1. Set `DATABASE_URL` to a PostgreSQL connection URL.
2. Install dependencies with `npm install`.
3. Apply the schema with `npx drizzle-kit push`.
4. Run `npm run dev`.

The starter catalog is inserted idempotently on storefront requests. It contains clearly identified showcase products. Community listings and account data are persisted in PostgreSQL. Uploaded images are resized in the browser and stored as bounded data URLs in PostgreSQL; move uploads to a dedicated object store for large-scale production use.

Sessions last 30 days and use HTTP-only, SameSite cookies. Production cookies require HTTPS. OTPs expire after five minutes, allow five attempts, and have per-phone request limits.

## Validation

- `npx next typegen`
- `npm exec tsc -- --noEmit --pretty false`
- `npm run build`
- `GET /api/health`

## Browser tests

With the app running, install the test browser using `npx playwright install --with-deps chromium`, then run `npx playwright test`. Optionally set `SHOPVERSE_TEST_URL` to your preview URL. The suite covers search, filters, mobile navigation, guest collection persistence, invalid OTPs, four-step signup, profile tags, uploads, persisted listings, demo checkout, logout, rate limiting, and OTP replay protection. Test-only accounts, listings, and orders are cleaned up afterward. Run these tests only against a local or staging database in preview OTP mode.

## Production considerations

Configure live SMS, appropriate fraud controls, object storage, monitoring, a real payment provider, seller verification, taxes, fulfillment, and marketplace policies before accepting real purchases. This application does not pretend that demo orders are real transactions.
