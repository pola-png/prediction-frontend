
import * as React from 'react';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  ArrowUpRight,
  BarChart,
  Rocket,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AppSidebar } from '@/components/app-sidebar';
import { MatchCard } from '@/components/match-card';
import type { Match } from '@/lib/types';
import dbConnect from '@/lib/mongodb';
import MatchModel from '@/models/Match';
import Team from '@/models/Team';
import Prediction from '@/models/Prediction';
import { sanitizeObject } from '@/lib/utils';
import { getMatchesForBucket } from '@/services/predictions-service';

const predictionBuckets = [
  {
    title: 'VIP Predictions',
    description: 'High confidence, conservative picks.',
    icon: ShieldCheck,
    href: '/predictions/vip',
    bucket: 'vip'
  },
  {
    title: '2 Odds Picks',
    description: 'Curated small accumulators.',
    icon: Rocket,
    href: '/predictions/2odds',
     bucket: '2odds'
  },
  {
    title: '5 Odds Picks',
    description: 'Medium risk accumulator targets.',
    icon: BarChart,
    href: '/predictions/5odds',
     bucket: '5odds'
  },
  {
    title: 'Big 10+ Odds',
    description: 'Higher-risk aggregate selections.',
    icon: Trophy,
    href: '/predictions/big10',
     bucket: 'big10'
  },
];


async function getDashboardData() {
    await dbConnect();
    // Ensure models are registered
    Team;
    Prediction;

    const upcomingMatches = await MatchModel.find({
        status: 'scheduled',
        prediction: { $exists: true }
    })
    .sort({ matchDateUtc: 1 })
    .limit(5)
    .populate('homeTeam')
    .populate('awayTeam')
    .populate('prediction')
    .lean();

    const recentResults = await MatchModel.find({ status: 'finished' })
    .sort({ matchDateUtc: -1 })
    .limit(5)
    .populate('homeTeam')
    .populate('awayTeam')
    .populate('prediction')
    .lean();
    
    const bucketCounts: Record<string, number> = {};
    for (const bucket of predictionBuckets) {
        const matches = await getMatchesForBucket(bucket.bucket, 100);
        bucketCounts[bucket.bucket] = matches.length;
    }


    return {
        upcomingMatches: sanitizeObject(upcomingMatches) as Match[],
        recentResults: sanitizeObject(recentResults) as Match[],
        bucketCounts
    }
}


export default async function HomePage() {
  const { upcomingMatches, recentResults, bucketCounts } = await getDashboardData();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
          <div className="w-full flex-1">
            <h1 className="font-semibold text-lg md:text-2xl">Dashboard</h1>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            {predictionBuckets.map((bucket) => (
              <Link href={bucket.href} key={bucket.title}>
              <Card >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {bucket.title}
                  </CardTitle>
                  <bucket.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bucketCounts[bucket.bucket] ?? 0} Active</div>
                  <p className="text-xs text-muted-foreground">
                    {bucket.description}
                  </p>
                </CardContent>
              </Card>
              </Link>
            ))}
          </div>
          
          <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader className='flex flex-row items-center'>
                <div className='grid gap-2'>
                  <CardTitle>Upcoming Matches</CardTitle>
                  <CardDescription>Live fixtures with AI predictions.</CardDescription>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                  <Link href="/predictions">
                    View All
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {upcomingMatches.length > 0 ? (
                    upcomingMatches.map((match) => <MatchCard key={match._id} match={match} />)
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No upcoming matches with predictions.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center'>
                <div className='grid gap-2'>
                  <CardTitle>Recent Results</CardTitle>
                  <CardDescription>Check the latest match outcomes.</CardDescription>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                  <Link href="/results">
                    View All
                    <ArrowUpright className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                 <div className='space-y-4'>
                  {recentResults.length > 0 ? (
                    recentResults.map((match) => <MatchCard key={match._id} match={match} />)
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No recent results found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export const dynamic = 'force-dynamic';
