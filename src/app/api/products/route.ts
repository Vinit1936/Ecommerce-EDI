/**
 * GET /api/products - filtered product list.
 * Query: ?q=&category=&brand=&sort=&inStock=true&limit=&offset=
 */
import type { NextRequest } from 'next/server';
import { ok, serverError } from '@/lib/api';
import { listProducts } from '@/lib/products';
import type { ProductSort } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SORTS: ProductSort[] = ['featured', 'price-asc', 'price-desc', 'newest'];

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const sortParam = p.get('sort') as ProductSort | null;

    const result = await listProducts({
      q: p.get('q') ?? undefined,
      category: p.get('category') ?? undefined,
      brand: p.get('brand') ?? undefined,
      sort: sortParam && SORTS.includes(sortParam) ? sortParam : 'featured',
      inStock: p.get('inStock') === 'true',
      limit: p.get('limit') ? Number(p.get('limit')) : undefined,
      offset: p.get('offset') ? Number(p.get('offset')) : undefined,
    });

    return ok(result);
  } catch (e) {
    return serverError(e);
  }
}
