
import { NextResponse } from 'next/server';
import { fetchAndStoreMatches } from '@/services/sports-data-service';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_TOKEN}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    const { newMatchesCount, newHistoryCount } = await fetchAndStoreMatches();
    return NextResponse.json({ success: true, newMatches: newMatchesCount, newHistory: newHistoryCount });
  } catch (error) {
    console.error('Failed to fetch and store match data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
