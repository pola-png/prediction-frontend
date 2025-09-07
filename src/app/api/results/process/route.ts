
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import axios from 'axios';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_TOKEN}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    await dbConnect();

    const soccerRes = await axios.get("https://api.soccersapi.com/v2.2/fixtures/", {
      params: {
        user: process.env.SOCCERSAPI_USER,
        token: process.env.SOCCERSAPI_TOKEN,
        t: "results",
      },
    });

    const results = soccerRes.data.data || [];
    let updatedCount = 0;
    console.log(`Fetched ${results.length} results from SoccersAPI.`);

    for (const matchResult of results) {
        if (!matchResult.id || !matchResult.score || matchResult.status !== 'finished') continue;

        const [homeGoals, awayGoals] = matchResult.score.ft_score.split('-').map(Number);

        const updated = await Match.findOneAndUpdate(
            { externalId: String(matchResult.id), source: 'soccersapi' },
            {
                $set: {
                    status: 'finished',
                    homeGoals,
                    awayGoals,
                    updatedAt: new Date(),
                }
            },
            { new: true }
        );
        
        if(updated) {
            updatedCount++;
        }
    }
    
    console.log(`Updated ${updatedCount} matches with results.`);
    return NextResponse.json({ success: true, updatedCount });

  } catch (error) {
    console.error("Failed to process results:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
