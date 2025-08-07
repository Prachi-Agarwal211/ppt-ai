import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Placeholder for live collaboration health check
  return NextResponse.json({ ok: true });
}

