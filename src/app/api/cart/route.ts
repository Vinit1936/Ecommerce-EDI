/**
 * /api/cart — the signed-in customer's cart.
 * GET list · POST add · PATCH set quantity · DELETE remove one or clear all
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, serverError } from '@/lib/api';
import { AuthError, requireCustomer } from '@/lib/auth';
import { addToCart, clearCart, getCart, mergeGuestCart, removeFromCart, setQuantity } from '@/lib/cart';

export const dynamic = 'force-dynamic';

const lineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(0).max(99).default(1),
  selectedSize: z.string().max(50).optional(),
  selectedColor: z.string().max(50).optional(),
});

const postSchema = z.union([
  lineSchema,
  z.object({ merge: z.array(lineSchema) }),
]);

function handle(e: unknown) {
  if (e instanceof AuthError) return fail(e.message, e.status);
  return serverError(e);
}

export async function GET() {
  try {
    const { customerId } = await requireCustomer();
    return ok(await getCart(customerId));
  } catch (e) {
    return handle(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { customerId } = await requireCustomer();
    const parsed = postSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail('Invalid cart payload', 422, parsed.error.issues);

    if ('merge' in parsed.data) {
      await mergeGuestCart(customerId, parsed.data.merge);
    } else {
      const l = parsed.data;
      await addToCart(customerId, l.productId, l.quantity || 1, l.selectedSize ?? '', l.selectedColor ?? '');
    }
    return ok(await getCart(customerId));
  } catch (e) {
    return handle(e);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { customerId } = await requireCustomer();
    const parsed = lineSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail('Invalid cart payload', 422, parsed.error.issues);

    const l = parsed.data;
    await setQuantity(customerId, l.productId, l.quantity, l.selectedSize ?? '', l.selectedColor ?? '');
    return ok(await getCart(customerId));
  } catch (e) {
    return handle(e);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { customerId } = await requireCustomer();
    const productId = request.nextUrl.searchParams.get('productId');

    if (!productId) {
      await clearCart(customerId);
    } else {
      await removeFromCart(
        customerId,
        productId,
        request.nextUrl.searchParams.get('size') ?? '',
        request.nextUrl.searchParams.get('color') ?? ''
      );
    }
    return ok(await getCart(customerId));
  } catch (e) {
    return handle(e);
  }
}
