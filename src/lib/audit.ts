/**
 * Audit trail — Team 3 owns this helper; Teams 1 and 2 call it.
 *
 * Call after any create/update/delete that changes business data. Failures are
 * swallowed on purpose: an audit write must never break the user's request.
 */
import prisma from '@/lib/db';
import type { AuditAction } from '@prisma/client';

export async function recordAudit(entry: {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
}) {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (e) {
    console.error('[audit] failed to record', entry, e);
  }
}
