/**
 * /api/products/[slug] - Single product operations by SKU or UUID.
 * GET: public product details
 * PUT: admin update product
 * DELETE: admin delete / retire product
 */
import { z } from 'zod';
import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { getProductBySlug, getProductById, updateProduct, deleteProduct } from '@/lib/products';
import { requireRole, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const isUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveProduct(identifier: string) {
  if (isUuidPattern.test(identifier)) {
    const byId = await getProductById(identifier);
    if (byId) return byId;
  }
  return getProductBySlug(identifier);
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const product = await resolveProduct(slug);
    if (!product) return fail('Product not found', 404);
    return ok({ product });
  } catch (e) {
    return serverError(e);
  }
}

const updateProductSchema = z.object({
  sku: z.string().min(2, 'SKU must be at least 2 characters').max(50).optional(),
  specimenNo: z.string().max(100).optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255).optional(),
  description: z.string().optional().nullable(),
  details: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  price: z.number().positive('Price must be greater than 0').optional(),
  originalPrice: z.number().positive().optional().nullable(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.object({ name: z.string(), hex: z.string() })).optional().nullable(),
  isFeatured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isSale: z.boolean().optional(),
  heroSpan: z.enum(['full', 'half', 'quarter']).optional().nullable(),
  stockQty: z.number().int().min(0, 'Stock cannot be negative').optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  brandId: z.string().uuid('Invalid brand ID').optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireRole('ADMIN');
    const { slug } = await params;

    const existing = await resolveProduct(slug);
    if (!existing) return fail('Product not found', 404);

    const json = await request.json();
    const parsed = updateProductSchema.safeParse(json);
    if (!parsed.success) {
      return fail('Validation failed', 400, parsed.error.format());
    }

    // Check SKU collision if changing SKU
    if (parsed.data.sku && parsed.data.sku.toLowerCase() !== existing.slug.toLowerCase()) {
      const collision = await prisma.product.findUnique({
        where: { sku: parsed.data.sku.toLowerCase().trim() },
      });
      if (collision && collision.id !== existing.id) {
        return fail(`SKU '${parsed.data.sku}' is already in use by another product`, 409);
      }
    }

    const updated = await updateProduct(existing.id, parsed.data);

    await recordAudit({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'Product',
      entityId: existing.id,
    });

    return ok({ product: updated });
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireRole('ADMIN');
    const { slug } = await params;

    const existing = await resolveProduct(slug);
    if (!existing) return fail('Product not found', 404);

    const result = await deleteProduct(existing.id);

    await recordAudit({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'Product',
      entityId: existing.id,
    });

    return ok(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}
