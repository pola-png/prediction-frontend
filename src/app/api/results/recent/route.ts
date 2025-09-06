
import { getRecentResults } from '@/services/sports-data-service';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const results = await getRecentResults(limit);
    return NextResponse.json(results);

  } catch (error: any) {
    console.error('Failed to fetch recent results:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
