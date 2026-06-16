import { NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../lib/config';

const BACKEND_URL = getBackendUrl();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = `${BACKEND_URL}/api/assistant/parse`;
    
    const res = await fetch(url, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to parse request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
