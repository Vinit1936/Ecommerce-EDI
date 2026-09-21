/**
 * GET /api/reports/export — sales report as CSV.
 *
 * Hand-rolled rather than pulling in a CSV dependency: the only real work is
 * quoting, and every generated report is recorded in the reports table so the
 * "who generated what" trail is real.
 */
import prisma from '@/lib/db';
import { fail, serverError } from '@/lib/api';
import { AuthError, requireRole } from '@/lib/auth';
import { getSalesReportRows } from '@/lib/stats';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** RFC-4180 quoting: wrap in quotes and double any embedded quote. */
function cell(value: unknown): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  try {
    const session = await requireRole('ADMIN');
    const rows = await getSalesReportRows();

    const headers = ['Invoice', 'Placed At', 'Customer', 'City', 'Status', 'Paid', 'Units', 'Shipping', 'Total'];
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        [r.invoiceNo, r.placedAt, r.customer, r.city, r.status, r.paid, r.units, r.shipping, r.total]
          .map(cell)
          .join(',')
      ),
    ].join('\n');

    const report = await prisma.report.create({
      data: { type: 'SALES', generatedBy: session.user.id },
    });
    await recordAudit({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'Report',
      entityId: report.id,
    });

    const filename = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    return new Response(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    return serverError(e);
  }
}
