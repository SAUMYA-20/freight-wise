import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/theft-reports/meta`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch metadata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
