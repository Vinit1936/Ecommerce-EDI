/**
 * GET & POST /api/admin/backup
 *
 * Admin Database Backup Pipeline Endpoint
 * Satisfies Team 3 Deliverables & Operating Systems "OS: Backup scheduling and log management"
 */
import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth';
import { ok, fail, serverError } from '@/lib/api';
import { createDatabaseBackup, getBackupHistories } from '@/lib/backup';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole('ADMIN');
    const histories = await getBackupHistories();
    return ok({ backups: histories });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return serverError(error);
  }
}

export async function POST() {
  try {
    const session = await requireRole('ADMIN');
    const backup = await createDatabaseBackup(session.user.id);
    return NextResponse.json(
      {
        success: true,
        data: backup,
        message: `Snapshot ${backup.fileName} generated successfully (${backup.sizeKb} KB).`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return serverError(error);
  }
}
