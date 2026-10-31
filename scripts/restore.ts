/**
 * scripts/restore.ts
 *
 * Database Snapshot Disaster Recovery Engine
 * Satisfies Team 3 Deliverables & Operating Systems "OS: Backup scheduling and log management"
 *
 * Usage:
 *   npx tsx scripts/restore.ts [path-to-snapshot.json]
 * If no path is provided, restores the most recent snapshot from the /backups directory.
 */
import fs from 'node:fs';
import path from 'node:path';
import { restoreDatabaseSnapshot } from '../src/lib/backup';
import prisma from '../src/lib/db';

async function main() {
  console.log('\n================================================================');
  console.log('DATABASE DISASTER RECOVERY & RESTORE ENGINE');
  console.log('================================================================\n');

  let targetFile = process.argv[2];

  if (!targetFile) {
    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      console.error('❌ Error: No backups directory found at /backups');
      process.exit(1);
    }

    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({
        name: f,
        fullPath: path.join(backupDir, f),
        mtime: fs.statSync(path.join(backupDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      console.error('❌ Error: No snapshot JSON files found in /backups directory');
      process.exit(1);
    }

    targetFile = files[0].fullPath;
    console.log(`ℹ️ No target specified. Defaulting to most recent snapshot:`);
    console.log(`   ${files[0].name}\n`);
  }

  const resolvedPath = path.isAbsolute(targetFile)
    ? targetFile
    : path.resolve(process.cwd(), targetFile);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Error: Specified snapshot file does not exist: ${resolvedPath}`);
    process.exit(1);
  }

  const fileStats = fs.statSync(resolvedPath);
  console.log(`Target Archive : ${path.basename(resolvedPath)}`);
  console.log(`Archive Size   : ${(fileStats.size / 1024).toFixed(2)} KB`);
  console.log(`Last Modified  : ${fileStats.mtime.toISOString()}\n`);
  console.log('Initiating dependency-ordered entity restoration...');

  try {
    const summary = await restoreDatabaseSnapshot(resolvedPath);

    console.log('\n----------------------------------------------------------------');
    console.log('✅ RESTORATION COMPLETED SUCCESSFULLY');
    console.log('----------------------------------------------------------------');
    console.log(` • Roles Restored        : ${summary.roles}`);
    console.log(` • Users Restored        : ${summary.users}`);
    console.log(` • Customers Restored    : ${summary.customers}`);
    console.log(` • Categories Restored   : ${summary.categories}`);
    console.log(` • Brands Restored       : ${summary.brands}`);
    console.log(` • Products Restored     : ${summary.products}`);
    console.log(` • Warehouses Restored   : ${summary.warehouses}`);
    console.log(` • Inventory Records     : ${summary.inventories}`);
    console.log('----------------------------------------------------------------');
    console.log(` • Total Entities Synced : ${summary.totalRestored}`);
    console.log(` • Execution Time        : ${summary.durationMs}ms`);
    console.log('----------------------------------------------------------------\n');
  } catch (error) {
    console.error('\n❌ Restoration encountered a fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
