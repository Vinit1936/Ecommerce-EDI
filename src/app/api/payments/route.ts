/**
 * POST /api/payments — take payment for an order.
 *
 * Writes the Payment and its Transaction in one transaction and promotes the
 * order to CONFIRMED, so a payment can never be recorded against an order that
 * stays PENDING (or vice versa).
 */
import { z } from 'zod';
import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { AuthError, requireCustomer } from '@/lib/auth';
import { charge } from '@/lib/gateway';
import { recordAudit } from '@/lib/audit';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const schema = z.object({
  orderId: z.string().uuid(),
  simulateFailure: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const { session, customerId } = await requireCustomer();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail('Invalid payment payload', 422, parsed.error.issues);

    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      include: { payments: true },
    });
    if (!order || order.customerId !== customerId) return fail('Order not found', 404);
    if (order.payments.some((p) => p.status === 'COMPLETED')) {
      return fail('This order has already been paid', 409);
    }

    const amount = Number(order.totalAmount);
    const result = await charge(amount, parsed.data.simulateFailure ?? false);

    const { payment, transaction } = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount,
          status: result.success ? 'COMPLETED' : 'FAILED',
          gatewayTxnId: result.gatewayTxnId,
        },
      });
      const transaction = await tx.transaction.create({
        data: {
          paymentId: payment.id,
          type: 'PAYMENT',
          amount,
          status: result.success ? 'SUCCESS' : 'FAILED',
        },
      });
      if (result.success) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CONFIRMED', orderStatuses: { create: { status: 'CONFIRMED' } } },
        });
      }
      return { payment, transaction };
    });

    await recordAudit({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'Payment',
      entityId: payment.id,
    });
    await notify({
      userId: session.user.id,
      message: result.success
        ? `Payment of ${amount.toFixed(2)} confirmed.`
        : `Payment failed: ${result.message}`,
    });

    if (!result.success) return fail(result.message, 402, { payment, transaction });
    return ok({ payment, transaction }, 201);
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    return serverError(e);
  }
}
