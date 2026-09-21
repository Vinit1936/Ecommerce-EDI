/**
 * Database seed — E-Commerce Order Management Platform
 *
 * Idempotent: every write is an upsert keyed on a stable unique column, so
 * this can be re-run any number of times without duplicate-key errors.
 *
 * Product data is inlined here rather than imported from src/lib/mock-data.ts
 * because that file is deleted once the catalog reads from the database.
 * This file is the source of truth for demo data.
 *
 *   npm run seed
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Env loading (mirrors prisma.config.ts so the script runs standalone)
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

// ---------------------------------------------------------------------------
// Stable IDs — categories, brands and the warehouse have no unique name
// constraint, so fixed UUIDs are what make re-running this safe.
// ---------------------------------------------------------------------------
const CAT = {
  APPAREL: '11111111-0000-4000-8000-000000000001',
  FOOTWEAR: '11111111-0000-4000-8000-000000000002',
  ACCESSORIES: '11111111-0000-4000-8000-000000000003',
  OUTERWEAR: '11111111-0000-4000-8000-000000000004',
  OBJECTS: '11111111-0000-4000-8000-000000000005',
} as const;

const BRAND = {
  HELLOHELLO: '22222222-0000-4000-8000-000000000001',
  PORTO: '22222222-0000-4000-8000-000000000002',
  OSAKA: '22222222-0000-4000-8000-000000000003',
  BERLIN: '22222222-0000-4000-8000-000000000004',
} as const;

const WAREHOUSE_ID = '33333333-0000-4000-8000-000000000001';

type SeedProduct = {
  sku: string;
  specimenNo: string;
  name: string;
  price: number;
  originalPrice?: number;
  categoryId: string;
  brandId: string;
  description: string;
  details: string[];
  images: string[];
  stockQty: number;
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  isFeatured?: boolean;
  isNew?: boolean;
  isSale?: boolean;
  heroSpan?: string;
};

const PRODUCTS: SeedProduct[] = [
  {
    sku: 'hh-01',
    specimenNo: 'Specimen No. HH01',
    name: 'HEAVYWEIGHT OVERSIZED HOODIE',
    price: 195,
    categoryId: CAT.APPAREL,
    brandId: BRAND.PORTO,
    description:
      'Constructed from 480GSM loopback cotton jersey. Engineered with drop shoulders and a double-layered rigid hood. Built for extreme winters or indifferent social settings.',
    details: [
      '480GSM 100% Organic Loopback Cotton',
      'Preshrunk with garment dye finish',
      'Ribbed hem and cuffs with thumb insertion',
      'Crafted in Porto, Portugal',
    ],
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1000&q=80',
    ],
    stockQty: 14,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Ink Black', hex: '#161412' },
      { name: 'Bone White', hex: '#EFE7DC' },
      { name: 'Signal Red', hex: '#F0301A' },
    ],
    isFeatured: true,
    isNew: true,
    heroSpan: 'half',
  },
  {
    sku: 'hh-02',
    specimenNo: 'Specimen No. HH02',
    name: 'TACTICAL STRUCTURED TOTE',
    price: 240,
    categoryId: CAT.ACCESSORIES,
    brandId: BRAND.HELLOHELLO,
    description:
      'Ballistic Cordura nylon tote with modular webbing and custom anodized aluminum hardware. Waterproof interior lining designed to transport prototypes or daily paraphernalia.',
    details: [
      '1000D Cordura Ballistic Nylon',
      'Anodized Matte Aluminum Buckles',
      'Internal 16" Padded Laptop Sleeve',
      'Waterproof YKK AquaGuard Zippers',
    ],
    images: [
      'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=80',
    ],
    stockQty: 5,
    colors: [
      { name: 'Obsidian', hex: '#161412' },
      { name: 'Cement', hex: '#8C857B' },
    ],
    isFeatured: true,
    heroSpan: 'half',
  },
  {
    sku: 'hh-03',
    specimenNo: 'Specimen No. HH03',
    name: 'MONOLITH DERBY BOOT',
    price: 380,
    categoryId: CAT.FOOTWEAR,
    brandId: BRAND.HELLOHELLO,
    description:
      'Full-grain calfskin leather derby featuring a exaggerated lug sole. Hand-welted structure providing aggressive traction with minimal aesthetic compromise.',
    details: [
      'Vegetable-Tanned Italian Calfskin',
      'Vibram Extreme Rubber Outsole',
      'Goodyear Welt Construction',
      'Includes spare Signal Red waxed laces',
    ],
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80',
    ],
    stockQty: 8,
    sizes: ['EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45'],
    colors: [{ name: 'Deep Ink', hex: '#161412' }],
    isFeatured: true,
    isNew: true,
    heroSpan: 'quarter',
  },
  {
    sku: 'hh-04',
    specimenNo: 'Specimen No. HH04',
    name: 'MODULAR RIGID PARKAS',
    price: 520,
    originalPrice: 650,
    categoryId: CAT.OUTERWEAR,
    brandId: BRAND.HELLOHELLO,
    description:
      '3-layer laminated shell fabric engineered for windproofing and torrential resistance. Features magnetic neck closure and storm hood.',
    details: [
      '3L Waterproof Breathable Nylon Shell',
      'Fidlock Magnetic Fasteners',
      'Seam-Sealed Internal Construction',
      'Temperature range: -10°C to +15°C',
    ],
    images: [
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1000&q=80',
    ],
    stockQty: 3,
    sizes: ['M', 'L', 'XL'],
    colors: [
      { name: 'Concrete', hex: '#A39B8F' },
      { name: 'Pitch Black', hex: '#0A0A0A' },
    ],
    isSale: true,
    heroSpan: 'quarter',
  },
  {
    sku: 'hh-05',
    specimenNo: 'Specimen No. HH05',
    name: 'RAW EDGE CARGO TROUSER',
    price: 210,
    categoryId: CAT.APPAREL,
    brandId: BRAND.OSAKA,
    description:
      'High-density cotton twill trousers with 6 ergonomic utility pockets and articulated knee darts. Unfinished raw hem detailing.',
    details: [
      '100% High-Density Cotton Twill',
      'YKK Heavy-Duty Metal Zippers',
      'Adjustable Waist Tabs & Hem Drawstrings',
      'Made in Japan',
    ],
    images: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1000&q=80',
    ],
    stockQty: 19,
    sizes: ['28', '30', '32', '34', '36'],
    colors: [
      { name: 'Signal Red', hex: '#F0301A' },
      { name: 'Black Ink', hex: '#161412' },
    ],
    heroSpan: 'quarter',
  },
  {
    sku: 'hh-06',
    specimenNo: 'Specimen No. HH06',
    name: 'INDUSTRIAL CERAMIC VESSEL',
    price: 120,
    categoryId: CAT.OBJECTS,
    brandId: BRAND.BERLIN,
    description:
      'Hand-cast matte porcelain object. Designed as a brutalist table centerpiece or functional vessel. Finished with raw mineral slip.',
    details: [
      'High-fired Matte Porcelain',
      'Raw Mineral Slip Exterior',
      'Volume: 1.2 Liters',
      'Dimensions: 22cm x 18cm x 18cm',
    ],
    images: [
      'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=80',
    ],
    // Deliberately out of stock — exercises the empty/unavailable UI states.
    stockQty: 0,
    colors: [{ name: 'Raw Bone', hex: '#EFE7DC' }],
    heroSpan: 'quarter',
  },
  {
    sku: 'hh-07',
    specimenNo: 'Specimen No. HH07',
    name: 'MONO ARCHITECTURAL SUNGLASSES',
    price: 165,
    categoryId: CAT.ACCESSORIES,
    brandId: BRAND.OSAKA,
    description:
      'Thick 8mm Japanese acetate frame with flat 100% UV protection lenses. Beveled edges with laser-engraved specimen branding.',
    details: [
      '8mm Custom Takiron Japanese Acetate',
      'Carl Zeiss Vision Lenses (Category 3)',
      '7-Barrel Stainless Steel Hinges',
      'Includes custom protective leather case',
    ],
    images: [
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1000&q=80',
    ],
    stockQty: 11,
    colors: [
      { name: 'Pitch Black', hex: '#0A0A0A' },
      { name: 'Transparent Ivory', hex: '#EFE7DC' },
    ],
    heroSpan: 'quarter',
  },
  {
    sku: 'hh-08',
    specimenNo: 'Specimen No. HH08',
    name: 'HEAVY GAUGE CHORE JACKET',
    price: 280,
    categoryId: CAT.OUTERWEAR,
    brandId: BRAND.OSAKA,
    description:
      '16oz Japanese selvedge duck canvas coat. Triple-stitched main seams with reinforced patch pockets and internal chest compartment.',
    details: [
      '16oz Japanese Selvedge Cotton Canvas',
      'Custom Engraved Steel Tack Buttons',
      'Reinforced Elbow Patches',
      'Unlined Interior with Bound Seams',
    ],
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&w=1000&q=80',
    ],
    stockQty: 4,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [{ name: 'Tobacco Brown', hex: '#594433' }],
    isNew: true,
    heroSpan: 'quarter',
  },
  {
    sku: 'hh-09',
    specimenNo: 'Specimen No. HH09',
    name: 'PADDED RUNNER V1',
    price: 290,
    categoryId: CAT.FOOTWEAR,
    brandId: BRAND.HELLOHELLO,
    description:
      'Sculpted neoprene and suede low-top sneaker. Thick padded collar with dual-density foam footbed and custom traction geometric tread.',
    details: [
      'Italian Calf Suede & Neoprene',
      'Dual-Density OrthoLite Footbed',
      'Reflective Specimen Accents',
      'Hand-finished outsole edge',
    ],
    images: [
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1000&q=80',
    ],
    stockQty: 15,
    sizes: ['EU 41', 'EU 42', 'EU 43', 'EU 44'],
    colors: [
      { name: 'Bone & Ink', hex: '#EFE7DC' },
      { name: 'Signal Red', hex: '#F0301A' },
    ],
    heroSpan: 'quarter',
  },
  {
    sku: 'hh-10',
    specimenNo: 'Specimen No. HH10',
    name: 'SEAMLESS MERINO ROLLNECK',
    price: 175,
    categoryId: CAT.APPAREL,
    brandId: BRAND.PORTO,
    description:
      'Spun from 100% Extra-fine 19.5 micron Australian Merino Wool. 3D WholeGarment knitted without side seams for unrestricted movement.',
    details: [
      '100% Extra-fine Merino Wool (19.5 Micron)',
      '3D WholeGarment Seamless Construction',
      'Naturally Odor-Resistant & Thermo-Regulating',
      'Dry Clean or Hand Wash Cold',
    ],
    images: [
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1000&q=80',
    ],
    stockQty: 7,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [{ name: 'Deep Ink', hex: '#161412' }],
    heroSpan: 'quarter',
  },
  {
    sku: 'hh-11',
    specimenNo: 'Specimen No. HH11',
    name: 'HEAVY METAL KEY CARABINER',
    price: 65,
    categoryId: CAT.ACCESSORIES,
    brandId: BRAND.HELLOHELLO,
    description:
      'CNC machined from a solid block of grade 5 titanium. Integrated bottle opener and spring-loaded quick release mechanism.',
    details: [
      'Grade 5 CNC Machined Titanium',
      'Matte Sandblasted Finish',
      'Laser-Etched Serial Number',
      'Weight: 42g',
    ],
    images: [
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80',
    ],
    stockQty: 25,
    colors: [{ name: 'Raw Titanium', hex: '#8C857B' }],
    heroSpan: 'quarter',
  },
  {
    sku: 'hh-12',
    specimenNo: 'Specimen No. HH12',
    name: 'BRUTALIST CONCRETE INCENSE BURNER',
    price: 90,
    categoryId: CAT.OBJECTS,
    brandId: BRAND.BERLIN,
    description:
      'Hand-poured architectural concrete tray with brass incense stick holder. Sealed against oil and ash residue.',
    details: [
      'High-Density Polymer-Modified Concrete',
      'Solid Brass Removable Post',
      'Felt Protective Base Pad',
      'Made in Berlin',
    ],
    images: [
      'https://images.unsplash.com/photo-1602928321679-560b4139c901?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&w=1000&q=80',
    ],
    stockQty: 2,
    colors: [{ name: 'Grey Cement', hex: '#A39B8F' }],
    heroSpan: 'quarter',
  },
];

async function main() {
  console.log('\nSeeding database...\n');

  // --- Roles -------------------------------------------------------------
  const roleNames = ['CUSTOMER', 'ADMIN', 'VENDOR'];
  for (const name of roleNames) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  // Drop leftover roles from earlier CRUD testing, but never one still in use.
  const stray = await prisma.role.findMany({
    where: { name: { notIn: roleNames } },
    include: { _count: { select: { users: true } } },
  });
  for (const r of stray) {
    if (r._count.users === 0) {
      await prisma.role.delete({ where: { id: r.id } });
      console.log(`  removed stray role "${r.name}"`);
    }
  }
  console.log(`  roles          ${roleNames.length}`);

  // --- Categories --------------------------------------------------------
  for (const [name, id] of Object.entries(CAT)) {
    await prisma.category.upsert({ where: { id }, update: { name }, create: { id, name } });
  }
  console.log(`  categories     ${Object.keys(CAT).length}`);

  // --- Brands ------------------------------------------------------------
  const brandNames: Record<string, string> = {
    [BRAND.HELLOHELLO]: 'HELLOHELLO',
    [BRAND.PORTO]: 'PORTO WORKS',
    [BRAND.OSAKA]: 'OSAKA DIVISION',
    [BRAND.BERLIN]: 'BERLIN CONCRETE',
  };
  for (const [id, name] of Object.entries(brandNames)) {
    await prisma.brand.upsert({ where: { id }, update: { name }, create: { id, name } });
  }
  console.log(`  brands         ${Object.keys(brandNames).length}`);

  // --- Warehouse ---------------------------------------------------------
  await prisma.warehouse.upsert({
    where: { id: WAREHOUSE_ID },
    update: {},
    create: { id: WAREHOUSE_ID, name: 'PORTO CENTRAL', location: 'Rua dos Clerigos 88, Porto, Portugal' },
  });
  console.log('  warehouses     1');

  // --- Products + inventory ---------------------------------------------
  for (const p of PRODUCTS) {
    const data = {
      sku: p.sku,
      specimenNo: p.specimenNo,
      name: p.name,
      description: p.description,
      details: p.details,
      images: p.images,
      price: p.price,
      originalPrice: p.originalPrice ?? null,
      sizes: p.sizes ?? [],
      colors: p.colors ?? undefined,
      isFeatured: p.isFeatured ?? false,
      isNew: p.isNew ?? false,
      isSale: p.isSale ?? false,
      heroSpan: p.heroSpan ?? null,
      stockQty: p.stockQty,
      categoryId: p.categoryId,
      brandId: p.brandId,
    };
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: data,
      create: data,
    });

    // Warehouse breakdown mirrors the authoritative Product.stockQty.
    await prisma.inventory.upsert({
      where: { productId_warehouseId: { productId: product.id, warehouseId: WAREHOUSE_ID } },
      update: { quantityAvailable: p.stockQty },
      create: { productId: product.id, warehouseId: WAREHOUSE_ID, quantityAvailable: p.stockQty },
    });
  }
  console.log(`  products       ${PRODUCTS.length}`);
  console.log(`  inventories    ${PRODUCTS.length}`);

  // --- Demo accounts -----------------------------------------------------
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  const customerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });
  const passwordHash = await bcrypt.hash('Password123!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@hellohello.studio' },
    update: { passwordHash, roleId: adminRole.id },
    create: { email: 'admin@hellohello.studio', passwordHash, roleId: adminRole.id },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@hellohello.studio' },
    update: { passwordHash, roleId: customerRole.id },
    create: { email: 'customer@hellohello.studio', passwordHash, roleId: customerRole.id },
  });

  await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      userId: customerUser.id,
      firstName: 'SPECIMEN',
      lastName: 'COLLECTOR',
      phone: '+351 912 345 678',
      address: 'RUA DOS CLERIGOS 88, 3RD FLOOR',
      city: 'PORTO',
      postalCode: '4050-204',
      country: 'PORTUGAL',
    },
  });
  console.log('  users          2');
  console.log('  customers      1');

  console.log('\nDemo accounts (password for both: Password123!)');
  console.log('  admin@hellohello.studio      ADMIN');
  console.log('  customer@hellohello.studio   CUSTOMER');
  console.log('\nSeed complete.\n');
}

main()
  .catch((e) => {
    console.error('\nSeed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
