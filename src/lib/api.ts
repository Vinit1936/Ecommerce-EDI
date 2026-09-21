/**
 * Shared API response envelope.
 *
 * Every route handler in the project returns one of these two shapes so the
 * client never has to guess. Agreed across all three teams — see TODAY.md 0.5.
 */
import { NextResponse } from 'next/server';

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: string; details?: unknown };

/** 200 (or `status`) with a typed payload. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status });
}

/** Non-2xx with a human-readable message. */
export function fail(error: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiError>({ success: false, error, details }, { status });
}

/** Maps a thrown value onto a 500, keeping the message when it is an Error. */
export function serverError(e: unknown) {
  const message = e instanceof Error ? e.message : 'Unexpected server error';
  console.error('[api]', e);
  return fail(message, 500);
}
