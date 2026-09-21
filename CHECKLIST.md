# Implementation Checklist — E-Commerce Order Management Platform

Audit date: **2026-09-21** · Branch: `main` @ `3e4a6a0` · Source of truth: `E-commerce order Management.pdf`

---

## TL;DR

The repo is a **design-complete frontend shell on mock data, plus a fully-modelled empty database.** The two halves have never been connected.

| Layer | State |
|---|---|
| Prisma schema | 20 tables live on Neon Postgres, covering all 3 teams' required tables |
| Database rows | **Seeded** (Wave 0) — 12 products, 4 brands, 5 categories, 1 warehouse, 2 demo users |
| Frontend | 13 routes, all reading live data. `mock-data.ts` has been **deleted** |
| API routes | **12** — auth, products, categories, brands, cart, orders, cancel, payments, admin stats, CSV export |
| Auth | **Working** (Wave 0) — NextAuth v5 + bcrypt, JWT session carrying `role` + `customerId`, `proxy.ts` route guard |
| Prisma usage in app | Throughout — every page and route reads/writes Postgres |
| Tests | `npm run test:concurrency` (KPI #6 proof, 6/6 checks pass) |

**Overall functional completeness vs. the PDF: roughly 55%** (was ~18% at audit time). Waves 0 and 1 are complete: the catalogue, cart, orders, payments and dashboard all run against Postgres.

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
| `/product/hh-01` | `200` (IDs are `hh-01`…`hh-12`; `/product/1` correctly 404s) |
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

- ~~No `prisma/migrations/` directory.~~ **Resolved in Wave 0.** The live database was baselined as `0_init` (non-destructive) and the schema-gap changes applied as `20260921193804_add_catalog_customer_order_fields`. Real reviewable SQL now exists — the *"Database Scripts"* deliverable is satisfied.
- **`npm run lint` → 4 errors, 2 warnings**, incl. `react-hooks/set-state-in-effect` in `CartContext.tsx:35` and an unescaped `'` in `Footer.tsx:70`.
- `scripts/verify-db-tables.mjs` crashes on the enum section (`e.enum_values.join is not a function`). Table listing works.
- `next lint` no longer exists in Next 16 — use `npm run lint`.
- `package.json` is still named `"temp_app"`.

---

## Cross-Team Blockers — Do These First

Nothing below can be built properly until these land. They are **nobody's worklet and therefore everybody's risk.**

| # | Item | Owner | Status |
|---|---|---|---|
| C1 | **Auth foundation** (NextAuth + bcrypt + session + role middleware) | Team 1 | ✅ **Done** — `src/lib/auth.ts`, `src/proxy.ts`. Verified: session returns real `customerId` |
| C2 | **Seed script** | Team 1 | ✅ **Done** — `prisma/seed.ts`, idempotent, `npm run seed` |
| C3 | **Replace `mock-data.ts` with real DB reads** — the single largest piece of work in the repo | Team 1 → all | ❌ Not started |
| C4 | **Migration history** instead of `db push` | Shared | ✅ **Done** — baselined `0_init` + delta migration |
| C5 | **Shared API response + Zod validation convention** | Shared | ✅ **Done** — `src/lib/api.ts` (`ok`/`fail`); zod installed |
| C6 | **Schema gaps** — see *Schema Gaps* below | Shared | ✅ **Done** — all closed in the Wave 0 migration |

### Missing dependencies vs. `Techstack.md`

Installed in Wave 0: `next-auth@beta`, `zod`, `bcryptjs`, `tsx`.

Still missing (deliberately deferred — see TODAY.md *Do NOT do these today*): `redis`, `bullmq`, `socket.io`, `razorpay`/`stripe`, `firebase`, `jest`, `@testing-library/react`, `prettier`, `husky`.

### Folder structure drift

`Techstack.md` specifies route groups — `/app/(auth)`, `/app/(cart)`, `/app/(dashboard)` etc. The actual tree is flat: `src/app/login`, `src/app/cart`, `src/app/checkout`. Either adopt the documented structure now, before three teams add files, or update the doc. Leaving both is how merge conflicts happen.

---

## TEAM 1 — Customer & Product Management

**Progress: ~60%** — the catalogue is fully database-backed; `mock-data.ts` is deleted.

| # | Module | Status | % | What exists / what's missing |
|---|---|---|---|---|
| 1.1 | User Registration | ✅ Done | 100% | `POST /api/auth/register`, zod + bcrypt, User+Customer in one transaction, audit logged. Signup page wired. |
| 1.2 | Login Authentication | ✅ Done | 90% | NextAuth v5 credentials, JWT session carrying role + customerId. |
| 1.3 | Role-Based Access Control | ✅ Done | 70% | 3 roles seeded, `requireRole`/`requireCustomer` guards, `proxy.ts` route gating. Verified CUSTOMER gets 403 on admin stats. |
| 1.4 | Customer Management | 🔴 Schema only | 10% | `Customer` model (address, city) exists. No profile page, no dashboard, no CRUD. |
| 1.5 | Product Management | 🟡 DB-backed | 60% | Catalogue reads Postgres. Admin CRUD still missing. |
| 1.6 | Category Management | 🟡 DB-backed | 60% | Filter chips from `/api/categories`. CRUD still missing. |
| 1.7 | Brand Management | 🟡 DB-backed | 50% | 4 brands seeded, shown on the PDP, filterable. CRUD missing. |
| 1.8 | Product Search | ✅ Server-side | 70% | Search/filter/sort execute as SQL, debounced and abortable. |
| 1.9 | Product Reviews & Ratings | 🔴 Schema only | 10% | `ProductReview` model with `@@unique([productId, customerId])`. No UI, no API. |
| 1.10 | Product Image Management | 🟡 Seeded | 40% | `images[]` column populated. Upload deferred. |

**Deliverables:** Login Module ❌ · Customer Mgmt ❌ · Product Mgmt 🟡 · Category 🟡 · Brand ❌ · DB Scripts ⚠️ (schema yes, migrations no) · UML ❌ · Unit Test Report ❌

---

## TEAM 2 — Order & Inventory Management

**Progress: ~60%** — cart is server-backed and orders are placed atomically under row locks.

| # | Module | Status | % | What exists / what's missing |
|---|---|---|---|---|
| 2.1 | Shopping Cart Management | ✅ Done | 80% | `carts` table authoritative when signed in, localStorage for guests, merged at sign-in. |
| 2.2 | Wishlist Management | 🔴 Schema only | 10% | `Wishlist` model ready. No UI, no button, no route. |
| 2.3 | Order Placement | ✅ Done | 80% | Real orders via `/api/orders`; prices read from the DB, never the request body. |
| 2.4 | Order Processing | 🟡 Partial | 50% | Lifecycle rows + `advanceOrderStatus`. Admin control UI missing. |
| 2.5 | Order Tracking | ✅ Done | 50% | `/orders` with status trail and payment state. |
| 2.6 | Order Cancellation | ✅ Done | 40% | Cancels and restores stock transactionally. |
| 2.7 | Inventory Management | 🟡 Wired | 40% | `Inventory` mirrored inside the order transaction. |
| 2.8 | Stock Management | ✅ Done | 70% | `Product.stockQty` authoritative, decremented under row lock. |
| 2.9 | Invoice Generation | 🟡 Partial | 30% | `Invoice` row + number created with the order. Printable view missing. |
| 2.10 | Concurrent Order Processing | ✅ **PROVEN** | 60% | `npm run test:concurrency` — 20 concurrent, exactly 10 accepted, 10 rejected, stock exactly 0. |

**Deliverables:** Cart Module 🟡 · Order Mgmt ❌ · Inventory ❌ · Invoice ❌ · Concurrency Demo ❌ · DB Scripts ⚠️ · UML ❌ · Unit Tests ❌

---

## TEAM 3 — Payment, Reports, Analytics & Administration

**Progress: ~45%** — payments, audit, notifications, dashboard, reports and CSV export all live.

| # | Module | Status | % | What exists / what's missing |
|---|---|---|---|---|
| 3.1 | Payment Gateway Integration | 🟡 Mock | 40% | `lib/gateway.ts` behind a real adapter interface; failure is opt-in. |
| 3.2 | Payment Processing | ✅ Done | 60% | `/api/payments` writes Payment + Transaction and confirms the order atomically. |
| 3.3 | Transaction Management | ✅ Done | 60% | Transaction rows written with every payment. |
| 3.4 | Refund Processing | 🔴 Not started | 5% | `REFUND` / `REFUNDED` enum values exist. Nothing else. |
| 3.5 | Sales Reports | ✅ Done | 50% | 14-day sales aggregation at `/dashboard/reports`. |
| 3.6 | Customer Reports | ✅ Done | 40% | Top customers by spend (`groupBy`). |
| 3.7 | Dashboard & Analytics | ✅ Done | 60% | `/dashboard`, admin-only, all figures aggregated in Postgres. |
| 3.8 | Notifications | 🟡 Wired | 50% | `notify()` fires on order and payment events. Bell UI missing. |
| 3.9 | Audit Logs | ✅ Done | 70% | Written by every mutating route; viewable at `/dashboard/audit`. |
| 3.10 | Export Reports | ✅ Done | 40% | CSV export, records a Report row. |
| 3.11 | Backup & Restore | 🔴 Schema only | 10% | `BackupHistory` + `BackupStatus` enum. No scheduling, no job. |
| 3.12 | System Monitoring | 🟡 Minimal | 10% | `/api/db-check` only. |

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
