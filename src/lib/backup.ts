/**
 * src/lib/backup.ts
 *
 * Database Backup and Disaster Recovery Engine
 * Satisfies Team 3 Deliverables & Operating Systems "OS: Backup scheduling and log management"
 *
 * Provides programmatic snapshot creation, disk file management,
 * and dependency-ordered disaster restoration.
 */
import fs from 'node:fs';
import path from 'node:path';
import prisma from '@/lib/db';
import { recordAudit } from '@/lib/audit';

export interface BackupMetadata {
  id: string;
  fileName: string;
  fileUrl: string;
  sizeKb: number;
  totalEntities: number;
  status: 'COMPLETED' | 'FAILED';
  createdAt: Date;
  existsOnDisk: boolean;
}

export interface RestoreSummary {
  roles: number;
  users: number;
  customers: number;
  categories: number;
  brands: number;
  products: number;
  warehouses: number;
  inventories: number;
  orders: number;
  orderItems: number;
  payments: number;
  transactions: number;
  totalRestored: number;
  durationMs: number;
}

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Creates an authoritative snapshot of the PostgreSQL database,
 * writes it to disk, and records the event in `backup_histories`.
 */
export async function createDatabaseBackup(userId?: string): Promise<BackupMetadata> {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `snapshot-${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, fileName);

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
      orderStatuses,
      invoices,
      payments,
      transactions,
      auditLogs,
    ] = await Promise.all([
      prisma.role.findMany(),
      prisma.user.findMany(),
      prisma.customer.findMany(),
      prisma.category.findMany(),
      prisma.brand.findMany(),
      prisma.product.findMany(),
      prisma.warehouse.findMany(),
      prisma.inventory.findMany(),
      prisma.order.findMany(),
      prisma.orderItem.findMany(),
      prisma.orderStatus.findMany(),
      prisma.invoice.findMany(),
      prisma.payment.findMany(),
      prisma.transaction.findMany(),
      prisma.auditLog.findMany({ take: 200, orderBy: { createdAt: 'desc' } }),
    ]);

    const totalEntities =
      roles.length +
      users.length +
      customers.length +
      categories.length +
      brands.length +
      products.length +
      warehouses.length +
      inventories.length +
      orders.length +
      orderItems.length +
      payments.length +
      transactions.length;

    const snapshot = {
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        environment: process.env.NODE_ENV || 'production',
        totalEntities,
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
        orderStatuses,
        invoices,
        payments,
        transactions,
        auditLogs,
      },
    };

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
    const stats = fs.statSync(filePath);
    const sizeKb = Number((stats.size / 1024).toFixed(2));

    const record = await prisma.backupHistory.create({
      data: {
        fileUrl: `backups/${fileName}`,
        status: 'COMPLETED',
      },
    });

    if (userId) {
      await recordAudit({
        userId,
        action: 'CREATE',
        entity: 'BackupHistory',
        entityId: record.id,
      });
    }

    return {
      id: record.id,
      fileName,
      fileUrl: record.fileUrl,
      sizeKb,
      totalEntities,
      status: 'COMPLETED',
      createdAt: record.createdAt,
      existsOnDisk: true,
    };
  } catch (error) {
    await prisma.backupHistory.create({
      data: {
        fileUrl: `backups/${fileName}`,
        status: 'FAILED',
      },
    });

    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Retrieves all registered backup history records, enriched with live disk file metrics.
 */
export async function getBackupHistories(): Promise<BackupMetadata[]> {
  ensureBackupDir();

  const records = await prisma.backupHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return records.map((r) => {
    const fileName = path.basename(r.fileUrl);
    const fullPath = path.join(BACKUP_DIR, fileName);
    let sizeKb = 0;
    let existsOnDisk = false;

    if (fs.existsSync(fullPath)) {
      existsOnDisk = true;
      try {
        sizeKb = Number((fs.statSync(fullPath).size / 1024).toFixed(2));
      } catch {
        sizeKb = 0;
      }
    }

    return {
      id: r.id,
      fileName,
      fileUrl: r.fileUrl,
      sizeKb,
      totalEntities: 0,
      status: r.status as 'COMPLETED' | 'FAILED',
      createdAt: r.createdAt,
      existsOnDisk,
    };
  });
}

/**
 * Reads a snapshot archive from disk and executes dependency-ordered
 * database restoration with conflict resolution.
 */
export async function restoreDatabaseSnapshot(snapshotInput: string | object): Promise<RestoreSummary> {
  const startTime = Date.now();

  let snapshotData: {
    meta?: { timestamp?: string; totalEntities?: number };
    tables?: Record<string, unknown[]>;
  };

  if (typeof snapshotInput === 'string') {
    let resolvedPath = snapshotInput;
    if (!path.isAbsolute(resolvedPath)) {
      resolvedPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), snapshotInput);
    }
    if (!fs.existsSync(/*turbopackIgnore: true*/ resolvedPath)) {
      throw new Error(`Snapshot archive not found at: ${resolvedPath}`);
    }
    const raw = fs.readFileSync(/*turbopackIgnore: true*/ resolvedPath, 'utf8');
    snapshotData = JSON.parse(raw);
  } else {
    snapshotData = snapshotInput as typeof snapshotData;
  }

  const tables = snapshotData.tables || {};

  const summary: RestoreSummary = {
    roles: 0,
    users: 0,
    customers: 0,
    categories: 0,
    brands: 0,
    products: 0,
    warehouses: 0,
    inventories: 0,
    orders: 0,
    orderItems: 0,
    payments: 0,
    transactions: 0,
    totalRestored: 0,
    durationMs: 0,
  };

  // Default password hash for users if missing in legacy snapshot
  const defaultPasswordHash =
    '$2a$10$wT0l0hX4eYFqKj8U8m1x0.kKx7g/hZ9k5U8Wq7l4t3y2w1v0u'; // bcrypt hash

  // 1. Roles (FK independent)
  if (Array.isArray(tables.roles)) {
    for (const r of tables.roles as Array<{ id: string; name: string }>) {
      await prisma.role.upsert({
        where: { name: r.name },
        update: {},
        create: { id: r.id, name: r.name },
      });
      summary.roles++;
    }
  }

  // 2. Users (references Roles)
  if (Array.isArray(tables.users)) {
    for (const u of tables.users as Array<{
      id: string;
      email: string;
      roleId: string;
      isActive?: boolean;
      passwordHash?: string;
    }>) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          roleId: u.roleId,
          isActive: u.isActive ?? true,
        },
        create: {
          id: u.id,
          email: u.email,
          roleId: u.roleId,
          isActive: u.isActive ?? true,
          passwordHash: u.passwordHash || defaultPasswordHash,
        },
      });
      summary.users++;
    }
  }

  // 3. Customers (references Users)
  if (Array.isArray(tables.customers)) {
    for (const c of tables.customers as Array<{
      id: string;
      userId: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
      address: string;
      city: string;
      postalCode?: string | null;
      country?: string | null;
    }>) {
      await prisma.customer.upsert({
        where: { userId: c.userId },
        update: {
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone ?? null,
          address: c.address,
          city: c.city,
          postalCode: c.postalCode ?? null,
          country: c.country ?? null,
        },
        create: {
          id: c.id,
          userId: c.userId,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone ?? null,
          address: c.address,
          city: c.city,
          postalCode: c.postalCode ?? null,
          country: c.country ?? null,
        },
      });
      summary.customers++;
    }
  }

  // 4. Categories (Self-referencing: insert without parents first, then link parentCategoryId)
  if (Array.isArray(tables.categories)) {
    const cats = tables.categories as Array<{
      id: string;
      name: string;
      parentCategoryId?: string | null;
    }>;
    for (const cat of cats) {
      await prisma.category.upsert({
        where: { id: cat.id },
        update: { name: cat.name },
        create: { id: cat.id, name: cat.name },
      });
      summary.categories++;
    }
    // Second pass to link parentCategoryId
    for (const cat of cats) {
      if (cat.parentCategoryId) {
        await prisma.category.update({
          where: { id: cat.id },
          data: { parentCategoryId: cat.parentCategoryId },
        });
      }
    }
  }

  // 5. Brands
  if (Array.isArray(tables.brands)) {
    for (const b of tables.brands as Array<{ id: string; name: string }>) {
      const existing = await prisma.brand.findFirst({ where: { name: b.name } });
      if (existing) {
        summary.brands++;
      } else {
        await prisma.brand.create({
          data: { id: b.id, name: b.name },
        });
        summary.brands++;
      }
    }
  }

  // 6. Products
  if (Array.isArray(tables.products)) {
    for (const p of tables.products as Array<{
      id: string;
      sku: string;
      specimenNo: string;
      name: string;
      description?: string | null;
      price: number | string;
      originalPrice?: number | string | null;
      stockQty: number;
      categoryId: string;
      brandId: string;
      details?: string[];
      images?: string[];
      sizes?: string[];
    }>) {
      await prisma.product.upsert({
        where: { sku: p.sku },
        update: {
          name: p.name,
          price: p.price,
          stockQty: p.stockQty,
          description: p.description ?? null,
        },
        create: {
          id: p.id,
          sku: p.sku,
          specimenNo: p.specimenNo || p.sku,
          name: p.name,
          description: p.description ?? null,
          price: p.price,
          originalPrice: p.originalPrice ?? null,
          stockQty: p.stockQty,
          categoryId: p.categoryId,
          brandId: p.brandId,
          details: p.details || [],
          images: p.images || [],
          sizes: p.sizes || [],
        },
      });
      summary.products++;
    }
  }

  // 7. Warehouses
  if (Array.isArray(tables.warehouses)) {
    for (const w of tables.warehouses as Array<{
      id: string;
      name: string;
      location?: string | null;
    }>) {
      await prisma.warehouse.upsert({
        where: { id: w.id },
        update: { name: w.name, location: w.location || '' },
        create: { id: w.id, name: w.name, location: w.location || '' },
      });
      summary.warehouses++;
    }
  }

  // 8. Inventories
  if (Array.isArray(tables.inventories)) {
    for (const inv of tables.inventories as Array<{
      id: string;
      productId: string;
      warehouseId: string;
      quantityAvailable: number;
    }>) {
      await prisma.inventory.upsert({
        where: {
          productId_warehouseId: {
            productId: inv.productId,
            warehouseId: inv.warehouseId,
          },
        },
        update: { quantityAvailable: inv.quantityAvailable },
        create: {
          id: inv.id,
          productId: inv.productId,
          warehouseId: inv.warehouseId,
          quantityAvailable: inv.quantityAvailable,
        },
      });
      summary.inventories++;
    }
  }

  summary.totalRestored =
    summary.roles +
    summary.users +
    summary.customers +
    summary.categories +
    summary.brands +
    summary.products +
    summary.warehouses +
    summary.inventories;

  summary.durationMs = Date.now() - startTime;
  return summary;
}
