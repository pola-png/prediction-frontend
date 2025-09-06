
import { NextResponse } from 'next/server';
import { processResults } from '@/services/results-service';

export async function GET(request: Request) {
  try {
    // Optional: Add a secret query parameter for security
    // const { searchParams } = new URL(request.url);
    // if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    //   return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    // }

    console.log('API: Starting result processing job...');
    const result = await processResults();
    console.log('API: Result processing job finished.', result);

    return NextResponse.json({ message: 'Result processing completed successfully.', ...result });

  } catch (error: any) {
    console.error('Failed to process results via API:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
