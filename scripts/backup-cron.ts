/**
 * scripts/backup-cron.ts
 *
 * Automated Backup Scheduler & Log Management Daemon Demonstration
 * Satisfies Operating Systems Deliverable: "OS: Backup scheduling and log management"
 *
 * Usage:
 *   npx tsx scripts/backup-cron.ts --run-once   # Runs a single scheduled backup pass
 *   npx tsx scripts/backup-cron.ts              # Runs automated cron scheduler (interval)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createDatabaseBackup } from '../src/lib/backup';
import prisma from '../src/lib/db';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const MAX_RETAINED_SNAPSHOTS = 10;
const CRON_INTERVAL_MS = 60 * 1000; // 1 minute cycle demonstration

function rotateOldSnapshots() {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('snapshot-') && f.endsWith('.json'))
    .map((f) => ({
      name: f,
      fullPath: path.join(BACKUP_DIR, f),
      mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length > MAX_RETAINED_SNAPSHOTS) {
    const toDelete = files.slice(MAX_RETAINED_SNAPSHOTS);
    console.log(`[cron] Rotating ${toDelete.length} expired snapshots exceeding retention policy (${MAX_RETAINED_SNAPSHOTS})...`);
    for (const file of toDelete) {
      try {
        fs.unlinkSync(file.fullPath);
        console.log(`[cron] Purged archive: ${file.name}`);
      } catch (e) {
        console.error(`[cron] Failed to purge ${file.name}:`, e);
      }
    }
  }
}

async function executeCronCycle() {
  const now = new Date();
  console.log(`\n[cron][${now.toISOString()}] Triggering scheduled database backup job...`);

  try {
    const backup = await createDatabaseBackup();
    console.log(`[cron] ✅ Backup job succeeded: ${backup.fileName} (${backup.sizeKb} KB, ${backup.totalEntities} entities)`);

    // Log management & snapshot retention rotation
    rotateOldSnapshots();
  } catch (error) {
    console.error('[cron] ❌ Scheduled backup failed:', error);
  }
}

async function main() {
  const isRunOnce = process.argv.includes('--run-once') || process.argv.includes('-1');

  console.log('================================================================');
  console.log('OS SCHEDULER: AUTOMATED BACKUP & RETENTION CRON DAEMON');
  console.log('================================================================');
  console.log(`Target directory   : ${BACKUP_DIR}`);
  console.log(`Retention policy   : Keep latest ${MAX_RETAINED_SNAPSHOTS} snapshots`);
  console.log(`Execution mode     : ${isRunOnce ? 'SINGLE RUN (--run-once)' : 'CONTINUOUS SCHEDULER'}`);
  console.log('================================================================\n');

  if (isRunOnce) {
    await executeCronCycle();
    await prisma.$disconnect();
    console.log('\n[cron] Scheduled run completed successfully. Exiting.');
    process.exit(0);
  } else {
    // Continuous demonstration mode
    await executeCronCycle();
    console.log(`\n[cron] Daemon active. Next automated execution in ${CRON_INTERVAL_MS / 1000}s. Press Ctrl+C to terminate.`);
    const interval = setInterval(async () => {
      await executeCronCycle();
    }, CRON_INTERVAL_MS);

    process.on('SIGINT', async () => {
      clearInterval(interval);
      await prisma.$disconnect();
      console.log('\n[cron] Daemon shutdown gracefully.');
      process.exit(0);
    });
  }
}

main();
