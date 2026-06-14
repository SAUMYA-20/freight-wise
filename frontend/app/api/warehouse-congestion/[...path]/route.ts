import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

async function proxy(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function GET(request: Request) {
  try {
    const { searchParams, pathname } = new URL(request.url);
    const qs = searchParams.toString();
    const sub = pathname.split('/api/warehouse-congestion/')[1] || '';
    const url = `${BACKEND_URL}/api/warehouse-congestion/${sub}${qs ? `?${qs}` : ''}`;
    return proxy(url);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { pathname } = new URL(request.url);
    const sub = pathname.split('/api/warehouse-congestion/')[1] || '';
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    return proxy(`${BACKEND_URL}/api/warehouse-congestion/${sub}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: 500 });
  }
}
