# Architecture and critical workflows

## Main modules
Identity & access; customer profiles; seller onboarding; catalog; product variants; inventory; search; cart; promotions; checkout; orders; payments; shipping; returns/refunds; reviews; notifications; support; commissions/settlements; admin audit.

## Checkout flow
1. Validate customer, address and delivery serviceability.
2. Re-price cart from server-side catalogue data; never trust client totals.
3. Group lines by seller and reserve inventory with an expiry.
4. Create a pending order using an idempotency key.
5. Create payment intent/session through provider adapter.
6. Verify signed provider webhook on the server.
7. On confirmed payment, confirm order and enqueue seller fulfilment tasks.
8. On timeout/failure, release reservations; reconcile provider state before retrying.
9. Refunds and seller settlements use ledger entries and reconciliation, not mutable balance fields.

## Security boundaries
- Customer, seller and platform-admin roles are distinct.
- Sellers can access only their own catalogue, inventory and fulfilment records.
- Platform-admin actions require stronger authentication and immutable audit events.
- Payment credentials and UPI PINs are never collected or stored by this application.
- Webhooks must be signature-verified, replay-protected and idempotent.
- All prices are integer paise; never use floating-point arithmetic for money.

## Production deployment
Separate development, staging and production environments. Use managed PostgreSQL with backups/PITR, managed Redis, private object storage, TLS, secrets manager, WAF/rate limiting, centralized logs, metrics, traces, alerts and tested recovery procedures.
