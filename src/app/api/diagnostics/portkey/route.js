// src/app/api/diagnostics/portkey/route.js
// Diagnostic endpoint for Portkey configuration

import { NextResponse } from 'next/server';
import Portkey from 'portkey-ai';

export async function GET() {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const PORTKEY_API_KEY = process.env.PORTKEY_API_KEY;
  
  // Validate Portkey API key format
  const isValidPortkeyKey = PORTKEY_API_KEY && 
    PORTKEY_API_KEY.length > 50 && 
    (PORTKEY_API_KEY.startsWith('pk-') || PORTKEY_API_KEY.startsWith('sk-'));
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      hasOpenRouterKey: !!OPENROUTER_API_KEY,
      hasPortkeyKey: !!PORTKEY_API_KEY,
      isValidPortkeyKey,
      portkeyKeyLength: PORTKEY_API_KEY?.length || 0,
      portkeyKeyPrefix: PORTKEY_API_KEY?.substring(0, 10) + '...' || 'not set',
      expectedFormat: 'Portkey keys should start with "pk-" and be 100+ characters',
      status: isValidPortkeyKey ? 'Ready for Portkey acceleration' : 'Using direct OpenRouter calls (no caching)'
    },
    test: null,
    error: null
  };

  if (PORTKEY_API_KEY && OPENROUTER_API_KEY) {
    try {
      // Test basic Portkey connection
      const portkey = new Portkey({
        apiKey: PORTKEY_API_KEY,
        baseURL: 'https://api.portkey.ai/v1',
        mode: 'proxy'
      });

      // Try a simple test call
      const testResponse = await portkey.chat.completions.create({
        model: 'z-ai/glm-4.5-air:free',
        messages: [
          { role: 'system', content: 'Reply with only: OK' },
          { role: 'user', content: 'Test' }
        ],
        max_tokens: 10,
        provider: 'openrouter',
        override: {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://nether-ai.local',
            'X-Title': 'Nether AI Test'
          }
        }
      });

      diagnostics.test = {
        success: true,
        response: testResponse.choices?.[0]?.message?.content || 'No content',
        model: testResponse.model,
        usage: testResponse.usage
      };
    } catch (error) {
      diagnostics.error = {
        message: error.message,
        status: error.status,
        type: error.constructor.name,
        details: error.response?.data || error.cause || 'No additional details'
      };
    }
  } else {
    diagnostics.error = {
      message: 'Missing required API keys',
      missingKeys: [
        !OPENROUTER_API_KEY && 'OPENROUTER_API_KEY',
        !PORTKEY_API_KEY && 'PORTKEY_API_KEY'
      ].filter(Boolean)
    };
  }

  return NextResponse.json(diagnostics, { 
    status: diagnostics.error ? 500 : 200 
  });
}

export async function POST(request) {
  const { testPrompt = 'Hello' } = await request.json();
  
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const PORTKEY_API_KEY = process.env.PORTKEY_API_KEY;
  
  if (!PORTKEY_API_KEY || !OPENROUTER_API_KEY) {
    return NextResponse.json({ 
      error: 'Missing API keys',
      hasOpenRouterKey: !!OPENROUTER_API_KEY,
      hasPortkeyKey: !!PORTKEY_API_KEY
    }, { status: 400 });
  }

  try {
    const portkey = new Portkey({
      apiKey: PORTKEY_API_KEY,
      baseURL: 'https://api.portkey.ai/v1',
      mode: 'proxy'
    });

    const response = await portkey.chat.completions.create({
      model: 'z-ai/glm-4.5-air:free',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Be concise.' },
        { role: 'user', content: testPrompt }
      ],
      provider: 'openrouter',
      override: {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://nether-ai.local',
          'X-Title': 'Nether AI'
        }
      }
    });

    return NextResponse.json({
      success: true,
      response: response.choices?.[0]?.message?.content,
      model: response.model,
      usage: response.usage
    });
  } catch (error) {
    return NextResponse.json({
      error: error.message,
      status: error.status,
      details: error.response?.data || error.cause
    }, { status: 500 });
  }
}
