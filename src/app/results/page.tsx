
'use client';

import * as React from 'react';
import axios from 'axios';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';


function ResultsList() {
    const [recentMatches, setRecentMatches] = React.useState<Match[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchResults = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_BASE_URL}/results`);
                setRecentMatches(response.data);
            } catch (error) {
                console.error('Failed to fetch results', error);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, []);
    
    if (loading) {
        return <ListSkeleton />;
    }

    return (
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
    );
}

export default function ResultsPage() {
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
                <ResultsList />
              </CardContent>
            </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

