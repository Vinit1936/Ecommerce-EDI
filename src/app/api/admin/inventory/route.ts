/**
 * /api/admin/inventory
 * GET: retrieve comprehensive multi-warehouse inventory telemetry and breakdown
 */
import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { requireRole, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole('ADMIN');

    // 1. Fetch all warehouses
    const warehouses = await prisma.warehouse.findMany({
      include: {
        inventories: {
          select: { quantityAvailable: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const warehouseSummary = warehouses.map((w) => {
      const totalUnits = w.inventories.reduce((acc, inv) => acc + inv.quantityAvailable, 0);
      return {
        id: w.id,
        name: w.name,
        location: w.location,
        totalUnits,
      };
    });

    // 2. Fetch all products with inventory breakdown
    const products = await prisma.product.findMany({
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        inventories: {
          include: {
            warehouse: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    let totalStockAcrossAll = 0;
    let lowStockCount = 0;
    let depletedCount = 0;

    const inventoryItems = products.map((p) => {
      totalStockAcrossAll += p.stockQty;

      if (p.stockQty === 0) {
        depletedCount++;
      } else if (p.stockQty <= 5) {
        lowStockCount++;
      }

      // Map breakdown by warehouse
      const breakdown = p.inventories.map((inv) => ({
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse.name,
        quantityAvailable: inv.quantityAvailable,
      }));

      return {
        id: p.id,
        sku: p.sku,
        specimenNo: p.specimenNo,
        name: p.name,
        category: p.category.name,
        brand: p.brand.name,
        totalStock: p.stockQty,
        price: Number(p.price),
        images: p.images,
        isLowStock: p.stockQty > 0 && p.stockQty <= 5,
        isDepleted: p.stockQty === 0,
        warehouseBreakdown: breakdown,
      };
    });

    return ok({
      warehouses: warehouseSummary,
      items: inventoryItems,
      metrics: {
        totalStock: totalStockAcrossAll,
        totalSkus: products.length,
        lowStockCount,
        depletedCount,
        warehouseCount: warehouses.length,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}
