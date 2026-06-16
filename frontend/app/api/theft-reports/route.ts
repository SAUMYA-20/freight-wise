import { NextResponse } from 'next/server';
import { getBackendUrl } from '../../../lib/config';

const BACKEND_URL = getBackendUrl();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const url = `${BACKEND_URL}/api/theft-reports${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const res = await fetch(`${BACKEND_URL}/api/theft-reports`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
