/**
 * /api/vendor/products
 * GET: retrieve assigned vendor brand catalog with sales performance
 * PATCH: update stock for an assigned vendor product
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { requireRole, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const stockUpdateSchema = z.object({
  productId: z.string().uuid(),
  stockQty: z.number().int().min(0, 'Stock cannot be negative'),
});

export async function GET() {
  try {
    const session = await requireRole('VENDOR', 'ADMIN');

    // Default vendor demo is assigned to PORTO WORKS
    let brand = await prisma.brand.findFirst({
      where: { name: 'PORTO WORKS' },
    });

    if (!brand) {
      brand = await prisma.brand.findFirst();
    }

    if (!brand) {
      return fail('No vendor brand configuration found', 404);
    }

    const products = await prisma.product.findMany({
      where: { brandId: brand.id },
      include: {
        category: { select: { id: true, name: true } },
        orderItems: {
          include: {
            order: { select: { status: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalUnitsSold = 0;
    let totalRevenue = 0;
    let totalStock = 0;

    const vendorProducts = products.map((p) => {
      totalStock += p.stockQty;

      const validOrderItems = p.orderItems.filter(
        (item) => item.order.status !== 'CANCELLED'
      );
      const unitsSold = validOrderItems.reduce((acc, item) => acc + item.quantity, 0);
      const revenue = validOrderItems.reduce(
        (acc, item) => acc + item.quantity * Number(item.unitPrice),
        0
      );

      totalUnitsSold += unitsSold;
      totalRevenue += revenue;

      return {
        id: p.id,
        sku: p.sku,
        specimenNo: p.specimenNo,
        name: p.name,
        price: Number(p.price),
        category: p.category.name,
        stockQty: p.stockQty,
        images: p.images,
        unitsSold,
        revenue,
      };
    });

    return ok({
      brand: {
        id: brand.id,
        name: brand.name,
      },
      userEmail: session.user.email,
      role: session.user.role,
      products: vendorProducts,
      metrics: {
        totalProducts: vendorProducts.length,
        totalUnitsSold,
        totalRevenue,
        totalStock,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole('VENDOR', 'ADMIN');

    const json = await request.json();
    const parsed = stockUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return fail('Validation error', 400, parsed.error.format());
    }

    const { productId, stockQty } = parsed.data;

    // Verify product exists and belongs to vendor's brand if role is VENDOR
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { brand: true },
    });

    if (!product) {
      return fail('Product not found', 404);
    }

    if (session.user.role === 'VENDOR') {
      const allowedBrand = await prisma.brand.findFirst({
        where: { name: 'PORTO WORKS' },
      });
      if (allowedBrand && product.brandId !== allowedBrand.id) {
        return fail('Unauthorized: This product does not belong to your vendor brand', 403);
      }
    }

    // Update product stock and default inventory atomically
    const warehouse = await prisma.warehouse.findFirst();
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: productId },
        data: { stockQty },
      });

      if (warehouse) {
        await tx.inventory.upsert({
          where: {
            productId_warehouseId: { productId, warehouseId: warehouse.id },
          },
          update: { quantityAvailable: stockQty },
          create: {
            productId,
            warehouseId: warehouse.id,
            quantityAvailable: stockQty,
          },
        });
      }

      return p;
    });

    await recordAudit({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'VendorStock',
      entityId: productId,
    });

    return ok({
      productId: updated.id,
      sku: updated.sku,
      name: updated.name,
      stockQty: updated.stockQty,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}
