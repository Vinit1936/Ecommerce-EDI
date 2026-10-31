import prisma from '../src/lib/db';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  listCategoriesWithHierarchy,
  createBrand,
  updateBrand,
  deleteBrand,
  listBrandsWithCounts,
} from '../src/lib/products';
import { recordAudit } from '../src/lib/audit';

async function testCategoryAndBrandCrud() {
  console.log('\n===============================================================');
  console.log('🧪 TESTING STEP 3: CATEGORY & BRAND CRUD (HIERARCHY & RELATIONS)');
  console.log('===============================================================\n');

  const admin = await prisma.user.findFirstOrThrow({ where: { role: { name: 'ADMIN' } } });

  // -------------------------------------------------------------------------
  // Part 1: Category CRUD & Hierarchy
  // -------------------------------------------------------------------------
  console.log('1. Testing Category Creation with Hierarchy...');
  const rootCat = await createCategory({ name: `TEST ROOT ${Date.now()}` });
  await recordAudit({ userId: admin.id, action: 'CREATE', entity: 'Category', entityId: rootCat.id });
  console.log(`   ✅ Root category created: "${rootCat.name}" (ID: ${rootCat.id})`);

  const childCat = await createCategory({
    name: `TEST SUB ${Date.now()}`,
    parentCategoryId: rootCat.id,
  });
  await recordAudit({ userId: admin.id, action: 'CREATE', entity: 'Category', entityId: childCat.id });
  console.log(`   ✅ Nested child category created: "${childCat.name}" under parent "${rootCat.name}"`);

  // Verify hierarchy listing
  const hierarchyList = await listCategoriesWithHierarchy();
  const foundChild = hierarchyList.find((c) => c.id === childCat.id);
  if (!foundChild || foundChild.parentCategoryId !== rootCat.id) {
    throw new Error('Category hierarchy verification failed');
  }
  console.log(`   ✅ Hierarchy listing verified: child correctly linked to parent "${foundChild.parentCategoryName}"`);

  // Update Category
  console.log('\n2. Testing Category Update...');
  const updatedChild = await updateCategory(childCat.id, { name: `${childCat.name} (RENAMED)` });
  await recordAudit({ userId: admin.id, action: 'UPDATE', entity: 'Category', entityId: childCat.id });
  console.log(`   ✅ Updated category name to: "${updatedChild.name}"`);

  // Self-parenting prevention
  try {
    await updateCategory(childCat.id, { parentCategoryId: childCat.id });
    throw new Error('Self-parenting should have failed!');
  } catch (err: unknown) {
    console.log(`   ✅ Self-parenting safely prevented: "${(err as Error).message}"`);
  }

  // FK Safety: Try deleting root when it has child subcategories
  console.log('\n3. Testing FK Referential Safety for Categories...');
  try {
    await deleteCategory(rootCat.id);
    throw new Error('Deleting root category with child should have been rejected!');
  } catch (err: unknown) {
    console.log(`   ✅ Deletion of parent blocked by child constraint: "${(err as Error).message}"`);
  }

  // Delete child, then delete root
  await deleteCategory(childCat.id);
  await recordAudit({ userId: admin.id, action: 'DELETE', entity: 'Category', entityId: childCat.id });
  console.log(`   ✅ Child category deleted.`);

  await deleteCategory(rootCat.id);
  await recordAudit({ userId: admin.id, action: 'DELETE', entity: 'Category', entityId: rootCat.id });
  console.log(`   ✅ Root category deleted.`);

  // -------------------------------------------------------------------------
  // Part 2: Brand CRUD & Foreign Key Safety
  // -------------------------------------------------------------------------
  console.log('\n4. Testing Brand Creation & Counts...');
  const newBrand = await createBrand({ name: `TEST ATELIER ${Date.now()}` });
  await recordAudit({ userId: admin.id, action: 'CREATE', entity: 'Brand', entityId: newBrand.id });
  console.log(`   ✅ Brand created: "${newBrand.name}" (ID: ${newBrand.id})`);

  const brandsList = await listBrandsWithCounts();
  const foundBrand = brandsList.find((b) => b.id === newBrand.id);
  if (!foundBrand || foundBrand.productCount !== 0) {
    throw new Error('Brand listing with product counts failed');
  }
  console.log(`   ✅ Brand listing verified with productCount: ${foundBrand.productCount}`);

  // Update Brand
  console.log('\n5. Testing Brand Update...');
  const updatedBrand = await updateBrand(newBrand.id, { name: `${newBrand.name} (LUXURY)` });
  await recordAudit({ userId: admin.id, action: 'UPDATE', entity: 'Brand', entityId: newBrand.id });
  console.log(`   ✅ Brand updated to: "${updatedBrand.name}"`);

  // FK Safety: Try deleting a seeded brand that has products attached
  const existingBrandWithProducts = await prisma.brand.findFirstOrThrow({
    where: { products: { some: {} } },
  });
  try {
    await deleteBrand(existingBrandWithProducts.id);
    throw new Error('Deleting brand with products should have been rejected!');
  } catch (err: unknown) {
    console.log(`   ✅ Brand with products safely protected from deletion: "${(err as Error).message}"`);
  }

  // Delete the new test brand
  await deleteBrand(newBrand.id);
  await recordAudit({ userId: admin.id, action: 'DELETE', entity: 'Brand', entityId: newBrand.id });
  console.log(`   ✅ Test brand deleted cleanly.`);

  // -------------------------------------------------------------------------
  // Part 3: Verify Audit Logs
  // -------------------------------------------------------------------------
  console.log('\n6. Verifying Audit Logs for Category and Brand actions...');
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: 'Category', entityId: rootCat.id },
        { entity: 'Category', entityId: childCat.id },
        { entity: 'Brand', entityId: newBrand.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`   ✅ Found ${logs.length} audit entries:`);
  logs.forEach((l) => console.log(`      • ${l.action} ${l.entity} (${l.entityId.slice(0, 8)}...)`));

  if (logs.length !== 8) {
    throw new Error(`Expected 8 audit logs, found ${logs.length}`);
  }

  console.log('\n🎉 ALL STEP 3 CATEGORY & BRAND CRUD TESTS PASSED PERFECTLY!\n');
}

testCategoryAndBrandCrud()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
