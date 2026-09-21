# 🛍️ Hello Hello Studio — E-Commerce & Enterprise Order Management System

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.0-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.8-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-336791?style=flat&logo=postgresql)](https://neon.tech/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-7.9.1-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Turbopack](https://img.shields.io/badge/Turbopack-Ready-000000?style=flat)](https://turbo.build/pack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A full-stack, luxury e-commerce platform and electronic data interchange (EDI) order processing pipeline engineered with **Next.js 16 (App Router)**, **PostgreSQL (Neon)**, **Prisma ORM**, and strict **ACID-compliant transactional concurrency**.

---

## 🌟 Key Capabilities & Highlights

- **Zero Mock State:** 100% of products, categories, brands, carts, wishlists, orders, payments, reviews, and audit logs are persisted directly in a relational PostgreSQL database.
- **Mathematical Concurrency Safety (KPI #6):** Uses raw SQL `SELECT ... FOR UPDATE` row-level locks with `ORDER BY id` inside a `Serializable` Prisma transaction. Zero overselling under concurrent load (verified by 20-order stress testing).
- **Persistent Cloud Bag & Wishlist:** Shopping carts and bookmarked items are stored in PostgreSQL under each customer account, surviving browser reloads and cross-device usage.
- **Role-Based Access Control (RBAC):** Multi-tier authorization distinguishing `CUSTOMER` shoppers from `ADMIN` staff via encrypted NextAuth v5 JWT sessions and Next.js 16 edge proxy routing (`src/proxy.ts`).
- **Comprehensive Admin Control Center:** Real-time business intelligence metrics (`_sum`, `groupBy` aggregates), order fulfillment workflow (`PENDING → CONFIRMED → SHIPPED → DELIVERED`), CSV sales data export, and live database latency diagnostics.
- **Printable Invoices & Auto-Refunds:** Print-optimized HTML tax invoices (`window.print()`) with scannable barcodes, and automatic stock restitution with financial ledger reversal upon order cancellation.

---

## 🏗️ Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js 16 App Router (Turbopack)                    │
│    Server Components (RSC)  │  Client Components  │  Route Handlers    │
│    (Catalog, PDP, Reports)  │  (Cart, Wishlist)   │  (/api/* REST API) │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌───────────────────┐                               ┌────────────────────┐
│   NextAuth v5     │                               │  Zod Schema Engine │
│   (JWT Sessions   │                               │  (Strict API & DTO │
│   + bcrypt hash)  │                               │   Validation)      │
└───────────────────┘                               └────────────────────┘
         │                                                   │
         └─────────────────────────┬─────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Prisma ORM (v7.9)                               │
│       Type-Safe Query Engine  │  Migrations  │  @prisma/adapter-pg     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Neon Serverless PostgreSQL Database                    │
│     Pooled Connection Gateway (Port 5432 / Transaction Pooling)        │
│     ACID Compliant  │  Row Locks (FOR UPDATE)  │  16 Relational Tables │
└────────────────────────────────────────────────────────────────────────┘
```

| Layer | Technology | Primary Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3.0 | Hybrid Server Components, API routes, Turbopack compilation |
| **Language** | TypeScript 5.x | Strict end-to-end type safety across frontend and backend |
| **Database** | PostgreSQL on Neon | Serverless cloud relational database with ACID guarantees |
| **ORM** | Prisma 7.9.1 | Schema modeling, migration control, type-safe query generation |
| **Authentication** | NextAuth v5 Beta & bcryptjs | Encrypted session cookies, role verification, 10-round salted hashing |
| **Validation** | Zod 4.6.x | Runtime DTO and request payload validation at API boundaries |
| **Styling** | Tailwind CSS v4 & Vanilla CSS | Luxury editorial aesthetic with print-optimized media styles |
| **Icons** | Lucide React | Lightweight, accessible iconography |

---

## 👥 Team Work Breakdown

```
   ┌───────────────────────────────────────────────────────────────┐
   │                       TEAM 1: IDENTITY & CATALOG              │
   │  • Auth & RBAC (NextAuth v5)     • Product Reviews & Ratings  │
   │  • Atomic Registration           • Dynamic Product Detail PDP │
   │  • DB Catalog & SQL Search       • Customer Profile Mgmt      │
   └───────────────────────────────┬───────────────────────────────┘
                                   │
   ┌───────────────────────────────┴───────────────────────────────┐
   │                       TEAM 2: ORDERS & INVENTORY              │
   │  • Persistent Shopping Bag       • Concurrency Proof (KPI #6) │
   │  • Wishlist Module               • Printable HTML Invoices    │
   │  • Atomic Checkout (FOR UPDATE)  • Admin Order Fulfillment    │
   └───────────────────────────────┬───────────────────────────────┘
                                   │
   ┌───────────────────────────────┴───────────────────────────────┐
   │                       TEAM 3: PAYMENTS, AUDIT & DASHBOARD     │
   │  • Payment & Txn Ledger          • Immutable Audit Logging    │
   │  • Auto-Refund on Cancellation   • System Health Diagnostics  │
   │  • Notification Engine           • Automated JSON DB Backups  │
   │  • Executive Aggregates          • Daily Sales CSV Export     │
   └───────────────────────────────────────────────────────────────┘
```

### Team 1 — Customer Identity, Access Control & Catalog Systems (~75%)
- **Authentication & RBAC:** Multi-role login and registration using NextAuth v5, bcrypt hashing, and Next.js 16 `src/proxy.ts` edge guards.
- **Atomic Registration:** Single `$transaction` writing both `User` authentication and `Customer` profile records.
- **SQL-Powered Catalog:** Server-side search (`ILIKE`), brand/category filtering, price sorting, and pagination at `/shop`.
- **Dynamic PDP & Customer Reviews:** Server-rendered product detail views with 1-to-5 star customer review submissions protected by `@@unique([productId, customerId])`.

### Team 2 — Order Fulfillment, Inventory Control & Concurrency (~75%)
- **Database-Persisted Bag:** Shopping cart synced to PostgreSQL (`carts` table), surviving browser refreshes and device switches.
- **Customer Wishlist:** Dedicated `/wishlist` gallery with quick-action heart toggles and 1-click "Move to Bag".
- **Atomic Checkout Engine:** `src/lib/orders.ts` row-locking transaction (`SELECT ... FOR UPDATE` with `ORDER BY id`) decrementing both product stock and inventory records.
- **Concurrency Test (KPI #6):** Proves zero overselling with 20 simultaneous orders hitting 10 available stock units.
- **Order Tracking & Invoices:** Chronological status timeline at `/orders/[id]` and dedicated printable commercial tax receipts at `/orders/[id]/invoice`.
- **Admin Fulfillment Center:** Order dispatch dashboard (`/dashboard/orders`) to advance order stages (`CONFIRMED → SHIPPED → DELIVERED`).

### Team 3 — Payments, Financial Ledger, Admin Analytics & System Health (~75%)
- **Payment & Transaction Ledger:** Atomic accounting writing dual-entry `payments` and `transactions` records.
- **Automated Refund Rollback:** Order cancellation triggers immediate stock restitution and registers an immutable `REFUND` transaction.
- **Real-Time Notification Engine:** Header bell component with unread badges and dropdown feed populated by order lifecycle events.
- **Executive Analytics Dashboard:** Admin business intelligence at `/dashboard` calculating gross revenue, order volume, low-stock warnings, and top-selling products.
- **Sales Reports & CSV Export:** Tabular sales breakdowns with downloadable `.csv` spreadsheet generation.
- **Audit Logging & Health Diagnostics:** Centralized security audit trail at `/dashboard/audit` and live database latency (ms) diagnostics at `/dashboard/health`.
- **Automated Backup Pipeline:** JSON database snapshot export script (`npm run backup`) writing to `/backups` and logging to `backup_histories`.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: Version 20.x or 22.x LTS (`node -v`)
- **Git**: Installed and configured

### 1. Clone & Install
```bash
git clone https://github.com/Vinit1936/Ecommerce-EDI.git
cd Ecommerce-EDI
npm install
```

### 2. Environment Configuration
Create a local `.env` file from the provided template:
```bash
cp .env.example .env
```
Ensure your `.env` contains the working Neon PostgreSQL connection strings:
```env
DATABASE_URL="postgresql://user:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
AUTH_SECRET="your-super-secret-random-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Initialization
```bash
# Generate Prisma Client types
npx prisma generate

# Populate database with seed data (12 products, brands, categories, demo users)
npm run seed
```

### 4. Run the Application
```bash
# Development server:
npm run dev

# Or Production server (recommended):
npm run build
npm run start
```
Visit **`http://localhost:3000`** in your browser.

---

## 🔑 Pre-Configured Demo Accounts

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@hellohello.studio` | `Password123!` | `/dashboard`, order fulfillment, sales reports, CSV export, audit logs, health diagnostics |
| **Customer** | `customer@hellohello.studio` | `Password123!` | Storefront browsing, bag persistence, wishlist, reviews, checkout, invoice printing, cancellation |

---

## 🧪 Verification & Testing Scripts

```bash
# 1. Concurrency Stress Test (Proves KPI #6 zero-overselling)
npm run test:concurrency

# 2. Automated Database Backup Snapshot
npm run backup

# 3. Type Checking & Linting
npm run lint
npx tsc --noEmit
```

---

## 📄 Documentation Sitemap

- [DEMO_SCRIPT.md](DEMO_SCRIPT.md): Step-by-step 14-action review presentation script and team talking points.
- [TODAY.md](TODAY.md): Full development sprint log and completed wave checklists.
- [CHECKLIST.md](CHECKLIST.md): Granular module-by-module implementation status matrix.
- [reviewone.md](reviewone.md): Complete internal architectural dossier with dual-layer plain English and technical explanations.
- [HANDOFF.md](HANDOFF.md): Engineering quickstart guide for teammates.

---

## 📜 License
This project is licensed under the MIT License.
