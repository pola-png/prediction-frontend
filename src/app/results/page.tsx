
'use client';

import * as React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { MatchCard } from '@/components/match-card';
import type { Match } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const ListSkeleton = () => (
  <div className='space-y-4'>
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);


export default function ResultsPage() {
  const [recentMatches, setRecentMatches] = React.useState<Match[]>([]);
  const [loading, setLoading] = React.useState(true);

   React.useEffect(() => {
    // Simulate fetching data
    setTimeout(() => {
        // TODO: Replace with actual API call
        setRecentMatches([]);
        setLoading(false);
    }, 1000);
  }, []);


  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
          <div className="w-full flex-1">
            <h1 className="font-semibold text-lg md:text-2xl">Recent Results</h1>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
           <Card>
              <CardHeader>
                <CardTitle>Recent Match Results</CardTitle>
                <CardDescription>
                  Check the outcomes of recently completed matches.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? <ListSkeleton /> : (
                  <>
                    {recentMatches.length > 0 ? (
                        recentMatches.map((match: Match) => (
                            <MatchCard key={match._id} match={match} />
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            No recent results available.
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
