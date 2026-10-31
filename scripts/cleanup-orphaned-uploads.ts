/**
 * scripts/cleanup-orphaned-uploads.ts
 *
 * Maintenance routine satisfying Operating System / Storage File Management requirement.
 * Scans public/uploads/products/ on disk, cross-references with all database product
 * image arrays, and identifies/unlinks orphaned files to prevent storage leaks.
 *
 * Usage:
 *   npx tsx scripts/cleanup-orphaned-uploads.ts          (Audit mode)
 *   npx tsx scripts/cleanup-orphaned-uploads.ts --purge  (Purge mode)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '../src/lib/db';

async function cleanupOrphanedUploads() {
  const shouldPurge = process.argv.includes('--purge');

  console.log('\n======================================================');
  console.log(`🧹 STORAGE MANAGEMENT: ORPHANED IMAGE FILE SCANNER ${shouldPurge ? '(PURGE MODE)' : '(AUDIT MODE)'}`);
  console.log('======================================================\n');

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');

  try {
    await fs.access(uploadDir);
  } catch {
    console.log(`Directory ${uploadDir} does not exist yet. Nothing to scan.`);
    return;
  }

  // 1. Read files on storage disk
  const filesOnDisk = await fs.readdir(uploadDir);
  const mediaFiles = filesOnDisk.filter((f) => !f.startsWith('.gitkeep'));
  console.log(`1. Total image assets stored on disk: ${mediaFiles.length}`);

  // 2. Query all image URLs referenced in database products
  const products = await prisma.product.findMany({
    select: { id: true, name: true, sku: true, images: true },
  });

  const activeFilenames = new Set<string>();
  for (const p of products) {
    for (const imgUrl of p.images) {
      if (imgUrl.includes('/uploads/products/')) {
        const basename = path.basename(imgUrl);
        activeFilenames.add(basename);
      }
    }
  }
  console.log(`2. Total image assets referenced in database: ${activeFilenames.size}`);

  // 3. Detect orphans
  const orphans: { filename: string; sizeBytes: number }[] = [];
  let totalOrphanBytes = 0;

  for (const filename of mediaFiles) {
    if (!activeFilenames.has(filename)) {
      const filePath = path.join(uploadDir, filename);
      const stat = await fs.stat(filePath);
      orphans.push({ filename, sizeBytes: stat.size });
      totalOrphanBytes += stat.size;
    }
  }

  console.log(`\n3. Scan Results:`);
  console.log(`   - Orphaned / unreferenced files found: ${orphans.length}`);
  console.log(`   - Total reclaimable disk space: ${(totalOrphanBytes / 1024).toFixed(2)} KB`);

  if (orphans.length > 0) {
    console.log('\n   Orphaned File List:');
    for (const orphan of orphans) {
      console.log(`     • ${orphan.filename} (${(orphan.sizeBytes / 1024).toFixed(1)} KB)`);
      if (shouldPurge) {
        const filePath = path.join(uploadDir, orphan.filename);
        await fs.unlink(filePath);
        console.log(`       -> UNLINKED from disk.`);
      }
    }
  }

  if (!shouldPurge && orphans.length > 0) {
    console.log('\n💡 To purge these unlinked files, run with --purge flag:');
    console.log('   npx tsx scripts/cleanup-orphaned-uploads.ts --purge');
  }

  console.log('\n======================================================');
  console.log('✅ STORAGE DISK AUDIT COMPLETE');
  console.log('======================================================\n');
}

cleanupOrphanedUploads()
  .catch((e) => {
    console.error('Scan error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
