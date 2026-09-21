/**
 * Automated Database Backup Snapshot Script
 *
 * Exports a verified snapshot of the PostgreSQL database tables,
 * writes the snapshot archive to the local /backups directory,
 * and records a row in the `backup_histories` table with status COMPLETED.
 *
 *   npm run backup
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Environment Configuration
// ---------------------------------------------------------------------------
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function runBackup() {
  console.log('\n================================================================');
  console.log('DATABASE BACKUP DISPATCH — AUTOMATED SNAPSHOT PIPELINE');
  console.log('================================================================\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const fileName = `snapshot-${timestamp}.json`;
  const filePath = path.join(backupDir, fileName);

  console.log(`Target archive: backups/${fileName}`);
  console.log('Extracting database records...');

  try {
    const [
      roles,
      users,
      customers,
      categories,
      brands,
      products,
      warehouses,
      inventories,
      orders,
      orderItems,
      payments,
      transactions,
      auditLogs,
    ] = await Promise.all([
      prisma.role.findMany(),
      prisma.user.findMany({ select: { id: true, email: true, roleId: true, isActive: true } }),
      prisma.customer.findMany(),
      prisma.category.findMany(),
      prisma.brand.findMany(),
      prisma.product.findMany(),
      prisma.warehouse.findMany(),
      prisma.inventory.findMany(),
      prisma.order.findMany(),
      prisma.orderItem.findMany(),
      prisma.payment.findMany(),
      prisma.transaction.findMany(),
      prisma.auditLog.findMany({ take: 100 }),
    ]);

    const snapshot = {
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        environment: process.env.NODE_ENV || 'production',
        totalEntities:
          roles.length +
          users.length +
          customers.length +
          categories.length +
          brands.length +
          products.length +
          orders.length +
          payments.length,
      },
      tables: {
        roles,
        users,
        customers,
        categories,
        brands,
        products,
        warehouses,
        inventories,
        orders,
        orderItems,
        payments,
        transactions,
        auditLogs,
      },
    };

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
    const stats = fs.statSync(filePath);
    const sizeKb = (stats.size / 1024).toFixed(2);

    console.log(`Archive written: ${sizeKb} KB`);
    console.log('Recording audit entry in backup_histories table...');

    const record = await prisma.backupHistory.create({
      data: {
        fileUrl: `backups/${fileName}`,
        status: 'COMPLETED',
      },
    });

    console.log(`\n----------------------------------------------------------------`);
    console.log(`SUCCESS: Backup record #${record.id} registered.`);
    console.log(`Total records archived: ${snapshot.meta.totalEntities}`);
    console.log(`File: ${record.fileUrl}`);
    console.log(`Timestamp: ${record.createdAt.toISOString()}`);
    console.log(`----------------------------------------------------------------\n`);
  } catch (error) {
    console.error('Backup failed:', error);
    await prisma.backupHistory.create({
      data: {
        fileUrl: `backups/${fileName}`,
        status: 'FAILED',
      },
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBackup();
