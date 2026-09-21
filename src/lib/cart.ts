/** Server-side cart helpers — Team 2. */
import prisma from '@/lib/db';
import { toProduct } from '@/lib/products';

const cartInclude = {
  product: { include: { category: { select: { name: true } }, brand: { select: { name: true } } } },
} as const;

/** Cart in the shape CartContext renders: product object + quantity + variant. */
export async function getCart(customerId: string) {
  const rows = await prisma.cart.findMany({
    where: { customerId },
    include: cartInclude,
    orderBy: { createdAt: 'asc' },
  });

  const items = rows.map((row) => ({
    product: toProduct(row.product),
    quantity: row.quantity,
    selectedSize: row.selectedSize || undefined,
    selectedColor: row.selectedColor || undefined,
  }));

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  return { items, subtotal };
}

/** Adds to an existing line rather than replacing it, matching the client behaviour. */
export async function addToCart(
  customerId: string,
  productId: string,
  quantity = 1,
  selectedSize = '',
  selectedColor = ''
) {
  const key = { customerId, productId, selectedSize, selectedColor };
  return prisma.cart.upsert({
    where: { customerId_productId_selectedSize_selectedColor: key },
    update: { quantity: { increment: quantity } },
    create: { ...key, quantity },
  });
}

/** Sets an absolute quantity; a quantity of 0 or less removes the line. */
export async function setQuantity(
  customerId: string,
  productId: string,
  quantity: number,
  selectedSize = '',
  selectedColor = ''
) {
  const key = { customerId, productId, selectedSize, selectedColor };
  if (quantity <= 0) {
    await prisma.cart.deleteMany({ where: key });
    return null;
  }
  return prisma.cart.upsert({
    where: { customerId_productId_selectedSize_selectedColor: key },
    update: { quantity },
    create: { ...key, quantity },
  });
}

export async function removeFromCart(
  customerId: string,
  productId: string,
  selectedSize = '',
  selectedColor = ''
) {
  await prisma.cart.deleteMany({ where: { customerId, productId, selectedSize, selectedColor } });
}

export async function clearCart(customerId: string) {
  await prisma.cart.deleteMany({ where: { customerId } });
}

/**
 * Folds a guest's localStorage cart into their database cart at sign-in, so
 * items chosen before logging in are not silently lost.
 */
export async function mergeGuestCart(
  customerId: string,
  lines: { productId: string; quantity: number; selectedSize?: string; selectedColor?: string }[]
) {
  for (const line of lines) {
    await addToCart(
      customerId,
      line.productId,
      line.quantity,
      line.selectedSize ?? '',
      line.selectedColor ?? ''
    );
  }
}
