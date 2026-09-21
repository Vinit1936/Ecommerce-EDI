/** GET /api/brands */
import { ok, serverError } from '@/lib/api';
import { listBrands } from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok({ brands: await listBrands() });
  } catch (e) {
    return serverError(e);
  }
}
