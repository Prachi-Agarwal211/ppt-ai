// src/app/api/extract/route.js

import { NextResponse } from 'next/server';
import { load as loadHtml } from 'cheerio';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Utility to truncate long text
function normalize(text, max = 20000) {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max) : t;
}

export async function POST(req) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // 1) Multipart file upload case
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

      const arrayBuffer = await file.arrayBuffer();
      const buff = Buffer.from(arrayBuffer);

      if (file.type === 'application/pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(buff);
        return NextResponse.json({ text: normalize(data.text) });
      }

      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const mammoth = await import('mammoth');
        const res = await mammoth.extractRawText({ buffer: buff });
        return NextResponse.json({ text: normalize(res.value) });
      }

      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        return NextResponse.json({ text: normalize(buff.toString('utf8')) });
      }

      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
    }

    // 2) JSON URL case
    const body = await req.json();
    if (body?.url) {
      const res = await fetch(body.url, { method: 'GET' });
      if (!res.ok) return NextResponse.json({ error: `Failed to fetch URL: ${res.status}` }, { status: 400 });
      const html = await res.text();
      const $ = loadHtml(html);
      // Remove script/style and grab visible text
      $('script, style, noscript').remove();
      const text = normalize($('body').text());
      return NextResponse.json({ text });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Extraction failed' }, { status: 500 });
  }
}

