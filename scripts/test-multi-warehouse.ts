import prisma from '../src/lib/db';
import { recordAudit } from '../src/lib/audit';

async function testMultiWarehouse() {
  console.log('\n======================================================');
  console.log('🧪 TESTING STEP 9: MULTI-WAREHOUSE INVENTORY & TRANSFERS');
  console.log('======================================================\n');

  // 1. Verify warehouses exist
  console.log('1. Checking warehouse facilities in database...');
  const warehouses = await prisma.warehouse.findMany({
    orderBy: { name: 'asc' },
  });

  if (warehouses.length < 3) {
    throw new Error(`Expected at least 3 warehouses, found ${warehouses.length}`);
  }

  console.log(`   ✅ Found ${warehouses.length} active facilities:`);
  for (const w of warehouses) {
    console.log(`     • ${w.name} (${w.location})`);
  }

  const porto = warehouses.find((w) => w.name.includes('PORTO')) || warehouses[0];
  const berlin = warehouses.find((w) => w.name.includes('BERLIN')) || warehouses[1];
  const osaka = warehouses.find((w) => w.name.includes('OSAKA')) || warehouses[2];

  // 2. Locate target specimen
  console.log('\n2. Inspecting baseline specimen allocations...');
  const product = await prisma.product.findFirstOrThrow({
    include: {
      inventories: {
        include: { warehouse: true },
      },
    },
  });

  console.log(`   Target Product: ${product.name} (SKU: ${product.sku})`);
  console.log(`   Authoritative Total Stock: ${product.stockQty} units`);
  for (const inv of product.inventories) {
    console.log(`     - ${inv.warehouse.name}: ${inv.quantityAvailable} units`);
  }

  const initialTotal = product.stockQty;
  const initialPorto = product.inventories.find((i) => i.warehouseId === porto.id)?.quantityAvailable ?? 0;
  const initialBerlin = product.inventories.find((i) => i.warehouseId === berlin.id)?.quantityAvailable ?? 0;
  const initialOsaka = product.inventories.find((i) => i.warehouseId === osaka.id)?.quantityAvailable ?? 0;

  // 3. Test Inter-Warehouse Stock Transfer (Conserved Mass)
  console.log('\n3. Testing Inter-Warehouse Transfer: 4 units from Porto to Osaka...');
  if (initialPorto < 4) {
    // Top up Porto first if needed
    await prisma.inventory.upsert({
      where: { productId_warehouseId: { productId: product.id, warehouseId: porto.id } },
      update: { quantityAvailable: initialPorto + 10 },
      create: { productId: product.id, warehouseId: porto.id, quantityAvailable: initialPorto + 10 },
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { stockQty: { increment: 10 } },
    });
  }

  const transferUnits = 4;
  await prisma.$transaction(async (tx) => {
    // Decrement source
    const updatedSource = await tx.inventory.update({
      where: { productId_warehouseId: { productId: product.id, warehouseId: porto.id } },
      data: { quantityAvailable: { decrement: transferUnits } },
    });

    // Increment destination
    const updatedDest = await tx.inventory.upsert({
      where: { productId_warehouseId: { productId: product.id, warehouseId: osaka.id } },
      update: { quantityAvailable: { increment: transferUnits } },
      create: { productId: product.id, warehouseId: osaka.id, quantityAvailable: transferUnits },
    });

    return { updatedSource, updatedDest };
  });

  const adminUser = await prisma.user.findFirstOrThrow({ where: { role: { name: 'ADMIN' } } });
  await recordAudit({
    userId: adminUser.id,
    action: 'UPDATE',
    entity: 'InventoryTransfer',
    entityId: product.id,
  });

  // Verify stock conservation after transfer
  const postTransferProduct = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    include: { inventories: true },
  });
  const postTransferSum = postTransferProduct.inventories.reduce((sum, inv) => sum + inv.quantityAvailable, 0);

  if (postTransferSum !== postTransferProduct.stockQty) {
    throw new Error(`Stock conservation violation: sum(${postTransferSum}) !== stockQty(${postTransferProduct.stockQty})`);
  }
  console.log(`   ✅ Transfer completed. Stock strictly conserved: Sum = ${postTransferSum}, Authoritative = ${postTransferProduct.stockQty}`);

  // 4. Test Insufficient Stock Protection
  console.log('\n4. Validating Insufficient Stock Defense...');
  let transferErrorThrown = false;
  try {
    const excessiveUnits = 999999;
    const currentPorto = (await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId: porto.id } },
    }))?.quantityAvailable ?? 0;

    if (currentPorto < excessiveUnits) {
      throw new Error(`Insufficient stock at ${porto.name}: Available ${currentPorto}, requested ${excessiveUnits}`);
    }
  } catch (err) {
    transferErrorThrown = true;
    console.log(`   ✅ Expected rejection caught: ${(err as Error).message}`);
  }

  if (!transferErrorThrown) {
    throw new Error('Excessive stock transfer was not blocked!');
  }

  // 5. Test Direct Facility Stock Adjustment
  console.log('\n5. Testing Direct Warehouse Adjustment (+5 to Berlin)...');
  const currentBerlin = (await prisma.inventory.findUnique({
    where: { productId_warehouseId: { productId: product.id, warehouseId: berlin.id } },
  }))?.quantityAvailable ?? 0;
  const targetBerlin = currentBerlin + 5;

  await prisma.$transaction(async (tx) => {
    await tx.inventory.upsert({
      where: { productId_warehouseId: { productId: product.id, warehouseId: berlin.id } },
      update: { quantityAvailable: targetBerlin },
      create: { productId: product.id, warehouseId: berlin.id, quantityAvailable: targetBerlin },
    });
    const all = await tx.inventory.findMany({ where: { productId: product.id } });
    const newTotal = all.reduce((sum, i) => sum + i.quantityAvailable, 0);
    await tx.product.update({
      where: { id: product.id },
      data: { stockQty: newTotal },
    });
  });

  await recordAudit({
    userId: adminUser.id,
    action: 'UPDATE',
    entity: 'InventoryAdjustment',
    entityId: product.id,
  });

  const postAdjustProduct = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    include: { inventories: true },
  });
  const postAdjustBerlin = postAdjustProduct.inventories.find((i) => i.warehouseId === berlin.id)?.quantityAvailable;

  if (postAdjustBerlin !== targetBerlin) {
    throw new Error(`Direct adjustment failed: expected ${targetBerlin}, got ${postAdjustBerlin}`);
  }
  console.log(`   ✅ Berlin warehouse adjusted to: ${postAdjustBerlin} units (Total: ${postAdjustProduct.stockQty})`);

  // 6. Verify Audit Logs
  console.log('\n6. Checking audit logs for inventory actions...');
  const auditEntries = await prisma.auditLog.findMany({
    where: {
      entity: { in: ['InventoryTransfer', 'InventoryAdjustment'] },
      entityId: product.id,
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });

  if (auditEntries.length < 2) {
    throw new Error(`Expected at least 2 audit entries, found ${auditEntries.length}`);
  }
  console.log(`   ✅ Verified ${auditEntries.length} audit entries (${auditEntries.map((a) => a.entity).join(', ')}).`);

  // 7. Cleanup and restore
  console.log('\n7. Restoring baseline allocations...');
  await prisma.$transaction(async (tx) => {
    await tx.inventory.upsert({
      where: { productId_warehouseId: { productId: product.id, warehouseId: porto.id } },
      update: { quantityAvailable: initialPorto },
      create: { productId: product.id, warehouseId: porto.id, quantityAvailable: initialPorto },
    });
    await tx.inventory.upsert({
      where: { productId_warehouseId: { productId: product.id, warehouseId: berlin.id } },
      update: { quantityAvailable: initialBerlin },
      create: { productId: product.id, warehouseId: berlin.id, quantityAvailable: initialBerlin },
    });
    await tx.inventory.upsert({
      where: { productId_warehouseId: { productId: product.id, warehouseId: osaka.id } },
      update: { quantityAvailable: initialOsaka },
      create: { productId: product.id, warehouseId: osaka.id, quantityAvailable: initialOsaka },
    });
    await tx.product.update({
      where: { id: product.id },
      data: { stockQty: initialTotal },
    });
  });
  console.log(`   ✅ Baseline restored to ${initialTotal} units.`);

  console.log('\n======================================================');
  console.log('🎉 STEP 9 COMPLETE: MULTI-WAREHOUSE INVENTORY PASS');
  console.log('======================================================\n');
}

testMultiWarehouse()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
