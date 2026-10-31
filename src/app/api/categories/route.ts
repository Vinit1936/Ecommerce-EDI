/**
 * /api/categories
 * GET: list all categories (supports ?detailed=true for full hierarchy and product counts)
 * POST: admin create category
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, serverError } from '@/lib/api';
import { listCategories, listCategoriesWithHierarchy, createCategory } from '@/lib/products';
import { requireRole, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const detailed = request.nextUrl.searchParams.get('detailed') === 'true';
    if (detailed) {
      const categories = await listCategoriesWithHierarchy();
      return ok({ categories });
    }
    const categories = await listCategories();
    return ok({ categories });
  } catch (e) {
    return serverError(e);
  }
}

const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(100),
  parentCategoryId: z.string().uuid('Invalid parent category ID').optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN');

    const json = await request.json();
    const parsed = createCategorySchema.safeParse(json);
    if (!parsed.success) {
      return fail('Validation failed', 400, parsed.error.format());
    }

    const category = await createCategory(parsed.data);

    await recordAudit({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'Category',
      entityId: category.id,
    });

    return ok({ category }, 201);
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}
