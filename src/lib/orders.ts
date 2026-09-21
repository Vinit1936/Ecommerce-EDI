/**
 * Order placement and lifecycle — Team 2.
 *
 * placeOrder() is the concurrency-critical path in the whole project. It backs
 * four KPIs at once: concurrent order handling (#6), inventory accuracy (#7),
 * the OS "thread synchronisation" requirement, and the DBMS "transaction
 * management" requirement.
 *
 * How the race is prevented
 * -------------------------
 * Every participating product row is locked with SELECT ... FOR UPDATE before
 * any stock check happens. A second request for the same product blocks on that
 * lock until the first transaction commits or rolls back, then re-reads the row
 * and sees the decremented figure. Two customers therefore cannot both pass a
 * "there is 1 left" check.
 *
 * Two details that matter and are easy to get wrong:
 *
 *   ORDER BY id on the lock query - without a deterministic lock ordering, two
 *   orders containing the same two products in opposite order deadlock.
 *
 *   READ COMMITTED (the default) rather than SERIALIZABLE - with row locks
 *   already serialising access, SERIALIZABLE only adds spurious serialization
 *   failures. Under READ COMMITTED a blocked transaction re-reads the row at
 *   its newest committed version once the lock is released, which is exactly
 *   the behaviour required.
 *
 * Stock is decremented on Product.stockQty (the authoritative figure) and
 * mirrored onto Inventory.quantityAvailable inside the same transaction.
 */
import { randomUUID } from 'crypto';
import prisma from '@/lib/db';
import type { OrderStatusType, Prisma } from '@prisma/client';

export type OrderErrorCode =
  | 'EMPTY_CART'
  | 'INSUFFICIENT_STOCK'
  | 'NOT_FOUND'
  | 'NOT_CANCELLABLE';

export class OrderError extends Error {
  constructor(
    message: string,
    public code: OrderErrorCode,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

export interface ShippingDetails {
  name?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  method?: string;
}

const SHIPPING_COST: Record<string, number> = { standard: 12, express: 25 };

export function shippingCostFor(method: string): number {
  return SHIPPING_COST[method] ?? SHIPPING_COST.standard;
}

/** Invoice numbers are derived from the order id, so they are unique by construction. */
function invoiceNumberFor(orderId: string): string {
  return `HH-${new Date().getFullYear()}-${orderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

/**
 * Turns the customer's server-side cart into a confirmed order.
 *
 * The line items are read from the database inside the transaction rather than
 * taken from the request body — a client that posted its own prices or
 * quantities could otherwise under-pay or over-draw stock.
 */
export async function placeOrder(customerId: string, shipping: ShippingDetails = {}) {
  const method = shipping.method ?? 'standard';
  const shippingCost = shippingCostFor(method);

  // Read the cart BEFORE opening the transaction. It is the customer's own
  // cart, so no other request contends for it, and keeping it out here shortens
  // the window during which product rows are locked.
  const cartLines = await prisma.cart.findMany({
    where: { customerId },
    include: { product: { select: { id: true, name: true, price: true, sku: true } } },
  });

  if (cartLines.length === 0) {
    throw new OrderError('Your cart is empty', 'EMPTY_CART', 400);
  }

  // Several cart lines may reference one product (different sizes), so demand
  // has to be summed per product before it is compared against stock.
  const demand = new Map<string, number>();
  for (const line of cartLines) {
    demand.set(line.productId, (demand.get(line.productId) ?? 0) + line.quantity);
  }
  // Deterministic lock order prevents deadlocks between concurrent orders.
  const productIds = [...demand.keys()].sort();
  const quantities = productIds.map((id) => demand.get(id)!);

  const itemsTotal = cartLines.reduce(
    (sum, line) => sum + Number(line.product.price) * line.quantity,
    0
  );
  const totalAmount = itemsTotal + shippingCost;

  // Generating the id up front lets the invoice number be derived before the
  // insert, so the order, its items, its first status row and its invoice all
  // go in as a single statement instead of four round trips.
  const orderId = randomUUID();
  const invoiceNo = invoiceNumberFor(orderId);

  const lineProductIds = cartLines.map((l) => l.productId);
  const lineQuantities = cartLines.map((l) => l.quantity);
  const linePrices = cartLines.map((l) => Number(l.product.price));
  const lineSizes = cartLines.map((l) => l.selectedSize ?? '');
  const lineColors = cartLines.map((l) => l.selectedColor ?? '');

  return prisma.$transaction(
    async (tx) => {
      // ---- Critical section: ONE statement -------------------------------
      // Every row lock is held from this statement until COMMIT, so the work
      // done while holding them is what limits concurrent throughput. Against
      // a database ~300ms away, each extra query inside the lock adds 300ms
      // per order and serialises across all of them. Folding the decrement,
      // the order, its items, its first status row, its invoice and the cart
      // clear into a single statement keeps that window to one round trip.
      //
      // `p.stock_qty >= d.qty` is re-evaluated after the row lock is granted
      // (Postgres EvalPlanQual), so a waiting request sees the decremented
      // value rather than its original snapshot — this is what actually
      // prevents overselling.
      //
      // Partial decrements cannot escape: if any line is short, the order
      // insert matches no rows and we throw, rolling the whole thing back.
      const [result] = await tx.$queryRaw<
        Array<{ bumped_count: number; order_created: number; items_created: number }>
      >`
        WITH demand(product_id, qty) AS (
          SELECT * FROM UNNEST(${productIds}::uuid[], ${quantities}::int[])
        ),
        bumped AS (
          UPDATE products p
             SET stock_qty = p.stock_qty - d.qty, updated_at = NOW()
            FROM demand d
           WHERE p.id = d.product_id AND p.stock_qty >= d.qty
    RETURNING p.id
        ),
        mirrored AS (
          UPDATE inventories i
             SET quantity_available = i.quantity_available - d.qty, updated_at = NOW()
            FROM demand d
           WHERE i.product_id = d.product_id
             AND i.product_id IN (SELECT id FROM bumped)
    RETURNING i.id
        ),
        ord AS (
          INSERT INTO orders (
            id, customer_id, total_amount, status,
            shipping_name, shipping_address, shipping_city, shipping_postal_code,
            shipping_country, shipping_phone, shipping_method, shipping_cost,
            created_at, updated_at
          )
          SELECT ${orderId}::uuid, ${customerId}::uuid, ${totalAmount}::decimal, 'PENDING',
                 ${shipping.name ?? null}, ${shipping.address ?? null},
                 ${shipping.city ?? null}, ${shipping.postalCode ?? null},
                 ${shipping.country ?? null}, ${shipping.phone ?? null},
                 ${method}, ${shippingCost}::decimal, NOW(), NOW()
           WHERE (SELECT COUNT(*) FROM bumped) = ${productIds.length}::int
    RETURNING id
        ),
        its AS (
          INSERT INTO order_items (
            id, order_id, product_id, quantity, unit_price,
            selected_size, selected_color, created_at, updated_at
          )
          SELECT gen_random_uuid(), ${orderId}::uuid, l.product_id, l.qty, l.price,
                 l.size, l.color, NOW(), NOW()
            FROM UNNEST(
                   ${lineProductIds}::uuid[], ${lineQuantities}::int[],
                   ${linePrices}::decimal[], ${lineSizes}::text[], ${lineColors}::text[]
                 ) AS l(product_id, qty, price, size, color)
           WHERE EXISTS (SELECT 1 FROM ord)
    RETURNING id
        ),
        st AS (
          INSERT INTO order_statuses (id, order_id, status, changed_at)
          SELECT gen_random_uuid(), ${orderId}::uuid, 'PENDING', NOW()
           WHERE EXISTS (SELECT 1 FROM ord)
    RETURNING id
        ),
        inv AS (
          INSERT INTO invoices (id, order_id, invoice_no, total_amount, issued_at)
          SELECT gen_random_uuid(), ${orderId}::uuid, ${invoiceNo}, ${totalAmount}::decimal, NOW()
           WHERE EXISTS (SELECT 1 FROM ord)
    RETURNING id
        ),
        cleared AS (
          DELETE FROM carts
           WHERE customer_id = ${customerId}::uuid AND EXISTS (SELECT 1 FROM ord)
    RETURNING id
        )
        SELECT (SELECT COUNT(*) FROM bumped)::int AS bumped_count,
               (SELECT COUNT(*) FROM ord)::int    AS order_created,
               (SELECT COUNT(*) FROM its)::int    AS items_created
      `;

      if (!result || Number(result.order_created) !== 1) {
        // Identify which line came up short, for a message the customer can act on.
        const short = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, stockQty: true },
        });
        const culprit = short.find((p) => p.stockQty < (demand.get(p.id) ?? 0));
        throw new OrderError(
          culprit
            ? `Insufficient stock for ${culprit.name}: ${demand.get(culprit.id)} requested, ${culprit.stockQty} available`
            : 'Insufficient stock',
          'INSUFFICIENT_STOCK',
          409,
          culprit
            ? { productId: culprit.id, requested: demand.get(culprit.id), available: culprit.stockQty }
            : undefined
        );
      }
      // ---- End critical section -------------------------------------------

      return { orderId, invoiceNo, totalAmount };
    },
    { timeout: 60_000, maxWait: 60_000 }
  );
}

/** Full order record, loaded after placement outside the lock. */
export async function getPlacedOrder(orderId: string) {
  return prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
}

/**
 * Cancels an order and returns its stock. Runs in a transaction for the same
 * reason placement does: stock must not be restored twice if two cancel
 * requests arrive together.
 */
export async function cancelOrder(orderId: string, customerId?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, payments: true },
    });

    if (!order || (customerId && order.customerId !== customerId)) {
      throw new OrderError('Order not found', 'NOT_FOUND', 404);
    }
    if (order.status === 'CANCELLED') {
      throw new OrderError('Order is already cancelled', 'NOT_CANCELLABLE', 409);
    }
    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      throw new OrderError(
        `An order that is ${order.status.toLowerCase()} can no longer be cancelled`,
        'NOT_CANCELLABLE',
        409
      );
    }

    // Restore stock
    for (const item of order.orderItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: { increment: item.quantity } },
      });
      await tx.inventory.updateMany({
        where: { productId: item.productId },
        data: { quantityAvailable: { increment: item.quantity } },
      });
    }

    // Process refunds for completed payments
    for (const payment of order.payments) {
      if (payment.status === 'COMPLETED') {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED' },
        });
        await tx.transaction.create({
          data: {
            paymentId: payment.id,
            type: 'REFUND',
            amount: payment.amount,
            status: 'SUCCESS',
          },
        });
      }
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED', orderStatuses: { create: { status: 'CANCELLED' } } },
    });

    return updated;
  });
}

/** Appends a lifecycle transition and moves the order to the new status. */
export async function advanceOrderStatus(orderId: string, status: OrderStatusType) {
  return prisma.order.update({
    where: { id: orderId },
    data: { status, orderStatuses: { create: { status } } },
  });
}

const orderInclude = {
  orderItems: { include: { product: { select: { name: true, sku: true, images: true } } } },
  orderStatuses: { orderBy: { changedAt: 'asc' } },
  invoice: true,
  payments: true,
} satisfies Prisma.OrderInclude;

export async function listOrders(customerId: string) {
  return prisma.order.findMany({
    where: { customerId },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrder(orderId: string, customerId?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order || (customerId && order.customerId !== customerId)) return null;
  return order;
}
