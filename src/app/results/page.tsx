import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { MatchCard } from '@/components/match-card';
import type { Match } from '@/lib/types';

async function getRecentResults(): Promise<Match[]> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/results/recent?limit=20`, { cache: 'no-store' });
    if (!res.ok) {
        console.error(`Failed to fetch recent results`);
        return [];
    }
    const results = await res.json();
    return results.map((r: any) => ({ ...r.matchId, homeGoals: r.result.homeGoals, awayGoals: r.result.awayGoals, status: 'finished' }));
}


export default async function ResultsPage() {
  const recentMatches = await getRecentResults();

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
                {recentMatches.length > 0 ? (
                    recentMatches.map((match: Match) => (
                        <MatchCard key={match._id} match={match} />
                    ))
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        No recent results available.
                    </div>
                )}
              </CardContent>
            </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
