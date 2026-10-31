/**
 * GET /api/admin/backup/[id]/download
 *
 * Secure Download Endpoint for Database Backup Archives
 * Satisfies Team 3 Deliverables & Security Controls
 */
import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import prisma from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { fail, serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN');
    const { id } = await params;

    const record = await prisma.backupHistory.findUnique({
      where: { id },
    });

    if (!record) {
      return fail('Backup record not found in system registry', 404);
    }

    // Path traversal security prevention: sanitize filename strictly
    const safeFileName = path.basename(record.fileUrl);
    const resolvedPath = path.resolve(process.cwd(), 'backups', safeFileName);

    if (!fs.existsSync(resolvedPath)) {
      return fail('Physical backup file not present on storage volume', 404);
    }

    const fileBuffer = fs.readFileSync(resolvedPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return serverError(error);
  }
}
