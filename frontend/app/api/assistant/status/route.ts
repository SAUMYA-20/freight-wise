import { NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../lib/config';

const BACKEND_URL = getBackendUrl();

export async function GET(request: Request) {
  try {
    const url = `${BACKEND_URL}/api/assistant/status`;
    const res = await fetch(url, { cache: 'no-store' });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
