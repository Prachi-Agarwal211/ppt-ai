// src/app/api/presentations/route.js

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request) {
  try {
    const { topic, slideCount } = await request.json();
    if (!topic) return NextResponse.json({ error: 'Missing topic' }, { status: 400 });

    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const admin = createAdminClient(url, key);

    const { runCognitivePipeline } = await import('@/core/cognitive/orchestrator');
    // For auth, we skip user resolution here and assume caller already has session; use service user id 0 fallback
    const user = { id: 'service-user' };
    const result = await runCognitivePipeline({ topic, slideCount }, user, admin);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Creation failed' }, { status: 500 });
  }
}
