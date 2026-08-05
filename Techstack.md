# E-Commerce Order Management Platform

A full-stack e-commerce platform built collaboratively by three teams — customer & product management, order & inventory management, and payments/reports/admin. See `EXECUTION_PLAN.pdf` for the detailed team-wise build plan and `design.md` for the UI/design standard.

---

## Tech Stack

### Frontend
- **Next.js 14+ (App Router)** — client and admin UI
- **TypeScript**
- **Tailwind CSS** — themed via `design.md` tokens (no raw hex in components)
- **next/font** — serif (headlines) + grotesk sans (UI/body)

### Backend
- **Next.js API Routes** — REST endpoints per team domain
- **Prisma ORM** — single shared `schema.prisma`, one source of truth for all tables
- **NextAuth.js** — auth/session handling (Credentials provider backed by Postgres)
- **Zod** — server-side request validation

### Database & Storage
- **PostgreSQL** — primary relational store (users, products, orders, payments, etc.)
- **Firebase Storage** — product images, invoice PDFs, backup files (file storage only — not used for auth/identity)

### Infrastructure
- **Redis + BullMQ** — background job queue (invoice generation, notifications) and pub/sub for realtime updates
- **Socket.io / Firebase listeners** — realtime order status push to the client

### Payments
- **Razorpay / Stripe (sandbox/test mode)** — hosted checkout, webhook-verified payment confirmation and refunds

### Tooling
- **ESLint + Prettier** — shared config, enforced via Husky + lint-staged
- **Jest + React Testing Library** — unit tests
- **Postman / Thunder Client** — shared API collection for manual/integration testing

---

## Team Ownership

| Team | Domain | Core Tables |
|---|---|---|
| Team 1 | Customer & Product Management | Users, Roles, Customers, Products, Categories, Brands, ProductReviews |
| Team 2 | Order & Inventory Management | Cart, Wishlist, Orders, OrderItems, Inventory, Warehouses, OrderStatus |
| Team 3 | Payments, Reports, Analytics & Admin | Payments, Transactions, Reports, Notifications, AuditLogs, BackupHistory |

---

## Project Structure

```
/app
  /(auth)          -> Team 1 — login, register
  /(customer)       -> Team 1 — product catalog, customer dashboard
  /(cart)           -> Team 2 — cart, wishlist
  /(orders)         -> Team 2 — checkout, order tracking
  /(payments)       -> Team 3 — payment flow
  /(dashboard)      -> Team 3 — admin dashboard, reports
/components
  /ui               -> shared Button, Card, Badge, PriceTag, Input
  /layout           -> Header, Footer, Nav
  /product          -> ProductCard, ProductGrid, ProductGallery
/prisma
  schema.prisma     -> single shared schema, all teams add models here
/lib
  /db               -> Prisma client
  /auth             -> NextAuth config
  /firebase         -> Firebase Storage helpers
/mock-data          -> typed fake data for frontend-only development
```

---

## Getting Started

```bash
git clone <repo-url>
cd <repo-name>
npm install

# Environment variables
cp .env.example .env.local
# fill in: DATABASE_URL, NEXTAUTH_SECRET, FIREBASE_*, REDIS_URL, PAYMENT_GATEWAY_KEYS

npx prisma migrate dev
npm run dev
```

---

## Branching Strategy

- `main` — protected, production-ready only
- `dev` — shared integration branch, weekly merges from all teams
- `frontend/initial-ui` — frontend UI shell (no backend changes)
- `team-1/*`, `team-2/*`, `team-3/*` — per-team feature branches

---

## Design Reference

All UI work must follow `design.md` — colors, typography, spacing, and component rules. No new colors, fonts, or radii outside what's defined there.
