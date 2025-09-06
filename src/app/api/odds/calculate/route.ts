
import { NextResponse } from 'next/server';
import { calculateAccumulatorOdds } from '@/services/predictions-service';

export async function POST(request: Request) {
  try {
    const { matchIds } = await request.json();

    if (!matchIds || !Array.isArray(matchIds) || matchIds.length === 0) {
      return NextResponse.json({ message: 'Match IDs are required' }, { status: 400 });
    }

    const totalOdds = await calculateAccumulatorOdds(matchIds);

    if (totalOdds === null) {
        return NextResponse.json({ message: 'Could not calculate odds for the given matches.' }, { status: 500 });
    }
    
    return NextResponse.json({ totalOdds });

  } catch (error) {
    console.error('Failed to calculate odds via API:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
