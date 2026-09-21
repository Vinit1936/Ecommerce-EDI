# Project Review Demo Script

> **Opening Hook (Say this first):**  
> *"Our database schema and UI shell were already designed; in this push we connected the two halves into a single, fully transactional vertical slice running entirely on Postgres."*

---

## 5 Bullet Points Per Team (Review Script)

### 🔵 Team 1 — Customer & Product Management
1. **Full Authentication & RBAC**: NextAuth v5 + bcrypt password hashing with JWT sessions carrying `role` + `customerId`. Protected routes enforced via Next.js 16 `proxy.ts`.
2. **Atomic Customer Registration**: `/api/auth/register` creates `User` and `Customer` rows in a single atomic `$transaction`, with audit logging.
3. **Database-Driven Catalog**: Fully removed `mock-data.ts`. The `/shop` page queries Postgres directly with SQL-level search, category, brand, and stock filters.
4. **Server-Rendered Product Details (PDP)**: Dynamic `/product/[id]` server components displaying live pricing, brand associations, and authoritative stock.
5. **Data Model Integrity**: Strict foreign key cascades, role enforcement (`ADMIN`, `CUSTOMER`, `VENDOR`), and review duplicate prevention via compound unique constraints.

### 🟢 Team 2 — Order & Inventory Management
1. **Hybrid Persistent Cart**: Guest cart in `localStorage` automatically merges into the PostgreSQL `carts` table upon authentication and survives page reloads.
2. **Atomic Order Placement**: Implemented in `src/lib/orders.ts` using `SELECT ... FOR UPDATE` with `ORDER BY id` to eliminate deadlocks and guarantee serializable isolation.
3. **Verified Concurrency (KPI #6)**: Successfully proven by automated test: 20 simultaneous orders against 10 units of stock result in **exactly 10 accepted, 10 rejected, and stock ending at 0**.
4. **Authoritative Stock Management**: `Product.stockQty` decrements under row lock while synchronizing `Inventory.quantityAvailable` inside the same transaction.
5. **Order Lifecycle & Rollback**: Complete status tracking (`PENDING` → `CONFIRMED`) and cancellation endpoint that restores stock transactionally.

### 🟠 Team 3 — Payments, Audit, Analytics & Admin
1. **Payment & Transaction Accounting**: Atomic `/api/payments` writes both `Payment` and `Transaction` ledger records, advancing orders to `CONFIRMED`.
2. **Pluggable Payment Gateway**: Clean adapter interface in `src/lib/gateway/` supporting mock test-mode execution with realistic failure handling.
3. **Universal Audit Trail**: Centralized `recordAudit()` automatically invoked across mutations from all 3 teams; viewable live at `/dashboard/audit`.
4. **Admin Dashboard Analytics**: Real-time business metrics at `/dashboard` computed via PostgreSQL aggregates (`_sum`, `_count`, `groupBy`) for revenue and top products.
5. **Report Generation & CSV Export**: Sales aggregation by date range with immediate CSV streaming export and report history tracking.

---

## Demo Sequence (Run in this exact order)

| Step | Owner | Action | What to Say / Point Out |
|---|:---:|---|---|
| **1** | **T1** | Go to `/signup` → Register a new customer (`demo-user@test.com`) | *"New user and customer profile are created in a single DB transaction with hashed password."* |
| **2** | **T1** | Go to `/shop` → Search "hoodie", filter by brand | *"All search and filters are server-side SQL queries, not client-side array filters. Mock data is completely deleted."* |
| **3** | **T2** | Open product → Add to cart → Refresh the page | *"The cart is persisted to Postgres under this customer's account; it survives browser refresh."* |
| **4** | **T2** | Go to `/checkout` → Place order | *"Order placed with atomic row-locking. Notice stock has decremented."* |
| **5** | **T3** | View `/orders` → Order shows `CONFIRMED` | *"Payment and transaction rows are recorded in the DB ledger."* |
| **6** | **T3** | Sign in as `admin@hellohello.studio` → Open `/dashboard` | *"Live admin dashboard: revenue, order volume, and top products calculated by SQL aggregates."* |
| **7** | **T3** | Open `/dashboard/audit` & `/dashboard/reports` | *"Audit trail of all mutations + real-time CSV export."* |
| **8** | **T2** | 🎯 **Terminal:** `npm run test:concurrency` | *"20 concurrent orders hit a product with only 10 in stock. 10 succeed, 10 fail cleanly, final stock is 0. KPI #6 verified."* |
| **9** | **All** | Show `prisma/schema.prisma` and `prisma/migrations/` | *"All 20 tables mapped, migration scripts version-controlled and reproducible."* |

---

## Demo Credentials
- **Customer**: `customer@hellohello.studio` · Password: `Password123!`
- **Admin**: `admin@hellohello.studio` · Password: `Password123!`
