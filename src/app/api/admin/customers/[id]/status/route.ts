/**
 * /api/admin/customers/[id]/status
 * PATCH: toggle user active status (deactivate or reactivate account)
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { requireRole, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const statusSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole('ADMIN');
    const { id } = await params;

    const json = await request.json();
    const parsed = statusSchema.safeParse(json);
    if (!parsed.success) {
      return fail('Validation failed', 400, parsed.error.format());
    }

    // Lookup by Customer ID or User ID
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { customer: { id } }],
      },
    });

    if (!user) {
      return fail('Customer account not found', 404);
    }

    // Prevent deactivating own admin account to prevent lockout
    if (user.id === session.user.id && !parsed.data.isActive) {
      return fail('You cannot deactivate your own administrative account', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isActive: parsed.data.isActive },
    });

    await recordAudit({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'UserStatus',
      entityId: user.id,
    });

    return ok({
      userId: updatedUser.id,
      email: updatedUser.email,
      isActive: updatedUser.isActive,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}
