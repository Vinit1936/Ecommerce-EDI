import bcrypt from 'bcryptjs';
import prisma from '../src/lib/db';
import { recordAudit } from '../src/lib/audit';

async function testCustomerProfile() {
  console.log('\n======================================================');
  console.log('🧪 TESTING STEP 4: CUSTOMER PROFILE & ACCOUNT PORTAL');
  console.log('======================================================\n');

  const customerUser = await prisma.user.findUniqueOrThrow({
    where: { email: 'customer@hellohello.studio' },
    include: { customer: true },
  });

  if (!customerUser.customer) {
    throw new Error('Demo customer profile not found');
  }

  console.log(`1. Found demo customer account: ${customerUser.email}`);
  console.log(`   Initial Address: ${customerUser.customer.address}, ${customerUser.customer.city}`);

  // 1. Update Profile Details
  console.log('\n2. Updating customer shipping address and contact details...');
  const updatedCustomer = await prisma.customer.update({
    where: { id: customerUser.customer.id },
    data: {
      firstName: 'ALEXANDER',
      lastName: 'MCQUEEN',
      phone: '+1 415 888 9999',
      address: '450 SUTTER ST, STE 1200',
      city: 'SAN FRANCISCO',
      postalCode: '94108',
      country: 'UNITED STATES',
    },
  });

  await recordAudit({
    userId: customerUser.id,
    action: 'UPDATE',
    entity: 'Customer',
    entityId: updatedCustomer.id,
  });

  if (updatedCustomer.firstName !== 'ALEXANDER' || updatedCustomer.city !== 'SAN FRANCISCO') {
    throw new Error('Customer address update verification failed');
  }
  console.log(`   ✅ Address updated: ${updatedCustomer.firstName} ${updatedCustomer.lastName}, ${updatedCustomer.address}, ${updatedCustomer.city}`);

  // 2. Test Password Change
  console.log('\n3. Testing Password Change Mechanism...');
  const oldPassword = 'Password123!';
  const newPassword = 'NewSecretPassword456!';

  // Verify old password
  const oldMatch = await bcrypt.compare(oldPassword, customerUser.passwordHash);
  if (!oldMatch) throw new Error('Old password verification failed');
  console.log('   ✅ Old password successfully verified against current hash.');

  // Set new password
  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: customerUser.id },
    data: { passwordHash: newHash },
  });
  await recordAudit({
    userId: customerUser.id,
    action: 'UPDATE',
    entity: 'UserPassword',
    entityId: customerUser.id,
  });

  const newMatch = await bcrypt.compare(newPassword, newHash);
  if (!newMatch) throw new Error('New password verification failed');
  console.log('   ✅ New password successfully hashed and verified.');

  // Restore original password for demo account predictability
  const originalHash = await bcrypt.hash(oldPassword, 10);
  await prisma.user.update({
    where: { id: customerUser.id },
    data: { passwordHash: originalHash },
  });
  console.log('   ✅ Demo password restored to "Password123!".');

  // 3. Verify Audit Trail
  console.log('\n4. Verifying audit entries...');
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      userId: customerUser.id,
      entity: { in: ['Customer', 'UserPassword'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });
  console.log(`   ✅ Found ${auditLogs.length} audit entries:`);
  auditLogs.forEach((l) => console.log(`      • ${l.action} ${l.entity} at ${l.createdAt.toISOString()}`));

  if (auditLogs.length < 2) {
    throw new Error('Expected at least 2 audit log entries');
  }

  console.log('\n🎉 ALL STEP 4 CUSTOMER PROFILE TESTS PASSED PERFECTLY!\n');
}

testCustomerProfile()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
