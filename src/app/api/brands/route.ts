/**
 * /api/brands
 * GET: list all brands (supports ?detailed=true for product counts)
 * POST: admin create brand
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, serverError } from '@/lib/api';
import { listBrands, listBrandsWithCounts, createBrand } from '@/lib/products';
import { requireRole, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const detailed = request.nextUrl.searchParams.get('detailed') === 'true';
    if (detailed) {
      const brands = await listBrandsWithCounts();
      return ok({ brands });
    }
    const brands = await listBrands();
    return ok({ brands });
  } catch (e) {
    return serverError(e);
  }
}

const createBrandSchema = z.object({
  name: z.string().min(2, 'Brand name must be at least 2 characters').max(100),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN');

    const json = await request.json();
    const parsed = createBrandSchema.safeParse(json);
    if (!parsed.success) {
      return fail('Validation failed', 400, parsed.error.format());
    }

    const brand = await createBrand(parsed.data);

    await recordAudit({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'Brand',
      entityId: brand.id,
    });

    return ok({ brand }, 201);
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}
