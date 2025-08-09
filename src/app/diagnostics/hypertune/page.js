import React from 'react'

export default async function HypertuneDiagnosticsPage() {
  // This page hits the diagnostics API server-side
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/diagnostics/hypertune`, { cache: 'no-store' })
  let data
  try {
    data = await res.json()
  } catch {
    data = { error: 'Failed to parse diagnostics' }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Hypertune Diagnostics</h1>
      {data?.error ? (
        <p style={{ color: 'crimson' }}>Error: {data.error}</p>
      ) : (
        <>
          <p>Mock mode: <b>{String(data?.hypertune?.mock)}</b></p>
          <p>Angles prompt preview: <code>{data?.hypertune?.anglesPromptPreview}</code></p>
          <p>Blueprint prompt preview: <code>{data?.hypertune?.blueprintPromptPreview}</code></p>
        </>
      )}
      <p style={{ marginTop: 12 }}>
        Tip: set NEXT_PUBLIC_BASE_URL in .env.local for SSR fetch, e.g. http://localhost:3000 during dev.
      </p>
    </div>
  )
}

