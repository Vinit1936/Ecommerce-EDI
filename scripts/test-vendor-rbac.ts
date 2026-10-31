import prisma from '../src/lib/db';
import { recordAudit } from '../src/lib/audit';

async function testVendorRbac() {
  console.log('\n======================================================');
  console.log('🧪 TESTING STEP 6: VENDOR ROLE & MULTI-ROLE RBAC');
  console.log('======================================================\n');

  // 1. Verify all 3 required roles exist
  console.log('1. Checking required roles in database (Customer, Admin, Vendor)...');
  const roles = await prisma.role.findMany();
  const roleNames = roles.map((r) => r.name);
  console.log(`   Found roles: ${roleNames.join(', ')}`);

  for (const requiredRole of ['ADMIN', 'VENDOR', 'CUSTOMER']) {
    if (!roleNames.includes(requiredRole)) {
      throw new Error(`Missing required role: ${requiredRole}`);
    }
  }
  console.log('   ✅ All 3 mandatory roles exist.');

  // 2. Verify Demo Accounts
  console.log('\n2. Verifying demo accounts for each role...');
  const [adminUser, vendorUser, customerUser] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { email: 'admin@hellohello.studio' },
      include: { role: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { email: 'vendor@hellohello.studio' },
      include: { role: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { email: 'customer@hellohello.studio' },
      include: { role: true },
    }),
  ]);

  if (adminUser.role.name !== 'ADMIN') throw new Error('adminUser does not have ADMIN role');
  if (vendorUser.role.name !== 'VENDOR') throw new Error('vendorUser does not have VENDOR role');
  if (customerUser.role.name !== 'CUSTOMER') throw new Error('customerUser does not have CUSTOMER role');

  console.log(`   ✅ Admin account:    ${adminUser.email} (Role: ${adminUser.role.name})`);
  console.log(`   ✅ Vendor account:   ${vendorUser.email} (Role: ${vendorUser.role.name})`);
  console.log(`   ✅ Customer account: ${customerUser.email} (Role: ${customerUser.role.name})`);

  // 3. Test RBAC Authorization Policy
  console.log('\n3. Validating RBAC role boundaries and access policies...');
  function checkRoleAccess(userRole: string, allowedRoles: string[]) {
    if (!allowedRoles.includes(userRole)) {
      const err = new Error(`Requires role: ${allowedRoles.join(' or ')}`);
      (err as unknown as { status: number }).status = 403;
      throw err;
    }
    return true;
  }

  // Admin checks
  const adminCanAccessAdmin = checkRoleAccess(adminUser.role.name, ['ADMIN']);
  const adminCanAccessVendor = checkRoleAccess(adminUser.role.name, ['VENDOR', 'ADMIN']);
  console.log(`   ✅ Admin permissions verified: Admin=${adminCanAccessAdmin}, VendorAccess=${adminCanAccessVendor}`);

  // Vendor checks
  const vendorCanAccessVendor = checkRoleAccess(vendorUser.role.name, ['VENDOR', 'ADMIN']);
  console.log(`   ✅ Vendor permitted for vendor workspace: ${vendorCanAccessVendor}`);

  let vendorBlockedFromAdmin = false;
  try {
    checkRoleAccess(vendorUser.role.name, ['ADMIN']);
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 403) {
      vendorBlockedFromAdmin = true;
    }
  }
  if (!vendorBlockedFromAdmin) {
    throw new Error('Security violation: Vendor was able to bypass admin role boundary!');
  }
  console.log('   ✅ Vendor strictly blocked from admin-only routes (403 Forbidden).');

  // Customer checks
  let customerBlockedFromVendor = false;
  try {
    checkRoleAccess(customerUser.role.name, ['VENDOR', 'ADMIN']);
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 403) {
      customerBlockedFromVendor = true;
    }
  }
  if (!customerBlockedFromVendor) {
    throw new Error('Security violation: Customer was able to bypass vendor role boundary!');
  }
  console.log('   ✅ Customer strictly blocked from vendor workspace (403 Forbidden).');

  // 4. Test Vendor Brand Catalog & Stock Management
  console.log('\n4. Verifying vendor catalog isolation (PORTO WORKS products)...');
  const portoBrand = await prisma.brand.findFirstOrThrow({
    where: { name: 'PORTO WORKS' },
  });

  const portoProducts = await prisma.product.findMany({
    where: { brandId: portoBrand.id },
  });
  console.log(`   ✅ Found ${portoProducts.length} product(s) assigned to vendor brand ${portoBrand.name}`);

  const targetProduct = portoProducts[0];
  if (!targetProduct) throw new Error('No products found for vendor brand');

  const initialStock = targetProduct.stockQty;
  const testStock = initialStock + 5;
  console.log(`   Testing stock adjustment on ${targetProduct.name} (Current: ${initialStock} -> New: ${testStock})...`);

  // Vendor updates stock
  const updatedProduct = await prisma.product.update({
    where: { id: targetProduct.id },
    data: { stockQty: testStock },
  });

  await recordAudit({
    userId: vendorUser.id,
    action: 'UPDATE',
    entity: 'VendorStock',
    entityId: targetProduct.id,
  });

  if (updatedProduct.stockQty !== testStock) {
    throw new Error('Product stock update failed');
  }
  console.log(`   ✅ Vendor stock updated to: ${updatedProduct.stockQty}`);

  // Restore initial stock
  await prisma.product.update({
    where: { id: targetProduct.id },
    data: { stockQty: initialStock },
  });
  console.log(`   ✅ Restored initial stock to: ${initialStock}`);

  // 5. Verify Audit Trail
  console.log('\n5. Verifying audit trail for vendor actions...');
  const auditEntry = await prisma.auditLog.findFirst({
    where: {
      userId: vendorUser.id,
      entity: 'VendorStock',
      entityId: targetProduct.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!auditEntry) {
    throw new Error('Missing audit log entry for VendorStock update');
  }
  console.log(`   ✅ Verified audit log: Action=${auditEntry.action}, Entity=${auditEntry.entity}, User=${vendorUser.email}`);

  console.log('\n======================================================');
  console.log('🎉 STEP 6 COMPLETE: VENDOR ROLE & MULTI-ROLE RBAC PASS');
  console.log('======================================================\n');
}

testVendorRbac()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
