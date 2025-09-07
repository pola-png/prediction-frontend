
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { fetchFromSoccersApi } from '@/services/soccersapi-service';
import { updateOrCreateMatch } from '@/scripts/fetch-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    console.log('API: Starting live data fetch from SoccersAPI...');
    const matchesFromApi = await fetchFromSoccersApi();
    
    if (matchesFromApi.length === 0) {
        console.log('API: No new matches found from SoccersAPI.');
        return NextResponse.json({ message: 'No new matches found from SoccersAPI.' });
    }
    
    let processedCount = 0;
    for (const matchData of matchesFromApi) {
        await updateOrCreateMatch(matchData);
        processedCount++;
    }

    const message = `Successfully fetched and processed ${processedCount} matches from SoccersAPI.`;
    console.log(`API: ${message}`);
    
    return NextResponse.json({ message });

  } catch (error: any) {
    console.error('Failed to fetch live data via API:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
