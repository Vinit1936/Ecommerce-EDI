import { z } from 'zod';
import type { OrderStatusType } from '@prisma/client';
import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { requireRole, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { notify } from '@/lib/notify';
import { advanceOrderStatus, cancelOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';

const UpdateStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

/**
 * GET /api/admin/orders
 * Admin route to list all orders across the platform.
 */
export async function GET(request: Request) {
  try {
    await requireRole('ADMIN');

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const orders = await prisma.order.findMany({
      where: statusFilter ? { status: statusFilter as OrderStatusType } : undefined,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            user: { select: { email: true } },
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                images: true,
              },
            },
          },
        },
        payments: true,
        orderStatuses: {
          orderBy: { changedAt: 'desc' },
        },
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return ok({
      orders: orders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        shippingCost: Number(o.shippingCost),
        shippingMethod: o.shippingMethod,
        shippingAddress: o.shippingAddress,
        shippingCity: o.shippingCity,
        shippingPostalCode: o.shippingPostalCode,
        shippingCountry: o.shippingCountry,
        customer: {
          id: o.customer.id,
          name: `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.trim() || 'Guest Customer',
          email: o.customer.user.email,
          phone: o.customer.phone,
        },
        invoiceNo: o.invoice?.invoiceNo ?? null,
        itemsCount: o.orderItems.reduce((acc, i) => acc + i.quantity, 0),
        items: o.orderItems.map((i) => ({
          id: i.id,
          productName: i.product.name,
          sku: i.product.sku,
          image: i.product.images[0] || null,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          selectedSize: i.selectedSize,
          selectedColor: i.selectedColor,
        })),
        paymentStatus: o.payments[0]?.status ?? 'UNPAID',
      })),
      total: orders.length,
    });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return serverError(error);
  }
}

/**
 * PATCH /api/admin/orders
 * Admin route to advance order status and notify customer.
 */
export async function PATCH(request: Request) {
  try {
    const session = await requireRole('ADMIN');
    const body = await request.json();
    const parsed = UpdateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return fail('Invalid orderId or status', 400);
    }

    const { orderId, status } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) return fail('Order not found', 404);

    let updatedOrder;
    if (status === 'CANCELLED') {
      // Cancel and restore stock
      updatedOrder = await cancelOrder(orderId);
    } else {
      updatedOrder = await advanceOrderStatus(orderId, status);
    }

    await recordAudit({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'Order',
      entityId: orderId,
    });

    if (order.customer?.userId) {
      await notify({
        userId: order.customer.userId,
        message: `Your order status has transitioned to ${status}.`,
      });
    }

    return ok({ order: updatedOrder });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return serverError(error);
  }
}
