
'use client';

import * as React from 'react';
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


const ListSkeleton = () => (
  <div className='space-y-4'>
    <Skeleton className="h-48 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
);


export default function BucketPage({ params }: { params: { bucket: string } }) {
  const { bucket } = params;
  const details = bucketDetails[bucket] || { title: 'Predictions', description: 'Browse predictions by category.' };
  
  const [matches, setMatches] = React.useState<Match[][]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate fetching data
    setTimeout(() => {
        // TODO: Replace with actual API call to get predictions for this bucket
        setMatches([]);
        setLoading(false);
    }, 1000);
  }, [bucket]);


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
                {loading ? <ListSkeleton /> : (
                  <>
                  {matches.length > 0 ? (
                      matches.map((accumulator, index) => (
                          <PredictionCard 
                              key={index} 
                              matches={accumulator} 
                              totalOdds={"1.00"} // Placeholder
                          />
                      ))
                  ) : (
                      <div className="text-center text-muted-foreground py-8">
                          No predictions available in this bucket for the upcoming matches.
                      </div>
                  )}
                  </>
                )}
              </CardContent>
            </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
