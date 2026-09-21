# Project Review Demo Script

> **Opening Hook (Say this first):**  
> *"Our database schema and UI shell were already designed; in this push we connected the two halves into a single, fully transactional vertical slice running entirely on Postgres."*

---

## 5 Bullet Points Per Team (Review Script)

### 🔵 Team 1 — Customer & Product Management
1. **Full Authentication & RBAC**: NextAuth v5 + bcrypt password hashing with JWT sessions carrying `role` + `customerId`. Protected routes enforced via Next.js 16 `proxy.ts`.
2. **Atomic Customer Registration**: `/api/auth/register` creates `User` and `Customer` rows in a single atomic `$transaction`, with audit logging.
3. **Database-Driven Catalog**: Fully removed `mock-data.ts`. The `/shop` page queries Postgres directly with SQL-level search, category, brand, and stock filters.
4. **Product Reviews & Appraisals**: `/api/reviews` GET/POST with duplicate submission protection (`@@unique([productId, customerId])`), average score badges, and interactive feedback forms.
5. **Server-Rendered Product Details (PDP)**: Dynamic `/product/[id]` server components displaying live pricing, brand associations, and authoritative stock.

### 🟢 Team 2 — Order & Inventory Management
1. **Hybrid Persistent Cart**: Guest cart in `localStorage` automatically merges into the PostgreSQL `carts` table upon authentication and survives page reloads.
2. **Atomic Order Placement**: Implemented in `src/lib/orders.ts` using `SELECT ... FOR UPDATE` with `ORDER BY id` to eliminate deadlocks and guarantee serializable isolation.
3. **Verified Concurrency (KPI #6)**: Successfully proven by automated test: 20 simultaneous orders against 10 units of stock result in **exactly 10 accepted, 10 rejected, and stock ending at 0**.
4. **Wishlist & Saved Specimens**: Dedicated `/wishlist` archive and quick-action heart toggles across catalog cards and PDPs, with one-click "Move to Bag".
5. **Order Lifecycle & Printable Invoices**: Admin control center at `/dashboard/orders` to advance statuses (`CONFIRMED → SHIPPED → DELIVERED`) and dedicated print-ready invoices at `/orders/[id]/invoice`.

### 🟠 Team 3 — Payments, Audit, Analytics & Admin
1. **Payment & Transaction Accounting**: Atomic `/api/payments` writes both `Payment` and `Transaction` ledger records, advancing orders to `CONFIRMED`.
2. **Universal Audit Trail**: Centralized `recordAudit()` automatically invoked across mutations from all 3 teams; viewable live at `/dashboard/audit`.
3. **Transactional Refund Rollback**: Order cancellation automatically restores product inventory and creates an immutable `REFUND` transaction record.
4. **Live Notifications & Bell Dropdown**: Transactional alerts automatically triggered on orders and status updates, viewable in real-time via the header notification bell.
5. **Admin Analytics, Health Diagnostics & Backups**: `/dashboard` real-time SQL aggregates, `/dashboard/health` live Postgres latency & row metrics, and `npm run backup` automated snapshot export.

---

## Complete Demo Sequence (Run in this exact order)

| Step | Owner | Action | What to Say / Point Out |
|---|:---:|---|---|
| **1** | **T1** | Go to `/signup` → Register a new customer (`demo-user@test.com`) | *"New user and customer profile are created in a single DB transaction with hashed password."* |
| **2** | **T1** | Go to `/shop` → Search "hoodie", filter by brand | *"All search and filters are server-side SQL queries, not client-side array filters. Mock data is completely deleted."* |
| **3** | **T1** | Open product → Post a 5-star review → Rating badge updates | *"Reviews enforce unique customer constraints in Postgres and recalculate average ratings in real time."* |
| **4** | **T2** | Click heart icon to save to Wishlist → Open `/wishlist` | *"Wishlist bookmarks are synced to Postgres under this user profile with one-click 'Move to Bag'."* |
| **5** | **T2** | Add to cart → Refresh the page | *"The cart is persisted to Postgres under this customer's account; it survives browser refresh."* |
| **6** | **T2** | Go to `/checkout` → Place order | *"Order placed with atomic row-locking. Notice stock has decremented."* |
| **7** | **T3** | View `/orders` → Order shows `CONFIRMED` → Click **"Print Invoice"** | *"Payment and transaction rows are recorded in the DB ledger. Here is the formal printable invoice."* |
| **8** | **T3** | Check **Notification Bell 🔔** in header | *"Real-time system notification delivered confirming order and payment dispatch."* |
| **9** | **T3** | Sign in as `admin@hellohello.studio` → Open `/dashboard` | *"Live admin dashboard: revenue, order volume, and top products calculated by SQL aggregates."* |
| **10** | **T2** | Open `/dashboard/orders` → Click **"Ship ↗"** on the order | *"Admin order management advances order status and sends fulfillment notification to customer."* |
| **11** | **T3** | Open `/dashboard/health` & `/dashboard/audit` | *"Shows live Postgres round-trip latency, table row inventories, and full audit trail."* |
| **12** | **T2** | 🎯 **Terminal:** `npm run test:concurrency` | *"20 concurrent orders hit a product with only 10 in stock. 10 succeed, 10 fail cleanly, final stock is 0. KPI #6 verified."* |
| **13** | **T3** | **Terminal:** `npm run backup` | *"Automated snapshot pipeline dumps DB schema/data and registers a backup audit record."* |
| **14** | **All** | Show `prisma/schema.prisma` and `prisma/migrations/` | *"All 20 tables mapped, migration scripts version-controlled and reproducible."* |

---

## Demo Credentials
- **Customer**: `customer@hellohello.studio` · Password: `Password123!`
- **Admin**: `admin@hellohello.studio` · Password: `Password123!`
