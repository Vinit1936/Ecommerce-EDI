/**
 * Concurrency proof — KPI #6: "Support at least 20 concurrent order requests
 * without race conditions, crashes, or data inconsistency."
 *
 * Twenty distinct customers each try to buy the last units of one product that
 * has only STOCK_LIMIT in stock. Without row locking this oversells: every
 * request reads "stock is 10" before any of them writes, and all 20 succeed.
 *
 * With the SELECT ... FOR UPDATE lock in lib/orders.ts, requests queue on the
 * locked row, so exactly STOCK_LIMIT succeed and the rest fail cleanly with
 * INSUFFICIENT_STOCK. Final stock must land on exactly 0 — never negative.
 *
 *   npm run test:concurrency        (the dev server must be running)
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

for (const file of ['.env.local', '.env']) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const CONCURRENT = 20;
const STOCK_LIMIT = 10;
const TARGET_SKU = 'hh-01';
const PASSWORD = 'Password123!';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL || '' }),
});

/** Logs one test customer in and returns their session cookie header. */
async function login(email: string): Promise<string> {
  const jar = new Map<string, string>();
  const header = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const absorb = (res: Response) => {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      jar.set(kv.slice(0, i), kv.slice(i + 1));
    }
  };

  let res = await fetch(`${BASE}/api/auth/csrf`);
  absorb(res);
  const { csrfToken } = (await res.json()) as { csrfToken: string };

  res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: header() },
    body: new URLSearchParams({ email, password: PASSWORD, csrfToken, callbackUrl: BASE }),
  });
  absorb(res);
  return header();
}

async function main() {
  console.log(`\n${'='.repeat(64)}`);
  console.log(`CONCURRENT ORDER TEST — ${CONCURRENT} simultaneous requests, stock of ${STOCK_LIMIT}`);
  console.log('='.repeat(64));

  const product = await prisma.product.findUnique({ where: { sku: TARGET_SKU } });
  if (!product) throw new Error(`Product ${TARGET_SKU} not found — run: npm run seed`);

  const customerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // --- Set up 20 independent customers, each with one unit in their cart ---
  process.stdout.write(`\nPreparing ${CONCURRENT} customers... `);
  const emails: string[] = [];
  for (let i = 0; i < CONCURRENT; i++) {
    const email = `concurrency-${i}@test.local`;
    emails.push(email);
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, roleId: customerRole.id },
      create: { email, passwordHash, roleId: customerRole.id },
    });
    const customer = await prisma.customer.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, firstName: 'LOAD', lastName: `TEST ${i}`, address: 'X', city: 'PORTO' },
    });
    await prisma.cart.deleteMany({ where: { customerId: customer.id } });
    await prisma.cart.create({ data: { customerId: customer.id, productId: product.id, quantity: 1 } });
  }
  console.log('done');

  // --- Pin stock to exactly STOCK_LIMIT ---
  await prisma.product.update({ where: { id: product.id }, data: { stockQty: STOCK_LIMIT } });
  await prisma.inventory.updateMany({ where: { productId: product.id }, data: { quantityAvailable: STOCK_LIMIT } });
  console.log(`Stock for ${product.name} pinned to ${STOCK_LIMIT}`);

  process.stdout.write('Authenticating... ');
  const cookies = await Promise.all(emails.map(login));
  console.log('done');

  // --- Fire everything at once ---
  console.log(`\nFiring ${CONCURRENT} order requests simultaneously...\n`);
  const started = Date.now();

  const results = await Promise.all(
    cookies.map(async (cookie) => {
      const res = await fetch(`${BASE}/api/orders`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify({ method: 'standard' }),
      });
      const body = (await res.json()) as { success: boolean; error?: string; data?: { invoiceNo: string } };
      return { status: res.status, ok: body.success, message: body.error, invoice: body.data?.invoiceNo };
    })
  );

  const elapsed = Date.now() - started;
  const succeeded = results.filter((r) => r.ok);
  const rejected = results.filter((r) => !r.ok);
  const outOfStock = rejected.filter((r) => /insufficient stock/i.test(r.message ?? ''));
  const other = rejected.filter((r) => !/insufficient stock/i.test(r.message ?? ''));

  // --- Verify against the database, not the responses ---
  const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  const inventory = await prisma.inventory.findFirst({ where: { productId: product.id } });
  const orderCount = await prisma.orderItem.count({
    where: { productId: product.id, order: { customer: { user: { email: { startsWith: 'concurrency-' } } } } },
  });

  console.log(`  requests sent .............. ${CONCURRENT}`);
  console.log(`  completed in ............... ${elapsed} ms`);
  console.log(`  orders accepted ............ ${succeeded.length}`);
  console.log(`  rejected: out of stock ..... ${outOfStock.length}`);
  console.log(`  rejected: other errors ..... ${other.length}`);
  if (other.length) other.slice(0, 3).forEach((r) => console.log(`      ! ${r.status} ${r.message}`));
  console.log(`\n  stock before ............... ${STOCK_LIMIT}`);
  console.log(`  stock after ................ ${after.stockQty}`);
  console.log(`  inventory mirror ........... ${inventory?.quantityAvailable}`);
  console.log(`  order_items rows written ... ${orderCount}`);

  const checks: [string, boolean][] = [
    [`exactly ${STOCK_LIMIT} orders accepted`, succeeded.length === STOCK_LIMIT],
    [`remaining ${CONCURRENT - STOCK_LIMIT} rejected as out of stock`, outOfStock.length === CONCURRENT - STOCK_LIMIT],
    ['no unexpected errors', other.length === 0],
    ['final stock is exactly 0 (never negative)', after.stockQty === 0],
    ['inventory mirror agrees with product stock', inventory?.quantityAvailable === after.stockQty],
    ['one order line per accepted order', orderCount === succeeded.length],
  ];

  console.log(`\n${'-'.repeat(64)}`);
  for (const [label, passed] of checks) {
    console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${label}`);
  }
  const allPassed = checks.every(([, p]) => p);
  console.log('-'.repeat(64));
  console.log(
    allPassed
      ? '\nRESULT: PASS — no overselling, no race condition, no data inconsistency.\n'
      : '\nRESULT: FAIL — see the failing checks above.\n'
  );

  // --- Tidy up so the demo database stays clean ---
  const testCustomers = await prisma.customer.findMany({
    where: { user: { email: { startsWith: 'concurrency-' } } },
    select: { id: true },
  });
  const ids = testCustomers.map((c) => c.id);
  await prisma.orderItem.deleteMany({ where: { order: { customerId: { in: ids } } } });
  await prisma.orderStatus.deleteMany({ where: { order: { customerId: { in: ids } } } });
  await prisma.invoice.deleteMany({ where: { order: { customerId: { in: ids } } } });
  await prisma.payment.deleteMany({ where: { order: { customerId: { in: ids } } } });
  await prisma.order.deleteMany({ where: { customerId: { in: ids } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: 'concurrency-' } } });

  await prisma.product.update({ where: { id: product.id }, data: { stockQty: 14 } });
  await prisma.inventory.updateMany({ where: { productId: product.id }, data: { quantityAvailable: 14 } });
  console.log('Test data removed; stock restored to 14.\n');

  process.exit(allPassed ? 0 : 1);
}

main()
  .catch((e) => {
    console.error('\nConcurrency test failed to run:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
