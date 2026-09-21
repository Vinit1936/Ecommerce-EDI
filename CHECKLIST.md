# Implementation Checklist — E-Commerce Order Management Platform

Audit date: **2026-09-21** · Branch: `main` @ `3e4a6a0` · Source of truth: `E-commerce order Management.pdf`

---

## TL;DR

The repo is a **design-complete frontend shell on mock data, plus a fully-modelled empty database.** The two halves have never been connected.

| Layer | State |
|---|---|
| Prisma schema | 20 tables live on Neon Postgres, covering all 3 teams' required tables |
| Database rows | **Empty** — only `roles` has 2 rows (leftover from a CRUD test script) |
| Frontend | 7 pages, pixel-complete, **100% driven by `src/lib/mock-data.ts`** (13 hardcoded products) |
| API routes | **1 total** — `/api/db-check` (health check) |
| Auth | **None.** No NextAuth, no bcrypt, no sessions, no middleware |
| Prisma usage in app | **Only** in `/api/db-check`. Zero UI reads/writes touch the DB |
| Tests | None |

**Overall functional completeness vs. the PDF: roughly 18–20%.** Schema design is genuinely ahead of schedule; application logic has not started.

> Percentages below are estimates weighted so that *schema alone ≈ 10%, schema + UI on mock data ≈ 25–35%, wired end-to-end ≈ 100%*.

---

## Local Setup — Verified Working

```bash
npm install          # 580 packages
npx prisma generate  # Prisma Client v7.9.1
npm run dev          # http://localhost:3000 — ready in ~0.7s
npm run build        # passes
```

Smoke-tested and confirmed on this machine:

| Route | Status |
|---|---|
| `/` `/shop` `/cart` `/checkout` `/login` `/signup` | `200` |
| `/product/hh-01` | `200` (IDs are `hh-01`…`hh-13`; `/product/1` correctly 404s) |
| `/api/db-check` | `200` — connected to **PostgreSQL 18.6** on Neon |

**Environment:** `.env` / `.env.local` are committed (commit `3e4a6a0` "Pushed env file") and already contain working `DATABASE_URL` (pooled) + `DIRECT_URL` (unpooled) Neon credentials, so setup needs no manual env work. See *Risks* below — this should be corrected.

### One fix applied during setup

`npm run build` failed with:

```
prisma.config.ts(39,5): error TS2353: 'directUrl' does not exist in type
'{ url?: string; shadowDatabaseUrl?: string; }'
```

Prisma 7 dropped `directUrl` from the config `Datasource` type. Since `prisma.config.ts` drives only the CLI (migrate/studio) — the runtime client connects via `src/lib/db.ts` — the datasource now prefers the unpooled URL:

```ts
url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
```

Build passes after this change. **This is the only code edit made during the audit.**

### Known issues, not yet fixed

- **No `prisma/migrations/` directory.** Tables were created with `prisma db push`, so there is no migration history. The PDF requires *"Database Scripts"* as a deliverable from all three teams — this needs `prisma migrate dev` to produce real, reviewable SQL.
- **`npm run lint` → 4 errors, 2 warnings**, incl. `react-hooks/set-state-in-effect` in `CartContext.tsx:35` and an unescaped `'` in `Footer.tsx:70`.
- `scripts/verify-db-tables.mjs` crashes on the enum section (`e.enum_values.join is not a function`). Table listing works.
- `next lint` no longer exists in Next 16 — use `npm run lint`.
- `package.json` is still named `"temp_app"`.

---

## Cross-Team Blockers — Do These First

Nothing below can be built properly until these land. They are **nobody's worklet and therefore everybody's risk.**

| # | Item | Owner | Status |
|---|---|---|---|
| C1 | **Auth foundation** (NextAuth + bcrypt + session + role middleware) — Teams 2 & 3 are blocked without a `customerId` on the request | Team 1 | ❌ Not started |
| C2 | **Seed script** — DB is empty; no products means no cart, no orders, no payments, no reports | Team 1 | ❌ Not started |
| C3 | **Replace `mock-data.ts` with real DB reads** — the single largest piece of work in the repo | Team 1 → all | ❌ Not started |
| C4 | **Migration history** (`prisma migrate dev`) instead of `db push` | Shared | ❌ Not started |
| C5 | **Shared API response + Zod validation convention** | Shared | ❌ Not started |
| C6 | **Schema gaps** — see *Schema Gaps* below | Shared | ⚠️ Needed |

### Missing dependencies vs. `Techstack.md`

`Techstack.md` promises these; none are installed: `next-auth`, `zod`, `bcrypt`, `redis`, `bullmq`, `socket.io`, `razorpay`/`stripe`, `firebase`, `jest`, `@testing-library/react`, `prettier`, `husky`.

### Folder structure drift

`Techstack.md` specifies route groups — `/app/(auth)`, `/app/(cart)`, `/app/(dashboard)` etc. The actual tree is flat: `src/app/login`, `src/app/cart`, `src/app/checkout`. Either adopt the documented structure now, before three teams add files, or update the doc. Leaving both is how merge conflicts happen.

---

## TEAM 1 — Customer & Product Management

**Progress: ~16%** — the catalog *looks* finished but reads zero rows from the database.

| # | Module | Status | % | What exists / what's missing |
|---|---|---|---|---|
| 1.1 | User Registration | 🟡 UI shell | 15% | `signup/page.tsx` renders + validates, but `handleSubmit` just calls `setIsSubmitted(true)`. No API, no hashing, no insert. `users` table ready. |
| 1.2 | Login Authentication | 🟡 UI shell | 10% | `login/page.tsx` shows *"DEMO SESSION ACTIVE"* on submit. No NextAuth, no session, no cookie. **Blocks C1.** |
| 1.3 | Role-Based Access Control | 🔴 Schema only | 5% | `Role` model + FK on `User`; 2 rows seeded. No middleware, no guards, no role checks anywhere. PDF requires Customer / Admin / Vendor. |
| 1.4 | Customer Management | 🔴 Schema only | 10% | `Customer` model (address, city) exists. No profile page, no dashboard, no CRUD. |
| 1.5 | Product Management | 🟡 Read-only mock | 25% | Catalog + PDP fully built against `MOCK_PRODUCTS`. No admin CRUD, no DB reads. |
| 1.6 | Category Management | 🟡 Partial | 20% | Self-referencing `Category` hierarchy in schema (good). UI filters a hardcoded `CATEGORIES` string array. No CRUD. |
| 1.7 | Brand Management | 🔴 Schema only | 10% | `Brand` model + FK. No UI, no CRUD, brand never shown on PDP. |
| 1.8 | Product Search | 🟡 Client-side | 30% | `shop/page.tsx` filters by name/specimen/category + sort + in-stock, all in `useMemo` over 13 mock items. Needs server-side query + pagination. |
| 1.9 | Product Reviews & Ratings | 🔴 Schema only | 10% | `ProductReview` model with `@@unique([productId, customerId])`. No UI, no API. |
| 1.10 | Product Image Management | 🔴 Not started | 0% | **`Product` has no image column at all.** Images are hardcoded URLs in mock data. Firebase Storage not installed. PDF ties this to the OS subject. |

**Deliverables:** Login Module ❌ · Customer Mgmt ❌ · Product Mgmt 🟡 · Category 🟡 · Brand ❌ · DB Scripts ⚠️ (schema yes, migrations no) · UML ❌ · Unit Test Report ❌

---

## TEAM 2 — Order & Inventory Management

**Progress: ~12%** — cart UX is the most polished thing in the repo, and also the most disposable: it lives in `localStorage` and vanishes on a different browser.

| # | Module | Status | % | What exists / what's missing |
|---|---|---|---|---|
| 2.1 | Shopping Cart Management | 🟡 localStorage | 35% | `CartContext.tsx` (155 lines) — add/remove/update/clear, subtotal, size+colour variants, persisted to `hh_ecommerce_cart_v1`. `carts` table exists but is **never written to**. |
| 2.2 | Wishlist Management | 🔴 Schema only | 10% | `Wishlist` model ready. No UI, no button, no route. |
| 2.3 | Order Placement | 🟡 Fake | 20% | `checkout/page.tsx` (359 lines) — full address form + shipping tiers. `handlePlaceOrder` runs `setTimeout(1200)` and invents `HH-2026-{random}`. Nothing persists. |
| 2.4 | Order Processing | 🔴 Not started | 5% | `OrderStatusType` enum only. No state machine, no transitions. |
| 2.5 | Order Tracking | 🔴 Schema only | 10% | `OrderStatus` history table modelled. No orders page, no tracking view. |
| 2.6 | Order Cancellation | 🔴 Not started | 5% | `CANCELLED` / `RETURNED` enum values exist. No logic, no stock restoration. |
| 2.7 | Inventory Management | 🔴 Schema only | 10% | `Inventory` + `Warehouse` with `@@unique([productId, warehouseId])` — well modelled. Zero logic, zero rows. |
| 2.8 | Stock Management | 🔴 Schema only | 10% | `Product.stockQty` + `Inventory.quantityAvailable`. **Two sources of truth — decide which is authoritative.** No decrement on order. |
| 2.9 | Invoice Generation | 🔴 Not started | 0% | No model, no PDF lib, no storage. Checkout confirmation is screen-only. |
| 2.10 | Concurrent Order Processing | 🔴 Not started | 0% | **KPI #6 requires 20 concurrent orders with no race conditions.** Needs `prisma.$transaction` + row locking (`SELECT … FOR UPDATE`) or optimistic version checks. Highest-risk unstarted item in the project. |

**Deliverables:** Cart Module 🟡 · Order Mgmt ❌ · Inventory ❌ · Invoice ❌ · Concurrency Demo ❌ · DB Scripts ⚠️ · UML ❌ · Unit Tests ❌

---

## TEAM 3 — Payment, Reports, Analytics & Administration

**Progress: ~7%** — schema tables exist; essentially no implementation. Also owns final integration.

| # | Module | Status | % | What exists / what's missing |
|---|---|---|---|---|
| 3.1 | Payment Gateway Integration | 🔴 Not started | 5% | `RAZORPAY_*` / `STRIPE_*` keys are empty placeholders in `.env.example`; neither SDK installed. |
| 3.2 | Payment Processing | 🔴 Schema only | 10% | `Payment` model (amount, status, `gatewayTxnId`). Checkout has **no payment step at all** — it jumps straight to confirmation. |
| 3.3 | Transaction Management | 🔴 Schema only | 10% | `Transaction` model + `TransactionType`/`TransactionStatus` enums. No logic. |
| 3.4 | Refund Processing | 🔴 Not started | 5% | `REFUND` / `REFUNDED` enum values exist. Nothing else. |
| 3.5 | Sales Reports | 🔴 Schema only | 5% | `Report` model is thin — `type` + `generatedBy` + `generatedAt`, **no params, no result payload, no file URL.** Needs redesign. |
| 3.6 | Customer Reports | 🔴 Not started | 0% | — |
| 3.7 | Dashboard & Analytics | 🔴 Not started | 0% | No `/dashboard` route, no admin area of any kind. |
| 3.8 | Notifications | 🔴 Schema only | 10% | `Notification` model ready. No UI, no delivery, no Redis/BullMQ. |
| 3.9 | Audit Logs | 🔴 Schema only | 10% | `AuditLog` well-indexed on `[entity, entityId]`. Nothing writes to it. |
| 3.10 | Export Reports | 🔴 Not started | 0% | No CSV/PDF export. |
| 3.11 | Backup & Restore | 🔴 Schema only | 10% | `BackupHistory` + `BackupStatus` enum. No scheduling, no job. |
| 3.12 | System Monitoring | 🟡 Minimal | 10% | `/api/db-check` returns DB health + PG version. That is the entire monitoring surface. |

**Deliverables:** Payment ❌ · Dashboard ❌ · Reports ❌ · Notifications ❌ · Audit Log ❌ · Backup ❌ · Integration Report ❌ · Testing Report ❌

---

## Common Responsibilities (All Teams)

| Item | Status | Notes |
|---|---|---|
| SRS | ❌ | Not in repo |
| ER Diagram | ⚠️ | `schema.prisma` is the de-facto ER model, but no diagram artifact exists |
| Database Schema | ✅ | Strongest asset — 20 tables, UUID PKs, `@@map` snake_case, correct indexes, deliberate `onDelete` (Restrict vs Cascade) |
| Table Names & Primary Keys | ✅ | Consistent `uuid()` PKs, snake_case table names |
| Coding Standards | ⚠️ | ESLint configured but failing; no Prettier/Husky despite `Techstack.md` |
| Folder Structure | ⚠️ | Documented structure ≠ actual structure (see drift note above) |
| Naming Conventions | ✅ | Consistent camelCase TS ↔ snake_case SQL |
| API/Function Interfaces | ❌ | Only 1 route exists; no contract, no shared response shape |
| Git Repo Structure | ⚠️ | `main` + `feature/ecommerce-frontend` only. `Techstack.md` promises `dev` + `team-N/*` branches — **create these before parallel work starts** |
| UI Design Standards | ✅ | `design.md` (8.3KB) + 6 shared components. **But:** every page hardcodes hex `#F0301A` / `#EFE7DC` inline, which `design.md` explicitly forbids ("no raw hex in components") |
| System Architecture | ⚠️ | `Techstack.md` covers it; not all of it is real yet |
| Testing Strategy | ❌ | No test runner, no tests, no strategy doc |

---

## Schema Gaps to Resolve Jointly

The schema is good, but these fields are needed before the UI can be wired to it:

| Model | Missing | Needed by |
|---|---|---|
| `Product` | `description`, `sku`, `imageUrl`/`images`, `isFeatured`, `isNew` — all present in mock data, none in DB | Team 1 (1.10), Team 2 |
| `Customer` | `firstName`, `lastName`, `phone`, `postalCode`, `country` — the checkout form collects all of these | Team 1, Team 2 (2.3) |
| `Order` | shipping address snapshot, shipping method, shipping cost — checkout computes these and drops them | Team 2 (2.3) |
| `Order` | no `Invoice` model exists at all | Team 2 (2.9) |
| `Report` | no parameters / result / file URL columns | Team 3 (3.5) |
| `User` | `isActive`, `lastLoginAt` | Team 1 (1.3) |
| Stock | `Product.stockQty` vs `Inventory.quantityAvailable` — pick one authority | Team 2 (2.8) |

---

## KPI Readiness

| # | KPI | Target | Now |
|---|---|---|---|
| 1 | Functional Completeness | 100% of modules | ~18% |
| 2 | Automation Coverage | 100% automated | ~5% — nothing writes to the DB |
| 3 | Auth & RBAC | 3 roles, secure login | ❌ 0% — no auth exists |
| 4 | Database Integrity | No duplicates/orphans | ✅ Constraints + FKs in place; untested against real data |
| 5 | Response Time | ≤ 2s | ✅ Currently instant (no queries); re-measure once wired |
| 6 | Concurrent Orders | 20 concurrent, no races | ❌ 0% — **highest project risk** |
| 7 | Inventory Accuracy | 100% after every txn | ❌ 0% |
| 8 | Payment Accuracy | 100% recorded | ❌ 0% |
| 9 | Code Quality & Docs | SRS/UML/ER/API/tests | ❌ ~10% — schema only |
| 10 | Integration & Reliability | 3 worklets integrated | ❌ 0% |

---

## Risks

1. **`.env` with live Neon credentials is committed to git** (`3e4a6a0`). `.gitignore` does not cover it. These credentials are in the repo history and should be **rotated in the Neon console**, the files removed from tracking (`git rm --cached .env .env.local`), and `.gitignore` updated. Keep `.env.example` only.
2. **Concurrency (KPI #6) is worth starting early.** It is the only KPI that cannot be retrofitted cheaply — it dictates how every order-write is structured.
3. **`mock-data.ts` → DB is a wide, cross-cutting migration.** Every page imports it. The longer three teams build on top of mock data, the more expensive the swap becomes.
4. **No migration history** means schema changes across three teams have no review trail and no rollback.
5. **Cart is `localStorage`-only**, so it cannot survive login, device switching, or feed order placement — it must move server-side once auth lands.

---

## Suggested Order of Work

**Phase 0 — unblock (Team 1 leads)**
C4 migrations → C2 seed script → C1 auth + RBAC → C5 API conventions → C6 schema gaps agreed by all three teams.

**Phase 1 — wire up (parallel)**
- T1: products/categories/brands read from DB; delete `mock-data.ts`; admin CRUD
- T2: cart moves from `localStorage` to the `carts` table
- T3: payment gateway sandbox + `/dashboard` skeleton

**Phase 2 — core flows**
- T2: real order placement in a `$transaction`, stock decrement, tracking, cancellation
- T3: payment ↔ order linkage, transactions, audit logging on every write

**Phase 3 — KPI + deliverables**
- T2: concurrency demo (20 parallel orders), invoices
- T3: reports, analytics, exports, backup, integration report
- All: SRS, UML, ER diagram, unit + integration test reports
