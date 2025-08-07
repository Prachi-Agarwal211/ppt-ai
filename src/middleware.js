import { NextResponse } from 'next/server';

const RATE_LIMIT = 10; // requests per minute per IP
const WINDOW_MS = 60_000;
const buckets = new Map();

export function middleware(request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return NextResponse.next();
  const ip = request.headers.get('x-forwarded-for') || request.ip || 'anon';
  const now = Date.now();
  const entry = buckets.get(ip) || { count: 0, reset: now + WINDOW_MS };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + WINDOW_MS; }
  entry.count += 1;
  buckets.set(ip, entry);
  if (entry.count > RATE_LIMIT) {
    return new NextResponse('Rate limit exceeded', { status: 429 });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/api/:path*'] };

