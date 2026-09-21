/**
 * Dashboard and reporting aggregates — Team 3.
 *
 * Every figure here is computed by Postgres (SUM / COUNT / GROUP BY) rather
 * than by pulling rows into Node and reducing them, which is the point of the
 * DBMS "aggregate queries" requirement.
 */
import prisma from '@/lib/db';

/** Orders that actually represent money taken. */
const REVENUE_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

export interface DashboardStats {
  revenue: number;
  orderCount: number;
  customerCount: number;
  productCount: number;
  unitsSold: number;
  averageOrderValue: number;
  ordersByStatus: { status: string; count: number }[];
  topProducts: { name: string; sku: string; units: number; revenue: number }[];
  lowStock: { name: string; sku: string; stockQty: number }[];
  recentOrders: {
    id: string;
    invoiceNo: string | null;
    customer: string;
    total: number;
    status: string;
    createdAt: Date;
  }[];
  salesByDay: { day: string; orders: number; revenue: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    revenueAgg,
    orderCount,
    customerCount,
    productCount,
    statusGroups,
    topRaw,
    lowStock,
    recent,
    salesRaw,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      _avg: { totalAmount: true },
      where: { status: { in: [...REVENUE_STATUSES] } },
    }),
    prisma.order.count(),
    prisma.customer.count(),
    prisma.product.count(),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.product.findMany({
      where: { stockQty: { lte: 5 } },
      select: { name: true, sku: true, stockQty: true },
      orderBy: { stockQty: 'asc' },
      take: 6,
    }),
    prisma.order.findMany({
      include: {
        invoice: { select: { invoiceNo: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.$queryRaw<Array<{ day: Date; orders: bigint; revenue: string | null }>>`
      SELECT DATE_TRUNC('day', created_at) AS day,
             COUNT(*)                      AS orders,
             SUM(total_amount)             AS revenue
        FROM orders
       WHERE created_at >= NOW() - INTERVAL '14 days'
       GROUP BY 1
       ORDER BY 1 ASC
    `,
  ]);

  // Resolve the grouped product ids to names in one follow-up query.
  const topIds = topRaw.map((t) => t.productId);
  const topProductRows = topIds.length
    ? await prisma.product.findMany({
        where: { id: { in: topIds } },
        select: { id: true, name: true, sku: true, price: true },
      })
    : [];

  const topProducts = topRaw.map((t) => {
    const p = topProductRows.find((r) => r.id === t.productId);
    const units = t._sum.quantity ?? 0;
    return {
      name: p?.name ?? 'Unknown',
      sku: p?.sku ?? '—',
      units,
      revenue: units * Number(p?.price ?? 0),
    };
  });

  const unitsSold = await prisma.orderItem.aggregate({ _sum: { quantity: true } });

  return {
    revenue: Number(revenueAgg._sum.totalAmount ?? 0),
    orderCount,
    customerCount,
    productCount,
    unitsSold: unitsSold._sum.quantity ?? 0,
    averageOrderValue: Number(revenueAgg._avg.totalAmount ?? 0),
    ordersByStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
    topProducts,
    lowStock,
    recentOrders: recent.map((o) => ({
      id: o.id,
      invoiceNo: o.invoice?.invoiceNo ?? null,
      customer: `${o.customer.firstName} ${o.customer.lastName}`.trim(),
      total: Number(o.totalAmount),
      status: o.status,
      createdAt: o.createdAt,
    })),
    salesByDay: salesRaw.map((r) => ({
      day: new Date(r.day).toISOString().slice(0, 10),
      orders: Number(r.orders),
      revenue: Number(r.revenue ?? 0),
    })),
  };
}

/** Rows behind the sales CSV export. */
export async function getSalesReportRows() {
  const orders = await prisma.order.findMany({
    include: {
      invoice: { select: { invoiceNo: true } },
      customer: { select: { firstName: true, lastName: true, city: true } },
      orderItems: { select: { quantity: true } },
      payments: { select: { status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return orders.map((o) => ({
    invoiceNo: o.invoice?.invoiceNo ?? o.id.slice(0, 8).toUpperCase(),
    placedAt: o.createdAt.toISOString(),
    customer: `${o.customer.firstName} ${o.customer.lastName}`.trim(),
    city: o.customer.city,
    status: o.status,
    paid: o.payments.some((p) => p.status === 'COMPLETED') ? 'YES' : 'NO',
    units: o.orderItems.reduce((n, i) => n + i.quantity, 0),
    shipping: Number(o.shippingCost).toFixed(2),
    total: Number(o.totalAmount).toFixed(2),
  }));
}

/** Top customers by lifetime spend. */
export async function getTopCustomers(take = 10) {
  const grouped = await prisma.order.groupBy({
    by: ['customerId'],
    _sum: { totalAmount: true },
    _count: { _all: true },
    orderBy: { _sum: { totalAmount: 'desc' } },
    take,
  });

  const customers = await prisma.customer.findMany({
    where: { id: { in: grouped.map((g) => g.customerId) } },
    select: { id: true, firstName: true, lastName: true, city: true, user: { select: { email: true } } },
  });

  return grouped.map((g) => {
    const c = customers.find((x) => x.id === g.customerId);
    return {
      name: c ? `${c.firstName} ${c.lastName}`.trim() : 'Unknown',
      email: c?.user.email ?? '—',
      city: c?.city ?? '—',
      orders: g._count._all,
      spend: Number(g._sum.totalAmount ?? 0),
    };
  });
}
