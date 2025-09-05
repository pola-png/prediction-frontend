import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { MatchCard } from '@/components/match-card';
import type { Match } from '@/lib/types';

const bucketDetails: Record<string, { title: string, description: string }> = {
    'vip': { title: 'VIP Predictions', description: 'High confidence, conservative picks with odds under 2.0.' },
    '2odds': { title: '2 Odds Picks', description: 'Curated small accumulators with total odds around 2.0.' },
    '5odds': { title: '5 Odds Picks', description: 'Medium-risk accumulators with total odds around 5.0.' },
    'big10': { title: 'Big 10+ Odds', description: 'Higher-risk aggregate selections with total odds over 10.0.' },
}

async function getMatchesByBucket(bucket: string): Promise<Match[]> {
    const { upcomingMatches } = await import('@/lib/mock-data');
    return upcomingMatches.filter(match => match.prediction?.bucket === bucket);
}


export default async function BucketPage({ params }: { params: { bucket: string } }) {
  const { bucket } = params;
  const details = bucketDetails[bucket] || { title: 'Predictions', description: 'Browse predictions by category.' };
  
  const filteredMatches = await getMatchesByBucket(bucket);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
          <div className="w-full flex-1">
            <h1 className="font-semibold text-lg md:text-2xl">{details.title}</h1>
          </div>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className='h-8 w-8'>
                  <AvatarImage src="https://picsum.photos/32/32" data-ai-hint="user avatar" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
           <Card>
              <CardHeader>
                <CardTitle>{details.title}</CardTitle>
                <CardDescription>
                  {details.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredMatches.length > 0 ? (
                    filteredMatches.map((match: Match) => (
                        <MatchCard key={match._id} match={match} />
                    ))
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        No predictions available in this bucket for the upcoming matches.
                    </div>
                )}
              </CardContent>
            </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
