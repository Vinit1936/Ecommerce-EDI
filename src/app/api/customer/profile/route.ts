/**
 * /api/customer/profile
 * GET: retrieve logged-in customer's profile, statistics, and recent activity
 * PATCH: update personal details, shipping address, or password
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { requireAuth, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireAuth();

    let customer = await prisma.customer.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { email: true, createdAt: true, role: { select: { name: true } } } },
        _count: { select: { orders: true, wishlistItems: true, reviews: true } },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            invoice: { select: { invoiceNo: true } },
          },
        },
      },
    });

    // Auto-create customer profile if user registered without one
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId: session.user.id,
          firstName: 'CUSTOMER',
          lastName: 'ACCOUNT',
          address: 'NOT SET',
          city: 'NOT SET',
        },
        include: {
          user: { select: { email: true, createdAt: true, role: { select: { name: true } } } },
          _count: { select: { orders: true, wishlistItems: true, reviews: true } },
          orders: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              totalAmount: true,
              status: true,
              createdAt: true,
              invoice: { select: { invoiceNo: true } },
            },
          },
        },
      });
    }

    return ok({
      profile: {
        id: customer.id,
        email: customer.user.email,
        role: customer.user.role.name,
        registeredAt: customer.user.createdAt,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        postalCode: customer.postalCode,
        country: customer.country,
        metrics: {
          totalOrders: customer._count.orders,
          savedWishlist: customer._count.wishlistItems,
          reviewsCount: customer._count.reviews,
        },
        recentOrders: customer.orders.map((o) => ({
          id: o.id,
          total: Number(o.totalAmount),
          status: o.status,
          date: o.createdAt,
          invoiceNo: o.invoice?.invoiceNo ?? null,
        })),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100).optional(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().min(2, 'Address is required').max(255).optional(),
  city: z.string().min(2, 'City is required').max(100).optional(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();

    const json = await request.json();
    const parsed = updateProfileSchema.safeParse(json);
    if (!parsed.success) {
      return fail('Validation failed', 400, parsed.error.format());
    }

    const { currentPassword, newPassword, ...profileData } = parsed.data;

    // Handle password change if requested
    if (newPassword) {
      if (!currentPassword) {
        return fail('Current password is required to set a new password', 400);
      }

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: session.user.id },
      });

      const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!passwordMatch) {
        return fail('Current password does not match', 400);
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: session.user.id },
        data: { passwordHash: newPasswordHash },
      });

      await recordAudit({
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'UserPassword',
        entityId: session.user.id,
      });
    }

    // Update customer profile details
    const updatedCustomer = await prisma.customer.upsert({
      where: { userId: session.user.id },
      update: profileData,
      create: {
        userId: session.user.id,
        firstName: profileData.firstName ?? 'CUSTOMER',
        lastName: profileData.lastName ?? 'ACCOUNT',
        phone: profileData.phone ?? null,
        address: profileData.address ?? 'NOT SET',
        city: profileData.city ?? 'NOT SET',
        postalCode: profileData.postalCode ?? null,
        country: profileData.country ?? null,
      },
    });

    await recordAudit({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'Customer',
      entityId: updatedCustomer.id,
    });

    return ok({ customer: updatedCustomer });
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}
