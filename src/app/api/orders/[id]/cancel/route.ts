/** POST /api/orders/[id]/cancel — cancel an order and restore its stock. */
import { ok, fail, serverError } from '@/lib/api';
import { AuthError, requireCustomer } from '@/lib/auth';
import { OrderError, cancelOrder } from '@/lib/orders';
import { recordAudit } from '@/lib/audit';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, customerId } = await requireCustomer();
    const { id } = await params;

    const order = await cancelOrder(id, customerId);

    await recordAudit({ userId: session.user.id, action: 'UPDATE', entity: 'Order', entityId: id });
    await notify({ userId: session.user.id, message: `Order cancelled and stock restored.` });

    return ok({ order });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    if (e instanceof OrderError) return fail(e.message, e.status, { code: e.code });
    return serverError(e);
  }
}
