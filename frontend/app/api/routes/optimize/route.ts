import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const modes = searchParams.get('modes') || 'road,port,air,border';

    if (!origin || !destination) {
      return NextResponse.json(
        { error: "Query parameters 'origin' and 'destination' are required." },
        { status: 400 }
      );
    }

    const url = `${BACKEND_URL}/api/routes/optimize?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&modes=${encodeURIComponent(modes)}`;
    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Backend request failed' }));
      return NextResponse.json(err, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Route optimization failed';
    console.error('Route optimize proxy error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/routes/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Backend request failed' }));
      return NextResponse.json(err, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Route optimization failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
