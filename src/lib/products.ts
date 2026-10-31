/**
 * Product / category / brand data access — Team 1.
 *
 * All filtering, searching and sorting happens in SQL here, not in the client.
 * The old implementation ran Array.filter over an in-memory mock array; this
 * pushes the same logic into Postgres so it still works past 12 rows.
 */
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
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

export interface CategoryWithHierarchy {
  id: string;
  name: string;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  productCount: number;
  childCount: number;
  createdAt: Date;
}

export async function listCategoriesWithHierarchy(): Promise<CategoryWithHierarchy[]> {
  const rows = await prisma.category.findMany({
    include: {
      parentCategory: { select: { name: true } },
      _count: { select: { products: true, childCategories: true } },
    },
    orderBy: { name: 'asc' },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    parentCategoryId: r.parentCategoryId,
    parentCategoryName: r.parentCategory?.name ?? null,
    productCount: r._count.products,
    childCount: r._count.childCategories,
    createdAt: r.createdAt,
  }));
}

export async function createCategory(input: { name: string; parentCategoryId?: string | null }) {
  return prisma.category.create({
    data: {
      name: input.name.trim(),
      parentCategoryId: input.parentCategoryId || null,
    },
  });
}

export async function updateCategory(
  id: string,
  input: { name?: string; parentCategoryId?: string | null }
) {
  if (input.parentCategoryId === id) {
    throw new Error('A category cannot be its own parent');
  }
  return prisma.category.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.parentCategoryId !== undefined ? { parentCategoryId: input.parentCategoryId } : {}),
    },
  });
}

export async function deleteCategory(id: string) {
  const [productsCount, childCount] = await Promise.all([
    prisma.product.count({ where: { categoryId: id } }),
    prisma.category.count({ where: { parentCategoryId: id } }),
  ]);

  if (productsCount > 0) {
    throw new Error(`Cannot delete category: ${productsCount} product(s) are assigned to it`);
  }
  if (childCount > 0) {
    throw new Error(`Cannot delete category: ${childCount} subcategory(ies) are nested under it`);
  }

  return prisma.category.delete({ where: { id } });
}

export interface BrandWithCount {
  id: string;
  name: string;
  productCount: number;
  createdAt: Date;
}

export async function listBrands(): Promise<BrandRef[]> {
  return prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
}

export async function listBrandsWithCounts(): Promise<BrandWithCount[]> {
  const rows = await prisma.brand.findMany({
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  });

  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    productCount: b._count.products,
    createdAt: b.createdAt,
  }));
}

export async function createBrand(input: { name: string }) {
  return prisma.brand.create({
    data: { name: input.name.trim() },
  });
}

export async function updateBrand(id: string, input: { name: string }) {
  return prisma.brand.update({
    where: { id },
    data: { name: input.name.trim() },
  });
}

export async function deleteBrand(id: string) {
  const productsCount = await prisma.product.count({ where: { brandId: id } });
  if (productsCount > 0) {
    throw new Error(`Cannot delete brand: ${productsCount} product(s) are assigned to it`);
  }
  return prisma.brand.delete({ where: { id } });
}

/** Category names prefixed with ALL — matches the existing filter bar. */
export async function listCategoryNames(): Promise<string[]> {
  const categories = await listCategories();
  return ['ALL', ...categories.map((c) => c.name)];
}

export interface CreateProductInput {
  sku: string;
  specimenNo?: string;
  name: string;
  description?: string;
  details?: string[];
  images?: string[];
  price: number;
  originalPrice?: number | null;
  sizes?: string[];
  colors?: ProductColor[] | null;
  isFeatured?: boolean;
  isNew?: boolean;
  isSale?: boolean;
  heroSpan?: 'full' | 'half' | 'quarter' | null;
  stockQty?: number;
  categoryId: string;
  brandId: string;
}

export interface UpdateProductInput {
  sku?: string;
  specimenNo?: string;
  name?: string;
  description?: string | null;
  details?: string[];
  images?: string[];
  price?: number;
  originalPrice?: number | null;
  sizes?: string[];
  colors?: ProductColor[] | null;
  isFeatured?: boolean;
  isNew?: boolean;
  isSale?: boolean;
  heroSpan?: 'full' | 'half' | 'quarter' | null;
  stockQty?: number;
  categoryId?: string;
  brandId?: string;
}

/** Admin: Create a new product and matching inventory record. */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  return prisma.$transaction(async (tx) => {
    const warehouse = (await tx.warehouse.findFirst()) ?? {
      id: '00000000-0000-4000-8000-000000000001',
    };

    const row = await tx.product.create({
      data: {
        sku: input.sku.toLowerCase().trim(),
        specimenNo: input.specimenNo?.trim() || `Specimen No. ${input.sku.toUpperCase().trim()}`,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        details: input.details ?? [],
        images: input.images ?? [],
        price: input.price,
        originalPrice: input.originalPrice ?? null,
        sizes: input.sizes ?? [],
        colors: input.colors ? (input.colors as unknown as Prisma.InputJsonValue) : undefined,
        isFeatured: input.isFeatured ?? false,
        isNew: input.isNew ?? false,
        isSale: input.isSale ?? false,
        heroSpan: input.heroSpan ?? null,
        stockQty: input.stockQty ?? 0,
        categoryId: input.categoryId,
        brandId: input.brandId,
      },
      include: productInclude,
    });

    await tx.inventory.create({
      data: {
        productId: row.id,
        warehouseId: warehouse.id,
        quantityAvailable: input.stockQty ?? 0,
      },
    });

    return toProduct(row);
  });
}

/** Admin: Update an existing product and synchronize inventory stock. */
export async function updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  return prisma.$transaction(async (tx) => {
    const data: Prisma.ProductUpdateInput = {};

    if (input.sku !== undefined) data.sku = input.sku.toLowerCase().trim();
    if (input.specimenNo !== undefined) data.specimenNo = input.specimenNo.trim();
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.description !== undefined) {
      data.description = input.description ? input.description.trim() : null;
    }
    if (input.details !== undefined) data.details = input.details;
    if (input.images !== undefined) data.images = input.images;
    if (input.price !== undefined) data.price = input.price;
    if (input.originalPrice !== undefined) data.originalPrice = input.originalPrice;
    if (input.sizes !== undefined) data.sizes = input.sizes;
    if (input.colors !== undefined) {
      data.colors = input.colors
        ? (input.colors as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    }
    if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
    if (input.isNew !== undefined) data.isNew = input.isNew;
    if (input.isSale !== undefined) data.isSale = input.isSale;
    if (input.heroSpan !== undefined) data.heroSpan = input.heroSpan;
    if (input.stockQty !== undefined) data.stockQty = input.stockQty;
    if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };
    if (input.brandId !== undefined) data.brand = { connect: { id: input.brandId } };

    const row = await tx.product.update({
      where: { id },
      data,
      include: productInclude,
    });

    if (input.stockQty !== undefined) {
      await tx.inventory.updateMany({
        where: { productId: id },
        data: { quantityAvailable: input.stockQty },
      });
    }

    return toProduct(row);
  });
}

/** Admin: Safely delete or deactivate a product with referential checks. */
export async function deleteProduct(
  id: string
): Promise<{ deleted: boolean; deactivated?: boolean; message?: string }> {
  return prisma.$transaction(async (tx) => {
    // Check if product is referenced in order_items
    const orderCount = await tx.orderItem.count({ where: { productId: id } });

    if (orderCount > 0) {
      // Cannot delete; retire product safely to maintain historical ledger
      await tx.product.update({
        where: { id },
        data: { stockQty: 0, isFeatured: false },
      });
      await tx.inventory.updateMany({
        where: { productId: id },
        data: { quantityAvailable: 0 },
      });
      return {
        deleted: false,
        deactivated: true,
        message: 'Product has historical orders. Stock zeroed and deactivated to preserve order integrity.',
      };
    }

    // Safe to delete completely
    await tx.cart.deleteMany({ where: { productId: id } });
    await tx.wishlist.deleteMany({ where: { productId: id } });
    await tx.productReview.deleteMany({ where: { productId: id } });
    await tx.inventory.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });

    return { deleted: true };
  });
}
