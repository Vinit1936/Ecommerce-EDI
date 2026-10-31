/**
 * /api/admin/inventory/adjust
 * POST: execute warehouse stock adjustment or inter-warehouse transfer
 * All actions execute inside PostgreSQL transactions with audit logging.
 */
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { ok, fail, serverError } from '@/lib/api';
import { requireRole, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const adjustSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ADJUST'),
    productId: z.string().uuid(),
    warehouseId: z.string().uuid(),
    quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  }),
  z.object({
    type: z.literal('TRANSFER'),
    productId: z.string().uuid(),
    fromWarehouseId: z.string().uuid(),
    toWarehouseId: z.string().uuid(),
    quantity: z.number().int().min(1, 'Transfer quantity must be at least 1'),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN');

    const json = await request.json();
    const parsed = adjustSchema.safeParse(json);
    if (!parsed.success) {
      return fail('Validation error', 400, parsed.error.format());
    }

    const payload = parsed.data;

    // Operation 1: Direct Warehouse Stock Adjustment
    if (payload.type === 'ADJUST') {
      const { productId, warehouseId, quantity } = payload;

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return fail('Product specimen not found', 404);

      const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
      if (!warehouse) return fail('Warehouse facility not found', 404);

      const result = await prisma.$transaction(async (tx) => {
        // Upsert warehouse inventory
        await tx.inventory.upsert({
          where: {
            productId_warehouseId: { productId, warehouseId },
          },
          update: { quantityAvailable: quantity },
          create: {
            productId,
            warehouseId,
            quantityAvailable: quantity,
          },
        });

        // Recalculate authoritative total across all warehouses
        const allInventories = await tx.inventory.findMany({
          where: { productId },
        });
        const newTotalStock = allInventories.reduce((acc, inv) => acc + inv.quantityAvailable, 0);

        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { stockQty: newTotalStock },
        });

        return {
          productId: updatedProduct.id,
          productName: updatedProduct.name,
          warehouseName: warehouse.name,
          warehouseQuantity: quantity,
          totalStock: updatedProduct.stockQty,
        };
      });

      await recordAudit({
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'InventoryAdjustment',
        entityId: productId,
      });

      return ok(result);
    }

    // Operation 2: Inter-Warehouse Stock Transfer
    if (payload.type === 'TRANSFER') {
      const { productId, fromWarehouseId, toWarehouseId, quantity } = payload;

      if (fromWarehouseId === toWarehouseId) {
        return fail('Source and destination warehouse cannot be the same', 400);
      }

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return fail('Product specimen not found', 404);

      const [sourceWh, destWh] = await Promise.all([
        prisma.warehouse.findUnique({ where: { id: fromWarehouseId } }),
        prisma.warehouse.findUnique({ where: { id: toWarehouseId } }),
      ]);

      if (!sourceWh || !destWh) {
        return fail('Specified warehouse facility does not exist', 404);
      }

      const result = await prisma.$transaction(async (tx) => {
        // Check source inventory
        const sourceInventory = await tx.inventory.findUnique({
          where: {
            productId_warehouseId: { productId, warehouseId: fromWarehouseId },
          },
        });

        if (!sourceInventory || sourceInventory.quantityAvailable < quantity) {
          throw new Error(
            `Insufficient stock at ${sourceWh.name}: Available ${sourceInventory?.quantityAvailable ?? 0}, requested ${quantity}`
          );
        }

        // Decrement source warehouse
        const updatedSource = await tx.inventory.update({
          where: {
            productId_warehouseId: { productId, warehouseId: fromWarehouseId },
          },
          data: {
            quantityAvailable: { decrement: quantity },
          },
        });

        // Increment destination warehouse
        const updatedDest = await tx.inventory.upsert({
          where: {
            productId_warehouseId: { productId, warehouseId: toWarehouseId },
          },
          update: {
            quantityAvailable: { increment: quantity },
          },
          create: {
            productId,
            warehouseId: toWarehouseId,
            quantityAvailable: quantity,
          },
        });

        return {
          productId,
          productName: product.name,
          transferredUnits: quantity,
          source: {
            warehouseId: fromWarehouseId,
            name: sourceWh.name,
            newQuantity: updatedSource.quantityAvailable,
          },
          destination: {
            warehouseId: toWarehouseId,
            name: destWh.name,
            newQuantity: updatedDest.quantityAvailable,
          },
          totalConservedStock: product.stockQty,
        };
      });

      await recordAudit({
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'InventoryTransfer',
        entityId: productId,
      });

      return ok(result);
    }

    return fail('Unsupported operation', 400);
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}
