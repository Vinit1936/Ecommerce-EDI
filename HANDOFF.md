# Handoff — Read This First

Short guide to what has been built and what to keep in mind while working on it.

For full detail see `CHECKLIST.md` (module-by-module status) and `TODAY.md` (the plan).

---

## Start here (do this before anything else)

```bash
git pull
npm install
npx prisma generate
npm run seed
npm run dev
```

There are 3 database migrations. If you skip `npx prisma generate`, you will get
strange errors that look like bugs but are not.

**If something breaks in a weird way, restart the dev server first.** This fixes
most "impossible" errors — they usually mean the server is running an old copy
of the database client.

**Login details** (password for both is `Password123!`):

| Email | Role |
|---|---|
| `admin@hellohello.studio` | ADMIN |
| `customer@hellohello.studio` | CUSTOMER |

---

## What we have built

The project used to be two halves that were never joined: a finished-looking
website running on **fake hardcoded data**, and an empty database. Now they are
connected. Everything you see on screen comes from the real database.

**Working end to end:**

1. Sign up and log in (real accounts, passwords are hashed with bcrypt)
2. Browse products — search, filter, and sort are done by the database, not the browser
3. Product detail page with live stock, sizes, and customer star reviews
4. Wishlist — save items with the heart icon, manage at `/wishlist`, 1-click "Move to Bag"
5. Add to cart — the cart is saved in the database, so it survives a refresh and device switch
6. Checkout — creates a real order and atomically reduces stock
7. Payment is recorded in financial ledger, order becomes CONFIRMED
8. Order history page with status tracking, cancel (cancelling puts stock back and issues refund), and printable invoice
9. Real-time notifications bell in header showing order and fulfillment alerts
10. Admin dashboard with real sales figures, reports, audit log, CSV export, order fulfillment, and DB health latency monitor
11. Admins and customers see different things (customers get blocked from admin pages)

**Proof it works:** run `npm run test:concurrency`. It fires 20 orders at the
same time for a product with only 10 in stock. Exactly 10 succeed, 10 are
rejected, and stock lands on exactly 0. This is KPI #6 and it passes.

**Progress achieved for Review 1:** Team 1 ~75%, Team 2 ~75%, Team 3 ~75%.

---

## Things to remember

### 1. Do not "clean up" the order code

`placeOrder()` in `src/lib/orders.ts` does everything in **one big SQL
statement**. It looks messy. It looks like it should be rewritten into neat
Prisma code.

**Please don't.** We tried that first and it broke — 14 out of 20 orders failed.

The reason: our database is in America and we are in India, so every single
database call takes about 0.3 seconds. While an order is being placed it locks
the product row, and every other order has to wait. So every extra database call
inside that code slows down *every* order at once.

If you do change it, run `npm run test:concurrency` afterwards to check it still
passes.

### 2. Small rules that matter

- **Don't bring back `mock-data.ts`.** It is deleted. Test data now lives in `prisma/seed.ts`.
- **Product has two ids.** `id` is the long database id (use it for API calls). `slug` is the short one like `hh-01` (use it for links).
- **Stock lives in `Product.stockQty`.** `Inventory` is a copy that must be updated at the same time.
- **Never trust prices sent from the browser.** Always read them from the database, or someone could pay less than they should.
- **All API routes reply the same way** — use `ok()` and `fail()` from `src/lib/api.ts`.
- **Call `recordAudit()` and `notify()`** whenever you change something. This is how the audit log and notifications fill up.
- **Check user roles inside the API route**, not in `proxy.ts`. Proxy only checks that someone is logged in.

### 3. Next.js 16 is different from what tutorials say

- The file is **`proxy.ts`**, not `middleware.ts`. If you use the old name, nothing happens and there is no error message.
- **`next lint` no longer exists.** Use `npm run lint`.
- **`npx prisma migrate dev` does not work here** — it needs to ask questions and cannot. Use the steps below instead.

### 4. How to change the database

```bash
# 1. Edit prisma/schema.prisma
# 2. Then run:
git show HEAD:prisma/schema.prisma > prisma/_old.prisma
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_describe_your_change
npx prisma migrate diff --from-schema prisma/_old.prisma \
  --to-schema prisma/schema.prisma --script \
  -o prisma/migrations/<the_folder_you_just_made>/migration.sql
rm prisma/_old.prisma
npx prisma migrate deploy
npx prisma generate
```

**Never run `prisma db push`.** That is what left us with no migration history
in the first place, and the migration files are a graded deliverable.

### 5. Who works where (avoid merge conflicts)

| Team | Folders |
|---|---|
| Team 1 | `api/auth`, `api/products`, `api/categories`, `api/brands`, `lib/auth.ts`, `app/login`, `app/signup`, `app/shop`, `app/product` |
| Team 2 | `api/cart`, `api/orders`, `lib/orders.ts`, `lib/cart.ts`, `components/cart`, `app/cart`, `app/checkout`, `app/orders` |
| Team 3 | `api/payments`, `api/reports`, `api/admin`, `lib/audit.ts`, `lib/notify.ts`, `lib/stats.ts`, `app/dashboard` |

### 6. Before you push

```bash
npm run lint        # must be clean — it is right now
npx tsc --noEmit    # must be clean
npm run build       # must pass
```

---

## Honest weak points (mention these before an examiner finds them)

- **Payments are a mock**, not real Razorpay. The code is structured so a real gateway can be dropped in, but say this out loud rather than letting it be discovered.
- **The order SQL is complex.** It is the riskiest code in the project and deserves the most careful review.
- **There are no unit tests.** Only the concurrency test and manual checking.
- **Dashboard revenue ignores cancelled and unpaid orders.** So revenue can show 0 while orders show 1. That is correct, not a bug.
- **Cart updates show instantly before the server confirms.** If the server call fails quietly, the screen can be briefly out of sync.

---

## Still to do

- Admin add/edit/delete products
- Product reviews UI
- Wishlist UI
- Printable invoice
- Notification bell in the header
- Backup script
- SRS, UML diagrams, test report

**Important non-code task:** the database password is saved in old git history
(commit `3e4a6a0`). It should be changed in the Neon dashboard, and the new one
shared privately — not committed.
