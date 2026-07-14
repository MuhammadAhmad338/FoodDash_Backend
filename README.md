# Food Platform Backend

Single Express + MongoDB API that powers all three apps: customer app, restaurant app, and admin panel. Role-based auth (JWT) decides what each app can do — one backend, one database, three clients.

## Stack
- Node.js + Express
- MongoDB + Mongoose
- JWT auth with role-based access control (`customer`, `restaurant_owner`, `restaurant_staff`, `admin`)
- Socket.io for real-time order tracking
- Stripe for payments (PaymentIntents + webhook confirmation)

## Setup

```bash
npm install
cp .env.example .env   # then fill in MONGO_URI, JWT_SECRET, STRIPE keys
npm run dev             # nodemon, auto-restarts on change
```

Requires a running MongoDB instance (local or Atlas) — set `MONGO_URI` accordingly.

For Stripe webhooks locally, use the Stripe CLI:
```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```

## Folder structure

```
config/       DB connection
models/       Mongoose schemas (User, Restaurant, MenuItem, Order, Payment)
controllers/  Route logic
routes/       Express routers
middleware/   auth (JWT + role guard), error handler
sockets/      Socket.io connection + room logic
utils/        JWT token generator
server.js     App entry point
```

## Auth & roles

- `POST /api/auth/register` — self-registration for `customer` or `restaurant_owner` (owner registration also creates a pending `Restaurant` doc)
- `POST /api/auth/login` — works for any role
- `GET /api/auth/me` — current user profile (requires Bearer token)
- `restaurant_staff` accounts and `admin` accounts aren't self-registrable — create them manually (e.g. via a seed script or by having an owner/admin promote a user) once you build that flow.

All protected routes expect `Authorization: Bearer <token>`.

## Core API

### Restaurants (public browsing + owner/admin management)
- `GET /api/restaurants` — approved restaurants, filter by `?city=`, `?cuisine=`, `?search=`
- `GET /api/restaurants/:id`
- `PUT /api/restaurants/:id` — owner edits own profile; admin can also set `status` (`pending|approved|rejected|suspended`) and `commissionRate`
- `GET /api/restaurants/admin/all?status=pending` — admin only

### Menu (nested under a restaurant)
- `GET /api/restaurants/:restaurantId/menu` — public
- `POST /api/restaurants/:restaurantId/menu` — owner/staff/admin
- `PUT /api/restaurants/:restaurantId/menu/:itemId`
- `DELETE /api/restaurants/:restaurantId/menu/:itemId`

### Orders
- `POST /api/orders` — customer places an order. Prices are recalculated server-side from the DB, never trusted from the client.
- `GET /api/orders/mine` — customer's order history
- `GET /api/orders/:id` — customer (own order), restaurant staff (own restaurant), or admin
- `GET /api/orders/restaurant/:restaurantId?status=placed` — restaurant dashboard feed
- `PATCH /api/orders/:id/status` — restaurant/admin advances status: `placed → confirmed → preparing → ready → out_for_delivery → delivered` (or `cancelled`)

### Payments (Stripe)
- `POST /api/payments/create-intent` — customer, body `{ orderId }`, returns `{ clientSecret }` for Stripe's client-side SDK
- `POST /api/payments/webhook` — Stripe calls this on `payment_intent.succeeded` / `payment_intent.payment_failed`; updates `Order.paymentStatus` and notifies the restaurant dashboard via socket

### Admin
- `GET /api/admin/stats` — restaurant/customer/order counts, total revenue, total platform fees
- `GET /api/admin/users?role=customer`
- `PATCH /api/admin/users/:id/status` — activate/deactivate an account
- `GET /api/admin/orders?status=delivered` — platform-wide order view

## Real-time (Socket.io)

Client connects with a JWT:
```js
const socket = io('http://localhost:5000', { auth: { token: jwtToken } });
```

**Customer app** (order tracking screen):
```js
socket.emit('order:track', orderId);
socket.on('order:statusUpdate', (payload) => { /* update UI */ });
```

**Restaurant dashboard**:
```js
socket.emit('restaurant:join', restaurantId);
socket.on('order:new', (order) => { /* show incoming order */ });
socket.on('order:paid', ({ orderId }) => { /* payment confirmed */ });
socket.on('order:statusUpdate', (payload) => { /* sync own board */ });
```

## Suggested build order for the three client apps

1. **Admin panel (Angular)** — CRUD against `/api/restaurants/admin/all` and `/api/admin/*` to validate the API works end to end.
2. **Restaurant dashboard** — connect to `/api/orders/restaurant/:id` + socket `restaurant:join` for live incoming orders.
3. **Customer app (Flutter)** — browsing, cart, checkout with Stripe, then `order:track` for the live status screen.

## Notes / next steps
- No delivery-partner role yet — `out_for_delivery` is just a status set by the restaurant. Add a `delivery_partner` role and live location updates if you want map tracking.
- Ratings/reviews aren't wired up beyond the `rating`/`ratingCount` fields on `Restaurant` — add a `Review` model when ready.
- Add rate limiting (`express-rate-limit`) before deploying publicly.
