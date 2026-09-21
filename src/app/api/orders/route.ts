/**
 * /api/orders — POST places an order, GET lists the customer's orders.
 *
 * The heavy lifting (row locking, stock checks, invoice) is in lib/orders.ts.
 */
import { z } from 'zod';
import { ok, fail, serverError } from '@/lib/api';
import { AuthError, requireCustomer } from '@/lib/auth';
import { OrderError, getPlacedOrder, listOrders, placeOrder } from '@/lib/orders';
import { recordAudit } from '@/lib/audit';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const shippingSchema = z.object({
  name: z.string().max(200).optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  method: z.enum(['standard', 'express']).default('standard'),
});

export async function GET() {
  try {
    const { customerId } = await requireCustomer();
    return ok({ orders: await listOrders(customerId) });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    return serverError(e);
  }
}

export async function POST(request: Request) {
  try {
    const { session, customerId } = await requireCustomer();
    const parsed = shippingSchema.safeParse((await request.json().catch(() => ({}))) ?? {});
    if (!parsed.success) return fail('Invalid shipping details', 422, parsed.error.issues);

    const { orderId, invoiceNo } = await placeOrder(customerId, parsed.data);

    // Reading the full record and writing the audit/notification rows happen
    // after the transaction has committed, so they never extend the time that
    // product rows stay locked.
    const order = await getPlacedOrder(orderId);

    await recordAudit({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'Order',
      entityId: orderId,
    });
    await notify({
      userId: session.user.id,
      message: `Order ${invoiceNo} placed successfully.`,
    });

    return ok({ order, invoiceNo }, 201);
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    if (e instanceof OrderError) return fail(e.message, e.status, { code: e.code, ...(e.details ?? {}) });
    return serverError(e);
  }
}
