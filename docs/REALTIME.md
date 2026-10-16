# Real-time order tracking

MongoDB is the source of truth for order status, delivery assignment, and the
latest delivery location. The Next.js application persists each update before
attempting to publish a versioned Socket.IO event. Event publication is
best-effort: clients refetch the authoritative tracking API after reconnecting
and periodically, so an unavailable realtime service does not lose order data.

## Fulfillment transition policy

The transition map is defined in `src/lib/constants.ts` and checked again by
the order service:

- Pickup: `pending -> confirmed -> preparing -> ready_for_pickup -> delivered`
- Delivery: `pending -> confirmed -> preparing -> out_for_delivery -> delivered`
- Staff may cancel an order before completion, including a pickup that is
  ready for pickup and a delivery that is out for delivery.
- Only an admin may confirm, prepare, cancel, assign a worker, or start a
  delivery. Delivery workers may mark only their assigned delivery delivered
  and may update its location while it is out for delivery.
- A delivery worker must be assigned before a delivery can go out for delivery.
- Customers cannot write order lifecycle or payment state.

Transitions are atomic compare-and-swap updates. Each persisted change
increments the order version and appends audit history before publishing the
event. Clients ignore duplicate or older versions.

## Dedicated Socket.IO service

Run the app and the realtime process with the same MongoDB database and
independent, high-entropy secrets:

```text
MONGODB_URI=...
SOCKET_ALLOWED_ORIGINS=https://shop.example.com
SOCKET_TICKET_SECRET=<at least 32 random characters>
SOCKET_INTERNAL_SECRET=<different, at least 32 random characters>
SOCKET_SERVER_INTERNAL_URL=https://realtime-internal.example.com
SOCKET_PORT=3001
NEXT_PUBLIC_SOCKET_URL=https://realtime.example.com
```

Set the ticket and internal secrets in both services, but never expose them as
`NEXT_PUBLIC_*` variables. Generate secrets with a cryptographically secure
random generator. The app calls the service's `/internal/publish` endpoint;
restrict that endpoint to app-server network access and use TLS for traffic that
crosses a network boundary. The service's HTTP listener is intended to be
behind a reverse proxy/load balancer that supports persistent WebSocket
connections and forwards the configured public origin. `SOCKET_ALLOWED_ORIGINS`
is an exact comma-separated browser-origin allowlist; wildcard origins are not
accepted.

Install the project dependencies, then run `npm run realtime` for the dedicated
service. Deploy and scale it separately from Next.js where the application
platform cannot maintain WebSocket connections. Configure proxy/load-balancer
affinity for Engine.IO polling handshakes and WebSocket upgrades. Set `REDIS_URL`
on every realtime instance to enable the Socket.IO Redis adapter for cross-node
room broadcasts. MongoDB remains authoritative; Redis is not an order store.

Socket tickets are short-lived, HMAC-signed, and issued only to authenticated
users. The realtime service revalidates active user, role, and token version at
connection and periodically. Joining an order room requires an exact tracking
ID and server-side ownership, staff-role, or delivery-assignment authorization.
Admins can receive new-order notifications without an existing order, and
delivery workers can receive assignment notifications for their own user room.
Customers cannot request an unscoped ticket. Guest tracking continues to use
the public tracking API and periodic refresh because guests do not have an
authenticated socket session.

## Operational check

Use separate customer and staff sessions against the same database. Confirm a
staff transition appears in the customer tracking page, then try subscribing
to an unrelated customer's tracking ID and confirm the server rejects it.
Disconnect/reconnect the socket and confirm the page refetches its current
MongoDB state. Replay an older event version and confirm the customer view
does not regress. These checks require configured MongoDB, app auth, and a
running realtime service; a local build alone does not exercise the live path.
