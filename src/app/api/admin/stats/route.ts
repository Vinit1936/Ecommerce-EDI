/** GET /api/admin/stats — dashboard aggregates. Admin only. */
import { ok, fail, serverError } from '@/lib/api';
import { AuthError, requireRole } from '@/lib/auth';
import { getDashboardStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole('ADMIN');
    return ok(await getDashboardStats());
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    return serverError(e);
  }
}
