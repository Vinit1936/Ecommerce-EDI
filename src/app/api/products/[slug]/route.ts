/** GET /api/products/[slug] - one product by SKU. */
import { ok, fail, serverError } from '@/lib/api';
import { getProductBySlug } from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) return fail('Product not found', 404);
    return ok({ product });
  } catch (e) {
    return serverError(e);
  }
}
