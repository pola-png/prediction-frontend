
'use client';

import * as React from 'react';
import axios from 'axios';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { Match } from '@/lib/types';
import { PredictionCard } from '@/components/prediction-card';
import { Skeleton } from '@/components/ui/skeleton';

const bucketDetails: Record<string, { title: string, description: string }> = {
    'vip': { title: 'VIP Predictions', description: 'High confidence, conservative picks with odds under 2.0.' },
    '2odds': { title: '2 Odds Picks', description: 'Curated small accumulators with total odds around 2.0.' },
    '5odds': { title: '5 Odds Picks', description: 'Medium-risk accumulators with total odds around 5.0.' },
    'big10': { title: 'Big 10+ Odds', description: 'Higher-risk aggregate selections with total odds over 10.0.' },
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

const ListSkeleton = () => (
  <div className='space-y-4'>
    <Skeleton className="h-48 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
);

function groupMatchesIntoAccumulators(matches: Match[], targetOdds: number): Match[][] {
  const accumulators: Match[][] = [];
  let currentAccumulator: Match[] = [];
  let currentTotalOdds = 1.0;

  for (const match of matches) {
    if (!match.prediction) continue;
    
    const { home, away, draw } = match.prediction.outcomes.oneXTwo;
    const maxProb = Math.max(home, away, draw);
    if (maxProb === 0) continue;
    const outcomeOdds = 1 / maxProb;

    if (currentAccumulator.length > 0 && (currentTotalOdds * outcomeOdds > targetOdds * 1.5)) {
      accumulators.push(currentAccumulator);
      currentAccumulator = [];
      currentTotalOdds = 1.0;
    }
    
    currentAccumulator.push(match);
    currentTotalOdds *= outcomeOdds;

    if (currentTotalOdds >= targetOdds) {
      accumulators.push(currentAccumulator);
      currentAccumulator = [];
      currentTotalOdds = 1.0;
    }
  }

  if (currentAccumulator.length > 0) {
    accumulators.push(currentAccumulator);
  }

  return accumulators;
}

function PredictionsList({ bucket }: { bucket: string }) {
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchMatches = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/predictions/${bucket}`);
            setMatches(response.data);
        } catch (error) {
            console.error(`Failed to fetch matches for bucket ${bucket}`, error);
        } finally {
            setLoading(false);
        }
    };
    fetchMatches();
  }, [bucket]);
  
  if (loading) {
    return <ListSkeleton />;
  }

  let targetOdds = 2.0;
  if(bucket === '5odds') targetOdds = 5.0;
  if(bucket === 'big10') targetOdds = 10.0;
  if(bucket === 'vip') targetOdds = 1.5;


  const accumulators = groupMatchesIntoAccumulators(matches, targetOdds);

  const calculateTotalOdds = (acc: Match[]) => {
      return acc.reduce((total, match) => {
          if (!match.prediction) return total;
          const { home, away, draw } = match.prediction.outcomes.oneXTwo;
          const maxProb = Math.max(home, away, draw);
          if (maxProb === 0) return total;
          return total * (1 / maxProb);
      }, 1.0).toFixed(2);
  }

  return (
    <>
      {accumulators.length > 0 ? (
          accumulators.map((accumulator, index) => (
              <PredictionCard 
                  key={index} 
                  matches={accumulator} 
                  totalOdds={calculateTotalOdds(accumulator)}
              />
          ))
      ) : (
          <div className="text-center text-muted-foreground py-8">
              No predictions available in this bucket for the upcoming matches.
          </div>
      )}
    </>
  )
}


export default function BucketPage({ params }: { params: { bucket: string } }) {
  const { bucket } = params;
  const details = bucketDetails[bucket] || { title: 'Predictions', description: 'Browse predictions by category.' };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
          <div className="w-full flex-1">
            <h1 className="font-semibold text-lg md:text-2xl">{details.title}</h1>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
           <Card>
              <CardHeader>
                <CardTitle>{details.title}</CardTitle>
                <CardDescription>
                  {details.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <PredictionsList bucket={bucket} />
              </CardContent>
            </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
