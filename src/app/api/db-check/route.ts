import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await prisma.$queryRaw<Array<{ connected: number; current_time: Date; pg_version: string }>>`
      SELECT 1 as connected, NOW() as current_time, version() as pg_version
    `;
    
    return NextResponse.json({
      status: 'success',
      message: 'Successfully connected to Neon PostgreSQL database via Prisma!',
      data: result[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to connect to Neon database.',
        error: errMessage,
        hint: 'Please check your Neon credentials, host, and network connectivity in DATABASE_URL.',
      },
      { status: 500 }
    );
  }
}
