import { z } from 'zod';
import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { requireCustomer, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const WishlistSchema = z.object({
  productId: z.string().uuid(),
});

/**
 * GET /api/wishlist
 * Returns the current customer's wishlist items with product details.
 */
export async function GET() {
  try {
    const { customerId } = await requireCustomer();

    const items = await prisma.wishlist.findMany({
      where: { customerId },
      include: {
        product: {
          include: {
            category: { select: { name: true } },
            brand: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ok({
      items: items.map((w) => ({
        id: w.id,
        productId: w.productId,
        createdAt: w.createdAt,
        product: {
          id: w.product.id,
          sku: w.product.sku,
          slug: w.product.sku,
          name: w.product.name,
          price: Number(w.product.price),
          originalPrice: w.product.originalPrice ? Number(w.product.originalPrice) : undefined,
          images: w.product.images,
          category: w.product.category.name,
          brand: w.product.brand.name,
          inStock: w.product.stockQty > 0,
          stockCount: w.product.stockQty,
          isSale: w.product.isSale,
        },
      })),
      total: items.length,
    });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return serverError(error);
  }
}

/**
 * POST /api/wishlist
 * Toggles a product in the authenticated customer's wishlist.
 */
export async function POST(request: Request) {
  try {
    const { session, customerId } = await requireCustomer();
    const body = await request.json();
    const parsed = WishlistSchema.safeParse(body);

    if (!parsed.success) {
      return fail('Invalid product ID', 400);
    }

    const { productId } = parsed.data;

    // Check if product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return fail('Product not found', 404);

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        customerId_productId: { customerId, productId },
      },
    });

    if (existing) {
      // Toggle off: remove
      await prisma.wishlist.delete({ where: { id: existing.id } });
      return ok({ inWishlist: false, message: 'Removed from wishlist' });
    } else {
      // Toggle on: add
      const item = await prisma.wishlist.create({
        data: { customerId, productId },
      });
      await recordAudit({
        userId: session.user.id,
        action: 'CREATE',
        entity: 'Wishlist',
        entityId: item.id,
      });
      return ok({ inWishlist: true, message: 'Added to wishlist' });
    }
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return serverError(error);
  }
}

/**
 * DELETE /api/wishlist
 * Removes a product from the customer's wishlist.
 */
export async function DELETE(request: Request) {
  try {
    const { customerId } = await requireCustomer();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) return fail('productId query parameter is required', 400);

    await prisma.wishlist.deleteMany({
      where: { customerId, productId },
    });

    return ok({ message: 'Removed from wishlist' });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return serverError(error);
  }
}
