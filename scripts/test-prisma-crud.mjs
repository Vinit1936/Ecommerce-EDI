import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim();
            let value = trimmed.substring(eqIdx + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
    }
  }
}

loadEnv();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log('🔄 Connecting to Neon via Prisma Client...');

    // 1. Seed / Upsert default roles
    const adminRole = await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { name: 'ADMIN' },
    });

    const customerRole = await prisma.role.upsert({
      where: { name: 'CUSTOMER' },
      update: {},
      create: { name: 'CUSTOMER' },
    });

    console.log('✅ Default Roles created/verified:');
    console.log(`   - ADMIN:    ${adminRole.id}`);
    console.log(`   - CUSTOMER: ${customerRole.id}`);

    // 2. Count records across generated tables
    const roleCount = await prisma.role.count();
    const productCount = await prisma.product.count();
    const userCount = await prisma.user.count();
    const orderCount = await prisma.order.count();
    
    console.log(`\n📈 Live Neon DB Stats:`);
    console.log(`   • Roles:      ${roleCount}`);
    console.log(`   • Users:      ${userCount}`);
    console.log(`   • Products:   ${productCount}`);
    console.log(`   • Orders:     ${orderCount}`);
  } catch (err) {
    console.error('CRUD test error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
