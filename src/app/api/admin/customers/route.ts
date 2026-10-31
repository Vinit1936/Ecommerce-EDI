/**
 * /api/admin/customers
 * GET: retrieve list of customers with lifetime spend, order volume, and active status
 */
import type { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { requireRole, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireRole('ADMIN');

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q')?.trim().toLowerCase() ?? '';
    const statusFilter = searchParams.get('status') ?? 'ALL';
    const sortBy = searchParams.get('sort') ?? 'spend-desc';

    const rawCustomers = await prisma.customer.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        orders: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
            wishlistItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let customers = rawCustomers.map((c) => {
      const validOrders = c.orders.filter((o) => o.status !== 'CANCELLED');
      const totalSpend = validOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      const sortedOrders = [...c.orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return {
        id: c.id,
        userId: c.user.id,
        name: `${c.firstName} ${c.lastName}`.trim() || 'UNNAMED',
        email: c.user.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        postalCode: c.postalCode,
        country: c.country,
        isActive: c.user.isActive,
        lastLoginAt: c.user.lastLoginAt,
        registeredAt: c.user.createdAt,
        orderCount: c._count.orders,
        lifetimeSpend: totalSpend,
        lastOrderDate: sortedOrders[0]?.createdAt ?? null,
      };
    });

    // Apply text search
    if (q) {
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q))
      );
    }

    // Apply status filter
    if (statusFilter === 'ACTIVE') {
      customers = customers.filter((c) => c.isActive);
    } else if (statusFilter === 'INACTIVE') {
      customers = customers.filter((c) => !c.isActive);
    }

    // Apply sorting
    if (sortBy === 'spend-desc') {
      customers.sort((a, b) => b.lifetimeSpend - a.lifetimeSpend);
    } else if (sortBy === 'spend-asc') {
      customers.sort((a, b) => a.lifetimeSpend - b.lifetimeSpend);
    } else if (sortBy === 'orders-desc') {
      customers.sort((a, b) => b.orderCount - a.orderCount);
    } else if (sortBy === 'newest') {
      customers.sort(
        (a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
      );
    }

    return ok({ customers, total: customers.length });
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}
