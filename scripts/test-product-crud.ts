import fs from 'fs';
import path from 'path';

for (const file of ['.env.local', '.env']) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

import prisma from '../src/lib/db';
import { createProduct, updateProduct, deleteProduct, getProductBySlug } from '../src/lib/products';
import { recordAudit } from '../src/lib/audit';

async function testProductCrud() {
  console.log('\n======================================================');
  console.log('🧪 TESTING STEP 2: PRODUCT MANAGEMENT CRUD OPERATIONS');
  console.log('======================================================\n');

  const testSku = `test-crud-${Date.now()}`;
  const category = await prisma.category.findFirstOrThrow();
  const brand = await prisma.brand.findFirstOrThrow();
  const admin = await prisma.user.findFirstOrThrow({ where: { role: { name: 'ADMIN' } } });

  // 1. Create Product
  console.log(`1. Creating test product with SKU: ${testSku}...`);
  const created = await createProduct({
    sku: testSku,
    specimenNo: `Specimen No. ${testSku.toUpperCase()}`,
    name: 'TEST CRUD OVERSIZED TEE',
    price: 185.5,
    originalPrice: 220.0,
    stockQty: 25,
    categoryId: category.id,
    brandId: brand.id,
    description: 'High-density cotton specimen for automated integration testing.',
    details: ['100% Organic Jersey', 'Custom Garment Dye'],
    images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80'],
    sizes: ['M', 'L', 'XL'],
    isFeatured: true,
    isNew: true,
  });

  await recordAudit({
    userId: admin.id,
    action: 'CREATE',
    entity: 'Product',
    entityId: created.id,
  });

  console.log(`   ✅ Created product successfully: ID=${created.id}, Price=$${created.price}, Stock=${created.stockCount}`);

  // Verify inventory row was created
  const inventory = await prisma.inventory.findFirst({ where: { productId: created.id } });
  if (!inventory || inventory.quantityAvailable !== 25) {
    throw new Error(`Inventory verification failed. Expected 25, got ${inventory?.quantityAvailable}`);
  }
  console.log(`   ✅ Inventory record created with quantity: ${inventory.quantityAvailable}`);

  // 2. Read Product
  console.log('\n2. Reading product by SKU...');
  const fetched = await getProductBySlug(testSku);
  if (!fetched || fetched.id !== created.id) {
    throw new Error('Product lookup by SKU failed');
  }
  console.log(`   ✅ Successfully retrieved: "${fetched.name}" (${fetched.category} / ${fetched.brand})`);

  // 3. Update Product
  console.log('\n3. Updating product price and stock...');
  const updated = await updateProduct(created.id, {
    price: 199.99,
    stockQty: 40,
    name: 'TEST CRUD OVERSIZED TEE (REVISED EDITION)',
  });

  await recordAudit({
    userId: admin.id,
    action: 'UPDATE',
    entity: 'Product',
    entityId: created.id,
  });

  if (updated.price !== 199.99 || updated.stockCount !== 40) {
    throw new Error(`Update verification failed: price=${updated.price}, stock=${updated.stockCount}`);
  }
  console.log(`   ✅ Successfully updated: Name="${updated.name}", Price=$${updated.price}, Stock=${updated.stockCount}`);

  // Verify inventory was synchronized
  const updatedInv = await prisma.inventory.findFirst({ where: { productId: created.id } });
  if (updatedInv?.quantityAvailable !== 40) {
    throw new Error(`Inventory sync failed. Expected 40, got ${updatedInv?.quantityAvailable}`);
  }
  console.log(`   ✅ Inventory synchronized: quantityAvailable=${updatedInv.quantityAvailable}`);

  // 4. Delete Product
  console.log('\n4. Deleting test product...');
  const deleteResult = await deleteProduct(created.id);
  await recordAudit({
    userId: admin.id,
    action: 'DELETE',
    entity: 'Product',
    entityId: created.id,
  });

  console.log(`   ✅ Deleted successfully: ${JSON.stringify(deleteResult)}`);

  const lookupAfterDelete = await getProductBySlug(testSku);
  if (lookupAfterDelete !== null) {
    throw new Error('Product still exists after delete');
  }
  console.log('   ✅ Confirmed product no longer exists in database.');

  // 5. Verify Audit Logs
  const auditLogs = await prisma.auditLog.findMany({
    where: { entity: 'Product', entityId: created.id },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`\n5. Verifying audit trail: found ${auditLogs.length} audit entries:`);
  auditLogs.forEach((log) => {
    console.log(`   • Action: ${log.action} | Entity: ${log.entity} | Time: ${log.createdAt.toISOString()}`);
  });

  if (auditLogs.length !== 3) {
    throw new Error(`Expected 3 audit logs (CREATE, UPDATE, DELETE), found ${auditLogs.length}`);
  }

  console.log('\n🎉 ALL STEP 2 PRODUCT MANAGEMENT TESTS PASSED PERFECTLY!\n');
}

testProductCrud()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
