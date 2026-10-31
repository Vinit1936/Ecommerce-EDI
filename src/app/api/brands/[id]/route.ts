/**
 * /api/brands/[id]
 * PUT: admin update brand
 * DELETE: admin delete brand (with FK safety)
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, serverError } from '@/lib/api';
import { updateBrand, deleteBrand } from '@/lib/products';
import { requireRole, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const updateBrandSchema = z.object({
  name: z.string().min(2, 'Brand name must be at least 2 characters').max(100),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole('ADMIN');
    const { id } = await params;

    const json = await request.json();
    const parsed = updateBrandSchema.safeParse(json);
    if (!parsed.success) {
      return fail('Validation failed', 400, parsed.error.format());
    }

    const updated = await updateBrand(id, parsed.data);

    await recordAudit({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'Brand',
      entityId: id,
    });

    return ok({ brand: updated });
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole('ADMIN');
    const { id } = await params;

    await deleteBrand(id);

    await recordAudit({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'Brand',
      entityId: id,
    });

    return ok({ deleted: true, id });
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    const message = e instanceof Error ? e.message : 'Failed to delete brand';
    return fail(message, 400);
  }
}
