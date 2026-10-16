# Admin operations and delivery management

## Access boundaries

- `/admin` and the catalog, locations, promotions, customers, staff, settings,
  and order-search screens require a current active admin session. Each
  Server Action repeats the role check and validates its input.
- `/delivery` only renders for a current `delivery_boy` account. Its data query
  is constrained to the signed-in worker's assigned order IDs. Order detail
  reads, state changes, location updates, and COD collection independently
  verify the assignment server-side.
- A worker may mark an order delivered only from `out_for_delivery` and only
  for an order currently assigned to that worker. An administrator may advance
  valid transitions. Rejection/cancellation requires an audit reason.
- COD is recorded as paid only after delivery completion. Online payments must
  continue to use a verified provider event; staff cannot mark an online order
  paid through the cash-collection operation.

## Analytics rules

The operations dashboard supports rolling 7-, 30-, and 90-day ranges, from
00:00 UTC on the first selected day through the current time. Revenue and
sales trends include orders with `payment.status === "paid"` only and use the
net order `total` after discounts and delivery fees. Pending COD orders are
unpaid, not revenue. Top item quantities are also calculated from paid orders.
Current order-state counts are scoped to orders placed in the selected range.
Order search and customer/staff directories use bounded server-side
pagination, not client-side full collection loads.

## Catalog, coverage, hours, and promotions

Product updates persist price, active/available state, and finite stock;
blank stock is unlimited. Order quoting checks aggregate requested quantity,
and creation atomically reserves finite stock when MongoDB transactions are
available. On standalone MongoDB, reservations use guarded updates and
compensating increments on a failed order insert.

The customer storefront currently exposes the H-13 branch only. Its verified
coordinates are configured in `src/lib/constants.ts`; the optional
`DELIVERY_RADIUS_KM` setting defaults to 5 km. Delivery requires map-derived
coordinates and the server rechecks straight-line distance against that
verified origin when quoting and creating an order. An area label without
coordinates is not enough to establish coverage. Branch records control
availability and weekly hours in the Asia/Karachi display timezone. The active
H-13 delivery zone supplies fees, minimum order values, free-delivery
thresholds, and any configured ETA.

Active discount codes can specify a percentage, minimum subtotal, and
start/end time. Checkout revalidates a code against MongoDB and computes the
discount on the server; no client total is trusted. Active banner promotions
are rendered on the home page. Promotion creation, edits, activation, and
discount-code changes are audited.

## Assignment notification worker

Delivery workers manage their own email and phone notification consent in
their account settings. Phone messages are never queued for an account without
an explicit phone opt-in and a saved phone number. Jobs contain recipient and
order references rather than copied contact details.

Configure SMTP variables for email. To enable SMS or WhatsApp, configure
`PHONE_NOTIFICATION_WEBHOOK_URL` and `PHONE_NOTIFICATION_WEBHOOK_TOKEN` for a
trusted provider adapter that accepts a JSON body containing `to` and
`message` and returns a successful HTTP response after accepting the message.
Use HTTPS in production. Keep the token server-only.

Assignment persists before notifications are queued and before the realtime
event is published. A scheduled worker can process queued jobs by running
`npm run notifications:process`; schedule it at an interval suitable for the
provider's latency and rate limits. Each job is atomically claimed, rechecks
that the assignment is current and consent remains active, records attempts
and provider outcome, and retries failures with backoff up to five attempts.
It processes at most 100 jobs per invocation. A provider outage never holds
the assignment request open.

## Operational verification

Use separate customer, admin, and delivery-worker accounts in an environment
with MongoDB and the realtime service configured. Confirm that customer
requests to admin pages/actions are denied, workers see only their assigned
orders, and guessed order IDs do not disclose another worker's order. Assign
and reassign an active worker; verify MongoDB history, realtime room updates,
and queued notification outcomes. With test provider credentials, verify
consent-gated email/phone delivery and retry recovery. Run the worker as a
scheduled job rather than inside the Next.js request process.
