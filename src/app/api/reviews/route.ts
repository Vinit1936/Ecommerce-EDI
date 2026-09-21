import { z } from 'zod';
import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { requireCustomer, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const CreateReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(1000).optional(),
});

/**
 * GET /api/reviews?productId=...
 * Returns all reviews for a product plus the aggregate average rating.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return fail('productId query parameter is required', 400);
    }

    const reviews = await prisma.productReview.findMany({
      where: { productId },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    return ok({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        author: `${r.customer.firstName || ''} ${r.customer.lastName || ''}`.trim() || 'Anonymous Customer',
      })),
      total: reviews.length,
      averageRating: Number(averageRating.toFixed(1)),
    });
  } catch (error) {
    return serverError(error);
  }
}

/**
 * POST /api/reviews
 * Creates or updates a review for the authenticated customer.
 */
export async function POST(request: Request) {
  try {
    const { session, customerId } = await requireCustomer();
    const body = await request.json();
    const parsed = CreateReviewSchema.safeParse(body);

    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid review data', 400);
    }

    const { productId, rating, comment } = parsed.data;

    // Check if product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return fail('Product not found', 404);
    }

    // Upsert review (enforce 1 review per customer per product)
    const review = await prisma.productReview.upsert({
      where: {
        productId_customerId: {
          productId,
          customerId,
        },
      },
      create: {
        productId,
        customerId,
        rating,
        comment: comment || null,
      },
      update: {
        rating,
        comment: comment || null,
      },
    });

    await recordAudit({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'ProductReview',
      entityId: review.id,
    });

    return ok({ review });
  } catch (error) {
    if (error instanceof AuthError) {
      return fail(error.message, error.status);
    }
    return serverError(error);
  }
}
