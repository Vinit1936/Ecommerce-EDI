import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { requireRole, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/health
 * System diagnostics route reporting database latency, table counts, and environment metrics.
 */
export async function GET() {
  try {
    await requireRole('ADMIN');

    // 1. Measure DB round-trip latency
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Number((performance.now() - start).toFixed(1));

    // 2. Query row counts across all key tables in parallel
    const [
      users,
      customers,
      products,
      categories,
      brands,
      orders,
      orderItems,
      payments,
      transactions,
      carts,
      wishlists,
      reviews,
      notifications,
      auditLogs,
      reports,
      backupHistories,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.category.count(),
      prisma.brand.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.payment.count(),
      prisma.transaction.count(),
      prisma.cart.count(),
      prisma.wishlist.count(),
      prisma.productReview.count(),
      prisma.notification.count(),
      prisma.auditLog.count(),
      prisma.report.count(),
      prisma.backupHistory.count(),
    ]);

    const tableCounts = {
      users,
      customers,
      products,
      categories,
      brands,
      orders,
      orderItems,
      payments,
      transactions,
      carts,
      wishlists,
      reviews,
      notifications,
      auditLogs,
      reports,
      backupHistories,
    };

    const totalRows = Object.values(tableCounts).reduce((a, b) => a + b, 0);

    return ok({
      status: 'HEALTHY',
      database: {
        provider: 'Neon PostgreSQL',
        latencyMs,
        status: latencyMs < 1000 ? 'OPTIMAL' : 'DEGRADED',
      },
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeEnv: process.env.NODE_ENV || 'development',
        memoryUsageMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)),
      },
      totalDatabaseRows: totalRows,
      tableCounts,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return serverError(error);
  }
}
