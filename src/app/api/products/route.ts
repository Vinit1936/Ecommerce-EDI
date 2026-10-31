/**
 * GET /api/products - filtered product list.
 * Query: ?q=&category=&brand=&sort=&inStock=true&limit=&offset=
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { listProducts, createProduct } from '@/lib/products';
import { requireRole, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import type { ProductSort } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SORTS: ProductSort[] = ['featured', 'price-asc', 'price-desc', 'newest'];

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const sortParam = p.get('sort') as ProductSort | null;

    const result = await listProducts({
      q: p.get('q') ?? undefined,
      category: p.get('category') ?? undefined,
      brand: p.get('brand') ?? undefined,
      sort: sortParam && SORTS.includes(sortParam) ? sortParam : 'featured',
      inStock: p.get('inStock') === 'true',
      limit: p.get('limit') ? Number(p.get('limit')) : undefined,
      offset: p.get('offset') ? Number(p.get('offset')) : undefined,
    });

    return ok(result);
  } catch (e) {
    return serverError(e);
  }
}

const createProductSchema = z.object({
  sku: z.string().min(2, 'SKU must be at least 2 characters').max(50),
  specimenNo: z.string().max(100).optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  description: z.string().optional(),
  details: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  price: z.number().positive('Price must be greater than 0'),
  originalPrice: z.number().positive().optional().nullable(),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.object({ name: z.string(), hex: z.string() })).optional().nullable(),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isSale: z.boolean().default(false),
  heroSpan: z.enum(['full', 'half', 'quarter']).optional().nullable(),
  stockQty: z.number().int().min(0, 'Stock cannot be negative').default(0),
  categoryId: z.string().uuid('Invalid category ID'),
  brandId: z.string().uuid('Invalid brand ID'),
});

/**
 * POST /api/products - Admin create new product.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN');

    const json = await request.json();
    const parsed = createProductSchema.safeParse(json);
    if (!parsed.success) {
      return fail('Validation failed', 400, parsed.error.format());
    }

    const { sku } = parsed.data;
    const existing = await prisma.product.findUnique({
      where: { sku: sku.toLowerCase().trim() },
    });
    if (existing) {
      return fail(`Product with SKU '${sku}' already exists`, 409);
    }

    const product = await createProduct(parsed.data);

    await recordAudit({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
    });

    return ok({ product }, 201);
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}
