// src/app/api/presentations/[id]/status/route.js

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  try {
    const id = params.id;
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const admin = createAdminClient(url, key);

    const { data: slides, error } = await admin.from('slides').select('id').eq('presentation_id', id);
    if (error) throw error;
    const status = (slides?.length || 0) > 0 ? 'ready' : 'pending';
    return NextResponse.json({ presentationId: id, status, slides: slides?.length || 0 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Status failed' }, { status: 500 });
  }
}
