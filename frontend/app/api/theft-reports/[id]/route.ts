import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');

    const res = await fetch(`${BACKEND_URL}/api/theft-reports/${id}`, {
      cache: 'no-store',
      headers: authHeader ? { Authorization: authHeader } : {},
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
