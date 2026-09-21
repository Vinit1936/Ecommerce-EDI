/**
 * Product / category / brand data access — Team 1.
 *
 * All filtering, searching and sorting happens in SQL here, not in the client.
 * The old implementation ran Array.filter over an in-memory mock array; this
 * pushes the same logic into Postgres so it still works past 12 rows.
 */
import prisma from '@/lib/db';
import type { Prisma } from '@prisma/client';
import type { BrandRef, CategoryRef, Product, ProductColor, ProductQuery } from '@/lib/types';

/** Shape returned by every query below, so the mapper always has what it needs. */
const productInclude = {
  category: { select: { name: true } },
  brand: { select: { name: true } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

/** Prisma types `colors` as arbitrary Json; narrow it before handing it to the UI. */
function toColors(value: ProductRow['colors']): ProductColor[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const colors = value.filter(
    (c): c is { name: string; hex: string } =>
      typeof c === 'object' && c !== null && 'name' in c && 'hex' in c
  );
  return colors.length ? colors : undefined;
}

/** Maps a database row onto the shape the UI components expect. */
export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.sku,
    specimenNo: row.specimenNo,
    name: row.name,
    price: Number(row.price),
    originalPrice: row.originalPrice != null ? Number(row.originalPrice) : undefined,
    category: row.category.name,
    brand: row.brand.name,
    description: row.description ?? '',
    details: row.details,
    images: row.images,
    inStock: row.stockQty > 0,
    stockCount: row.stockQty,
    sizes: row.sizes.length ? row.sizes : undefined,
    colors: toColors(row.colors),
    isFeatured: row.isFeatured,
    isNew: row.isNew,
    isSale: row.isSale,
    heroSpan: (row.heroSpan as Product['heroSpan']) ?? undefined,
  };
}

function buildWhere(query: ProductQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (query.category && query.category !== 'ALL') {
    where.category = { name: query.category };
  }
  if (query.brand && query.brand !== 'ALL') {
    where.brand = { name: query.brand };
  }
  if (query.inStock) {
    where.stockQty = { gt: 0 };
  }
  if (query.q?.trim()) {
    const term = query.q.trim();
    // Mirrors the previous client-side search: name, specimen no, category.
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { specimenNo: { contains: term, mode: 'insensitive' } },
      { sku: { contains: term, mode: 'insensitive' } },
      { category: { name: { contains: term, mode: 'insensitive' } } },
      { brand: { name: { contains: term, mode: 'insensitive' } } },
    ];
  }
  return where;
}

function buildOrderBy(sort: ProductQuery['sort']): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price-asc':
      return [{ price: 'asc' }];
    case 'price-desc':
      return [{ price: 'desc' }];
    case 'newest':
      return [{ isNew: 'desc' }, { createdAt: 'desc' }];
    default:
      return [{ isFeatured: 'desc' }, { sku: 'asc' }];
  }
}

/** Filtered, sorted, paginated product list plus the total match count. */
export async function listProducts(
  query: ProductQuery = {}
): Promise<{ products: Product[]; total: number }> {
  const where = buildWhere(query);
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: buildOrderBy(query.sort),
      take: query.limit ?? 100,
      skip: query.offset ?? 0,
    }),
    prisma.product.count({ where }),
  ]);
  return { products: rows.map(toProduct), total };
}

/** Single product by SKU/slug (what the /product/[id] route receives). */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({
    where: { sku: slug },
    include: productInclude,
  });
  return row ? toProduct(row) : null;
}

/** Single product by database UUID. */
export async function getProductById(id: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({ where: { id }, include: productInclude });
  return row ? toProduct(row) : null;
}

/** Other products in the same category, excluding the one being viewed. */
export async function getRelatedProducts(product: Product, take = 4): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { category: { name: product.category }, NOT: { id: product.id } },
    include: productInclude,
    take,
    orderBy: { sku: 'asc' },
  });
  return rows.map(toProduct);
}

/** Home-page curation: featured or newly added, featured first. */
export async function getFeaturedProducts(take = 7): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { OR: [{ isFeatured: true }, { isNew: true }] },
    include: productInclude,
    orderBy: [{ isFeatured: 'desc' }, { sku: 'asc' }],
    take,
  });
  return rows.map(toProduct);
}

export async function listCategories(): Promise<CategoryRef[]> {
  return prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
}

export async function listBrands(): Promise<BrandRef[]> {
  return prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
}

/** Category names prefixed with ALL — matches the existing filter bar. */
export async function listCategoryNames(): Promise<string[]> {
  const categories = await listCategories();
  return ['ALL', ...categories.map((c) => c.name)];
}
