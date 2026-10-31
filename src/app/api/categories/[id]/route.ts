/**
 * /api/categories/[id]
 * PUT: admin update category
 * DELETE: admin delete category (with FK safety)
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, serverError } from '@/lib/api';
import { updateCategory, deleteCategory } from '@/lib/products';
import { requireRole, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const updateCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(100).optional(),
  parentCategoryId: z.string().uuid('Invalid parent category ID').optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole('ADMIN');
    const { id } = await params;

    const json = await request.json();
    const parsed = updateCategorySchema.safeParse(json);
    if (!parsed.success) {
      return fail('Validation failed', 400, parsed.error.format());
    }

    const updated = await updateCategory(id, parsed.data);

    await recordAudit({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'Category',
      entityId: id,
    });

    return ok({ category: updated });
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

    await deleteCategory(id);

    await recordAudit({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'Category',
      entityId: id,
    });

    return ok({ deleted: true, id });
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    const message = e instanceof Error ? e.message : 'Failed to delete category';
    return fail(message, 400);
  }
}
