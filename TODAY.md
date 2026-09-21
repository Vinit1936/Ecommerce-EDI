# One-Day Push — Review Prep

Target: **Team 1 ~16% → 40%+ · Team 2 ~12% → 40%+ · Team 3 ~7% → 40%+**
Companion doc: `CHECKLIST.md` (full audit). Check items off there as you land them.

---

## The Strategy: one vertical slice, not three silos

Do **not** split into three teams building three separate things today. You have ~20% to make up per team in one day, and the fastest way to move all three numbers at once is a single end-to-end path that every team owns a segment of:

```
signup → login → browse products (DB) → add to cart (DB) → checkout
   → order created in a $transaction → stock decremented
   → payment + transaction rows written
   → audit log + notification fired
   → order appears on the admin dashboard → invoice
   └── T1 ──────┘└──── T2 ─────────────┘└──── T3 ──────────┘
```

Every task below exists to make that one flow real. **Nothing else matters today.**

Why this hits 40% for everyone: the DB is already modelled for all 20 tables, and the UI is already built. You are not designing or building — you are *connecting two finished halves*. That is why a day is enough.

---

## ⚠️ Three traps that will eat your day

**1. `middleware.ts` does not work in Next 16.** It was renamed to `proxy.ts` and the export is `proxy()`, not `middleware()`. Confirmed in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. Every blog post and AI answer you find will say `middleware.ts`, and it will fail silently — no error, no redirect, just nothing. File goes at `src/proxy.ts`.

```ts
// src/proxy.ts  — NOT middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) { /* ... */ }
export const config = { matcher: ['/account/:path*', '/dashboard/:path*'] }
```

Also from those docs: proxy runs separately from render code and **should not rely on shared modules, globals, or a DB connection.** So use proxy only for a cheap "is a session cookie present" check + redirect. Do real role checks inside route handlers and server components.

**2. Use `next-auth@beta`, not `next-auth`.** `latest` is v4 and is Pages-Router-shaped. Verified peer deps on `5.0.0-beta.32`: `next: ^14 || ^15 || ^16` — v5 beta officially supports your Next 16. `npm i next-auth@beta`.

**Time-box auth to 90 minutes.** If NextAuth is still fighting you at the 90-minute mark, drop it and ship bcrypt + a signed JWT in an httpOnly cookie via `jose` (~40 lines, zero config). For tomorrow's review, *working auth* beats *the documented auth library*. Note the deviation in your report and revisit after the review.

**3. Do not run `prisma db push` again.** Use `prisma migrate dev` from here on. Migration SQL is a graded deliverable for all three teams (KPI #9) and you currently have none.

---

## WAVE 0 — Shared foundation ✅ COMPLETE

> **Done and pushed.** Migrations baselined + applied, database seeded (12 products,
> 4 brands, 5 categories, 2 demo accounts), shared libs written, auth verified
> end-to-end. Teams 1–3 are unblocked: `getSession()` returns a real `customerId`.
> Run `npm install && npx prisma generate && npm run seed` after pulling.
>
> **Demo accounts** — password `Password123!` for both:
> `admin@hellohello.studio` (ADMIN) · `customer@hellohello.studio` (CUSTOMER)

### Original plan (~90 min, BLOCKING)

**One person drives and screen-shares. The other two read along and do not touch the repo.** Every task after this depends on Wave 0, and three people editing `schema.prisma` at once on day one is how you lose an afternoon to merge conflicts.

### 0.1 — Close the schema gaps *(one migration, not seven)*

Edit `prisma/schema.prisma`. From `CHECKLIST.md` → *Schema Gaps*:

- [ ] `Product` — add `description String? @db.Text`, `sku String @unique`, `imageUrl String? @db.Text`, `isFeatured Boolean @default(false)`, `isNew Boolean @default(false)`
- [ ] `Customer` — add `firstName`, `lastName`, `phone`, `postalCode`, `country`
- [ ] `Order` — add `shippingAddress`, `shippingCity`, `shippingPostalCode`, `shippingCountry`, `shippingMethod`, `shippingCost Decimal @db.Decimal(12,2)`
- [ ] **Decide the stock authority.** `Product.stockQty` *and* `Inventory.quantityAvailable` both exist. **Recommendation: make `Product.stockQty` authoritative today** — it is what the order transaction will lock, and it is one row per product instead of a join. Keep `Inventory` for the warehouse breakdown and have Team 2 write to both inside the same transaction. Write the decision down; an examiner will ask.
- [ ] *(Optional, only if Team 2 has time for invoices)* `Invoice` model — `id`, `orderId @unique`, `invoiceNo @unique`, `issuedAt`, `totalAmount`

### 0.2 — Migration

- [ ] `npx prisma migrate dev --name add_missing_fields`
- [ ] Confirm `prisma/migrations/` now exists and contains real `.sql` — **this is a deliverable for all three teams**
- [ ] `npx prisma generate`

### 0.3 — Seed script — *the highest-leverage 30 minutes of the day*

Create `prisma/seed.ts` and **port the 13 products out of `src/lib/mock-data.ts` directly into the database.**

This matters more than it looks: the UI already renders those exact 12 products beautifully. Seed the same data and the site looks *identical* after the swap — but every pixel is now coming from Postgres. Zero visual regression, total architectural change. It also means a broken query is immediately obvious during the demo.

- [ ] 3 roles: `CUSTOMER`, `ADMIN`, `VENDOR` *(the `roles` table already has 2 stray test rows — clear them first)*
- [ ] Brands + categories referenced by the mock data
- [ ] All 12 products (`hh-01` … `hh-12`) with real prices, stock, images
- [ ] 1 warehouse + `Inventory` rows per product
- [ ] 2 users with bcrypt-hashed passwords: `admin@hellohello.studio` / `customer@hellohello.studio` — **memorise these, you will type them live tomorrow**
- [ ] 1 `Customer` profile linked to the customer user
- [ ] Add to `package.json`: `"seed": "tsx prisma/seed.ts"` and make it idempotent (`upsert`, not `create`) so you can re-run it all day without duplicate-key errors

### 0.4 — Shared libs *(build once, all three teams import)*

- [ ] `src/lib/api.ts` — one response shape everybody returns:
      `ok(data)` → `{ success: true, data }` · `fail(msg, code)` → `{ success: false, error: msg }`
- [ ] `src/lib/auth.ts` — `getSession()`, `requireAuth()`, `requireRole('ADMIN')`
- [ ] `src/lib/audit.ts` — `recordAudit({ userId, action, entity, entityId })`  ← **Team 3 owns, T1 + T2 call it**
- [ ] `src/lib/notify.ts` — `notify({ userId, message })`  ← **Team 3 owns, T2 calls it**
- [ ] `npm i next-auth@beta bcryptjs zod tsx` · `npm i -D @types/bcryptjs`

### 0.5 — Freeze the API contract ✋

**Do this before anyone writes a route.** Agree these signatures out loud, write them here, and then all three teams can build in parallel against stubs without blocking each other. This 10-minute conversation is what makes the rest of the day parallel.

| Route | Method | Owner | Returns |
|---|---|---|---|
| `/api/auth/register` | POST | T1 | `{ user }` |
| `/api/auth/[...nextauth]` | * | T1 | session |
| `/api/products` | GET | T1 | `{ products[], total }` — supports `?q=&category=&brand=&sort=&inStock=` |
| `/api/products/[id]` | GET | T1 | `{ product }` |
| `/api/categories` · `/api/brands` | GET | T1 | `{ categories[] }` / `{ brands[] }` |
| `/api/reviews` | POST/GET | T1 | `{ review }` / `{ reviews[] }` |
| `/api/cart` | GET/POST/PATCH/DELETE | T2 | `{ items[], subtotal }` |
| `/api/orders` | POST | T2 | `{ order, invoiceNo }` |
| `/api/orders` | GET | T2 | `{ orders[] }` |
| `/api/orders/[id]/cancel` | POST | T2 | `{ order }` |
| `/api/wishlist` | GET/POST/DELETE | T2 | `{ items[] }` |
| `/api/payments` | POST | T3 | `{ payment, transaction }` |
| `/api/admin/stats` | GET | T3 | `{ revenue, orderCount, topProducts[], recentOrders[] }` |
| `/api/reports/export` | GET | T3 | CSV stream |

**File ownership — stay in your lane, no merge conflicts:**

| Team | Owns these paths |
|---|---|
| T1 | `src/app/api/auth/**`, `api/products/**`, `api/categories/**`, `api/brands/**`, `api/reviews/**`, `src/lib/auth.ts`, `app/login`, `app/signup`, `app/shop`, `app/product/[id]`, `app/account`, `src/proxy.ts` |
| T2 | `src/app/api/cart/**`, `api/orders/**`, `api/wishlist/**`, `src/lib/orders.ts`, `components/cart/**`, `app/cart`, `app/checkout`, `app/orders` |
| T3 | `src/app/api/payments/**`, `api/reports/**`, `api/admin/**`, `src/lib/audit.ts`, `src/lib/notify.ts`, `app/dashboard/**` |

After Wave 0: **commit and push immediately**, then everyone branches off it.

---

## WAVE 1 — Parallel tracks ✅ LARGELY COMPLETE

> **Done and pushed.** The full vertical slice works end to end and is verified
> by an automated run: login → SQL-filtered catalogue → database cart → atomic
> order → stock decrement → payment → lifecycle trail → cancel/restore → RBAC
> denial → admin dashboard → CSV export. 14/14 checks pass.
>
> **KPI #6 is proven:** `npm run test:concurrency` — 20 simultaneous orders
> against stock of 10 → exactly 10 accepted, 10 rejected, final stock 0.
>
> Still open: admin product CRUD, reviews UI, wishlist UI, printable invoice,
> notification bell, backup script. See CHECKLIST.md for the current per-module
> state.

### Original plan (~4 hrs)

### 🔵 TEAM 1 — Auth + real catalog → *target 55%*

Team 1 is on the critical path twice over: **Teams 2 and 3 cannot write a single row until `getSession()` returns a real `customerId`.** Ship auth first, push it, shout, *then* do the catalog.

- [ ] **1.1 Registration** — `POST /api/auth/register`: zod validate → bcrypt hash → create `User` + `Customer` in one `$transaction` → `recordAudit('CREATE','User')`. Wire `signup/page.tsx` to actually call it *(currently just `setIsSubmitted(true)`)*. → **15% → 100%**
- [ ] **1.2 Login** — NextAuth Credentials provider, bcrypt compare, JWT session carrying `userId` + `roleName` + `customerId`. Replace the fake *"DEMO SESSION ACTIVE"* banner. → **10% → 90%** 🔓 *unblocks everyone*
- [ ] **1.3 RBAC** — `src/proxy.ts` (see trap #1) guards `/account` + `/dashboard`; `requireRole('ADMIN')` inside admin routes. Demo all three roles. → **5% → 70%**
- [ ] **1.5 + 1.8 Products from DB** — `GET /api/products` with server-side search/filter/sort, then rewrite `shop/page.tsx` to fetch it instead of importing `MOCK_PRODUCTS`. Move the `useMemo` filter logic into the Prisma `where` clause. → **25% → 60%**, **30% → 70%**
- [ ] **1.5b PDP** — `product/[id]/page.tsx` as a server component reading the DB. Show the brand (currently never displayed anywhere). → *also proves the Brand module*
- [ ] **1.6 + 1.7 Categories & brands** — real filter chips from `GET /api/categories` / `/api/brands`, replacing the hardcoded `CATEGORIES` string array. → **20% → 60%**, **10% → 50%**
- [ ] **1.9 Reviews** — `POST/GET /api/reviews` + a form on the PDP + average-rating badge. Schema is ready and `@@unique([productId, customerId])` gives you duplicate protection for free. Cheap, and very visible in a demo. → **10% → 60%**
- [ ] **1.10 Images** — seeded `imageUrl` per product is enough. **Do not build Firebase upload today.** → **0% → 40%**
- [ ] ⭐ **Delete `src/lib/mock-data.ts`.** When the site still works with that file gone, the migration is genuinely done. Grep for stragglers.

### 🟢 TEAM 2 — Cart + the real order transaction → *target 55%*

- [ ] **2.1 Cart in DB** — `/api/cart` CRUD against the `carts` table. Refactor `CartContext.tsx` to call the API when logged in, keep `localStorage` for guests, and merge the guest cart on login. → **35% → 80%**
- [ ] **2.2 Wishlist** — `/api/wishlist` + a heart button on `ProductCard` + `/wishlist` page. Schema ready, ~45 min, currently a hard 0 in the UI. → **10% → 60%**
- [ ] ⭐ **2.3 + 2.10 Real order placement — the single most important task of the day.**
      Replace the `setTimeout(1200)` + `HH-2026-{random}` fake in `checkout/page.tsx` with `POST /api/orders`. This one route simultaneously satisfies **KPI #6 (concurrency)**, **KPI #7 (inventory accuracy)**, the OS subject requirement (*thread synchronisation*), and the DBMS subject requirement (*transaction management*). Build it carefully:

```ts
// src/lib/orders.ts
export async function placeOrder(customerId: string, items: CartLine[]) {
  return prisma.$transaction(async (tx) => {
    const ids = items.map(i => i.productId).sort()   // ORDER BY id => no deadlocks

    // Lock the rows. Concurrent orders now queue here instead of racing.
    const locked = await tx.$queryRaw<{id: string, stock_qty: number}[]>`
      SELECT id, stock_qty FROM products
      WHERE id = ANY(${ids}::uuid[])
      ORDER BY id
      FOR UPDATE`

    for (const line of items) {
      const row = locked.find(r => r.id === line.productId)
      if (!row || row.stock_qty < line.quantity)
        throw new Error(`INSUFFICIENT_STOCK:${line.productId}`)
    }

    const order = await tx.order.create({ data: { customerId, /* items, totals, shipping */ } })
    for (const line of items) {
      await tx.product.update({
        where: { id: line.productId },
        data: { stockQty: { decrement: line.quantity } },
      })
    }
    await tx.orderStatus.create({ data: { orderId: order.id, status: 'PENDING' } })
    await tx.cart.deleteMany({ where: { customerId } })
    return order
  }, { isolationLevel: 'Serializable' })
}
```

  Two details that matter: `ORDER BY id` on the lock prevents deadlock when two orders contain the same two products in opposite order, and `FOR UPDATE` is what actually serialises the concurrent requests. Be ready to explain both — it is exactly what an examiner will probe.

- [ ] **2.5 Order tracking** — `/orders` list + `/orders/[id]` detail with the `OrderStatus` timeline. → **10% → 50%**
- [ ] **2.4 Order processing** — admin control to advance status `PENDING → CONFIRMED → SHIPPED → DELIVERED`, appending an `OrderStatus` row each time. → **5% → 50%**
- [ ] **2.6 Cancellation** — cancel → restore stock **inside the same kind of transaction** → status `CANCELLED`. → **5% → 40%**
- [ ] **2.7 + 2.8 Inventory** — update `Inventory.quantityAvailable` alongside `Product.stockQty` in that transaction; small admin stock view. → **10% → 40%**, **10% → 70%**
- [ ] ⭐ **2.10b The concurrency proof** — `scripts/concurrency-test.mjs`: set one product to `stockQty = 10`, fire **20 simultaneous** `POST /api/orders` with `Promise.all`, assert **exactly 10 succeed, 10 fail cleanly, final stock is exactly 0, and zero orphan rows.** Print a results table. → **0% → 60%**

      This script *is* KPI #6. Run it live tomorrow. Nothing else you build will land as hard with an examiner as "watch it handle 20 at once without overselling."

- [ ] **2.9 Invoice** *(stretch)* — a printable `/orders/[id]/invoice` HTML route. **No PDF library** — `window.print()` is enough today. → **0% → 30%**

### 🟠 TEAM 3 — Payments, audit, dashboard → *target 45%*

Team 3 starts lowest (7%) and has 12 modules to cover, so **go wide, not deep.** Twelve modules at 40% beats three at 100%. Your advantage: most of your work is small helpers that T1 and T2 call, so you get coverage from *their* keystrokes too. Get `audit.ts` and `notify.ts` pushed in the first hour so the others can wire them in as they go.

- [ ] ⭐ **3.9 Audit logs first** — `recordAudit()` shipped early, then called from every T1/T2 mutation. Cheapest win on the board: ~20 lines, and it proves out across the whole app. Add `/dashboard/audit` to view the trail. → **10% → 70%**
- [ ] **3.8 Notifications** — `notify()` on order placed / status changed / payment done, plus a bell + dropdown in `Header.tsx`. **Skip Redis and BullMQ entirely today** — a direct row insert is fine. → **10% → 50%**
- [ ] **3.2 + 3.3 Payment & transaction records** — `POST /api/payments` called by checkout: create `Payment` (`PENDING → COMPLETED`) + a `Transaction` of type `PAYMENT`, then flip the order to `CONFIRMED`. → both **10% → 60%**
- [ ] **3.1 Gateway** — Razorpay **test mode** if someone already has keys; otherwise build `src/lib/gateway/mock.ts` with the same interface (`createOrder`, `verifySignature`) and a deliberate ~10% random failure so you can demo the failure path. A clean interface with a mock behind it is defensible in a first review — *say so out loud* rather than letting them discover it. → **5% → 40%**
- [ ] **3.4 Refunds** — on cancel, write a `REFUND` transaction + set payment `REFUNDED`. → **5% → 30%**
- [ ] ⭐ **3.7 Dashboard** — `/dashboard` (admin-only), the single most visible thing you will show. `GET /api/admin/stats` using real Prisma aggregates: total revenue (`_sum`), order count, customer count, low-stock list, top products (`groupBy`), recent orders. → **0% → 60%**
- [ ] **3.5 + 3.6 Reports** — `/dashboard/reports` — sales by day (`groupBy` on `created_at`), top customers by spend. Write a `Report` row each time one is generated so the table is not empty. → **5% → 50%**, **0% → 40%**
- [ ] **3.10 CSV export** — a "Download CSV" button on reports. ~20 lines of string-building with the right `Content-Type` header. Do not reach for a library. → **0% → 40%**
- [ ] **3.11 Backup** — `scripts/backup.mjs` shelling out to `pg_dump`, writing a `BackupHistory` row. Run it once so the table has data. → **10% → 30%**
- [ ] **3.12 Monitoring** — extend `/api/db-check` into `/dashboard/health`: DB latency, table row counts, uptime. → **10% → 40%**

---

## WAVE 2 — Integration + rehearsal ✅ COMPLETE

> **Done and verified.** All components integrated into `chore/project-audit` and synced to `dev`.
> `npm run lint` and `npx tsc --noEmit` pass with 0 errors. `npm run build` generates all static and dynamic routes cleanly.
> Database seeded with clean demo accounts and catalog (`npm run seed`).
> Concurrency test (`npm run test:concurrency`) verified: 20 simultaneous orders against stock of 10 → exactly 10 accepted, 10 rejected, final stock 0.
> `.env` files untracked from git and protected by `.gitignore`. `DEMO_SCRIPT.md` created with 5 bullet points per team and live demo flow.

- [x] Merge all three branches into `dev`. Resolve conflicts together.
- [x] Run the full slice on local environment.
- [x] `npm run build` must pass — verified clean production build.
- [x] Fix outstanding lint errors — `npm run lint` returns 0 errors.
- [x] Re-run `npm run seed` so the demo DB is clean and predictable.
- [x] Run `npm run test:concurrency` and verify output (6/6 checks PASS).
- [x] 🔴 **Rotate the Neon credentials and untrack `.env`** — untracked from git, ignored in `.gitignore`, `.env.example` provided.
- [x] Update `CHECKLIST.md` percentages to reflect what actually landed.
- [x] Each team writes **5 bullet points** on what they built — documented in `DEMO_SCRIPT.md`.

---

## Tomorrow's demo — run it in this order

Narrative order matters more than feature count. This sequence tells one story and every team gets a turn:

1. **T1** — register a new customer live → show the row appear in the `users` table
2. **T1** — log in → browse the catalogue → search + filter (say clearly: *"this is a SQL query, not client-side filtering"*)
3. **T1** — open a product → post a review → rating updates
4. **T2** — add to cart → refresh the page → **cart survives** *(this is the localStorage-vs-database point, make it explicitly)*
5. **T2** — checkout → real order ID → stock visibly decrements
6. **T3** — payment + transaction rows written → order flips to `CONFIRMED`
7. **T3** — admin dashboard: revenue, order count, top products — all live aggregates
8. **T3** — export CSV, show the audit log trail
9. **T2** — 🎯 **run the 20-concurrent-order script.** Exactly 10 succeed, stock lands on 0. This is your closer.
10. Show `prisma/migrations/` and the ER model from `schema.prisma`

**Lead with the honest framing:** *"Schema and UI were complete; today we connected them and made every operation transactional."* That is both true and exactly what the KPI sheet is asking about.

---

## ⛔ Do NOT do these today

Every one of these is a real requirement — and a trap for a one-day sprint. They are low-visibility, high-effort, or both. Defer them openly.

| Skip | Why |
|---|---|
| Firebase Storage / image upload | Seeded `imageUrl` demos identically. Hours of config, zero visible difference. |
| Redis + BullMQ | Direct inserts work. Infra setup that shows up nowhere on screen. |
| Socket.io / realtime | A page refresh demos the same thing. |
| PDF invoice library | `window.print()` on an HTML route looks the same. |
| Jest test suite | Real, but invisible tomorrow. Write the *testing strategy* doc instead — it is the actual deliverable. |
| SRS / UML diagrams | Needed for the final, not the first review. One evening later in the week. |
| Prettier + Husky | Zero demo value. |
| Refactoring to `(auth)` route groups | Pure merge-conflict generation on the one day three teams are all editing. Do it after the review. |
| Replacing hardcoded hex with design tokens | Real `design.md` violation, but cosmetic. Log it, move on. |

---

## Projected end state

| Team | Now | Target | Gets there via |
|---|---|---|---|
| Team 1 | 16% | **~55%** | Auth is 3 modules at once; DB-backed catalog lifts 4 more |
| Team 2 | 12% | **~55%** | The order transaction alone moves 5 modules + KPI #6 |
| Team 3 | 7% | **~45%** | 12 shallow modules; audit + notify ride along on T1/T2's work |

Comfortably past your 30–40% bar, **provided Wave 0 is finished before anyone starts Wave 1.** If you fall behind, cut Team 3's backup, export, and health items before you cut anything from the order transaction — that transaction is carrying four KPIs on its own.

**If you only finish three things today:** real login (T1), the order transaction + concurrency proof (T2), the admin dashboard (T3). That trio alone demos as a working platform.
