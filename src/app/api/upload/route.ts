/**
 * /api/upload
 * POST: Multi-part image file upload with MIME & magic-byte validation
 * DELETE: Remove uploaded image file
 * Satisfies the Operating System / file handling requirement.
 */
import type { NextRequest } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { ok, fail, serverError } from '@/lib/api';
import { requireRole, AuthError } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Megabytes
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Validates binary magic numbers to ensure genuine image payload
 * preventing file-type extension spoofing attacks (OS Security check)
 */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mimeType === 'image/gif') {
    const header = buffer.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  }

  if (mimeType === 'image/webp') {
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    return riff === 'RIFF' && webp === 'WEBP';
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'VENDOR');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return fail('No file was provided in form payload', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return fail('File exceeds maximum allowable size of 5MB', 400);
    }

    const mimeType = file.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return fail(
        `Invalid image format "${mimeType}". Permitted formats: JPEG, PNG, WebP, GIF.`,
        400
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Deep inspect binary magic bytes
    if (!validateMagicBytes(buffer, mimeType)) {
      return fail(
        'File payload verification failed: binary signature does not match declared image type.',
        400
      );
    }

    // Prepare upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate collision-resistant unique filename with pure UUID
    const fileId = crypto.randomUUID();
    const ext = MIME_EXTENSION_MAP[mimeType] || 'jpg';
    const filename = `specimen-${fileId}.${ext}`;
    const targetFilePath = path.join(uploadDir, filename);

    // Write file to physical disk
    await fs.writeFile(targetFilePath, buffer);

    // Verify written file stat
    const stat = await fs.stat(targetFilePath);

    const relativeUrl = `/uploads/products/${filename}`;

    await recordAudit({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'ProductImage',
      entityId: fileId,
    });

    return ok({
      url: relativeUrl,
      fileId,
      filename,
      size: stat.size,
      mimeType,
      uploadedAt: new Date().toISOString(),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'VENDOR');

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return fail('Missing "url" query parameter', 400);
    }

    // Prevent directory traversal attacks by strictly extracting the file basename
    const filename = path.basename(url);
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    const targetPath = path.join(uploadDir, filename);

    try {
      await fs.unlink(targetPath);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ENOENT') {
        return fail('File does not exist on storage disk', 404);
      }
      throw err;
    }

    // Extract UUID if present or generate a deletion audit UUID
    const uuidMatch = filename.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const auditEntityId = uuidMatch ? uuidMatch[0] : crypto.randomUUID();

    await recordAudit({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'ProductImage',
      entityId: auditEntityId,
    });

    return ok({ message: `Successfully unlinked file "${filename}" from storage disk.` });
  } catch (e) {
    if (e instanceof AuthError) {
      return fail(e.message, e.status);
    }
    return serverError(e);
  }
}
