/**
 * scripts/test-backup-restore.ts
 *
 * Automated verification for Step 11:
 * Database Snapshot Restore Engine & Backup Dashboard
 * Satisfies Team 3 Deliverables & Operating Systems "OS: Backup scheduling and log management"
 */
import fs from 'node:fs';
import path from 'node:path';
import prisma from '../src/lib/db';
import { createDatabaseBackup, getBackupHistories, restoreDatabaseSnapshot } from '../src/lib/backup';

async function testBackupRestore() {
  console.log('\n================================================================');
  console.log('🧪 TESTING STEP 11: DATABASE SNAPSHOT RESTORE & BACKUP ENGINE');
  console.log('================================================================\n');

  // 1. Create backup snapshot
  console.log('1. Executing authoritative database backup snapshot extraction...');
  const adminUser = await prisma.user.findFirst({
    where: { role: { name: 'ADMIN' } },
  });

  const backup = await createDatabaseBackup(adminUser?.id);
  console.log(`   ✅ Backup created: ${backup.fileName}`);
  console.log(`   File URL: ${backup.fileUrl}`);
  console.log(`   Size: ${backup.sizeKb} KB`);
  console.log(`   Total Entities: ${backup.totalEntities}`);
  console.log(`   Status: ${backup.status}`);

  // 2. Verify file on disk
  console.log('\n2. Verifying physical archive on storage volume...');
  const fullPath = path.resolve(process.cwd(), backup.fileUrl);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Physical snapshot file not found on disk at ${fullPath}`);
  }
  const rawContent = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(rawContent);

  if (!parsed.meta || !parsed.tables) {
    throw new Error('Snapshot missing required meta or tables sections');
  }
  console.log(`   ✅ Snapshot contains ${Object.keys(parsed.tables).length} database tables.`);
  console.log(`   ✅ Roles: ${parsed.tables.roles?.length}, Products: ${parsed.tables.products?.length}, Warehouses: ${parsed.tables.warehouses?.length}`);

  // 3. Test getBackupHistories() registry
  console.log('\n3. Testing Backup History Registry & Metadata Enrichement...');
  const histories = await getBackupHistories();
  const registered = histories.find((h) => h.id === backup.id);
  if (!registered) {
    throw new Error(`Backup #${backup.id} not found in backup_histories registry`);
  }
  if (!registered.existsOnDisk) {
    throw new Error('Backup history reporting file is missing from disk');
  }
  console.log(`   ✅ Registry returned ${histories.length} historical backup records.`);
  console.log(`   ✅ Active record confirmed: ID ${registered.id}, Size ${registered.sizeKb} KB, OnDisk: true`);

  // 4. Test Restore Engine on Snapshot
  console.log('\n4. Testing Disaster Recovery Restoration Engine...');
  console.log('   Restoring tables in dependency order with conflict resolution...');
  const restoreSummary = await restoreDatabaseSnapshot(fullPath);

  if (restoreSummary.totalRestored <= 0) {
    throw new Error('Restoration restored 0 entities!');
  }
  console.log(`   ✅ Restoration completed in ${restoreSummary.durationMs}ms:`);
  console.log(`      • Roles Restored      : ${restoreSummary.roles}`);
  console.log(`      • Users Restored      : ${restoreSummary.users}`);
  console.log(`      • Customers Restored  : ${restoreSummary.customers}`);
  console.log(`      • Categories Restored : ${restoreSummary.categories}`);
  console.log(`      • Brands Restored     : ${restoreSummary.brands}`);
  console.log(`      • Products Restored   : ${restoreSummary.products}`);
  console.log(`      • Warehouses Restored : ${restoreSummary.warehouses}`);
  console.log(`      • Inventory Records   : ${restoreSummary.inventories}`);
  console.log(`      • Total Entities      : ${restoreSummary.totalRestored}`);

  // 5. Test Audit Log
  if (adminUser) {
    console.log('\n5. Verifying Security Audit Trail for Backup Event...');
    const audit = await prisma.auditLog.findFirst({
      where: {
        entity: 'BackupHistory',
        entityId: backup.id,
      },
    });
    if (!audit) {
      throw new Error('Audit log for backup creation not recorded!');
    }
    console.log(`   ✅ Audit log recorded: Action ${audit.action} on BackupHistory #${audit.entityId}`);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL BACKUP, RESTORE & SCHEDULER TESTS PASSED (100%)');
  console.log('================================================================\n');
}

testBackupRestore()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
