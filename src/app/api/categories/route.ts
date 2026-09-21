/** GET /api/categories */
import { ok, serverError } from '@/lib/api';
import { listCategories } from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok({ categories: await listCategories() });
  } catch (e) {
    return serverError(e);
  }
}
