import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');
  if (!target || !/^https?:\/\//i.test(target)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  try {
    const res = await fetch(target, { cache: 'no-store' });
    const headers = new Headers(res.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.delete('content-security-policy');
    return new NextResponse(res.body, { status: res.status, headers });
  } catch (e) {
    return NextResponse.json({ error: 'Proxy failed' }, { status: 502 });
  }
}

