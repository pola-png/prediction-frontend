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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AppSidebar } from '@/components/app-sidebar';
import type { Match } from '@/lib/types';
import { MatchCard } from '@/components/match-card';

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

async function getUpcomingMatches(): Promise<Match[]> {
  // In a real app, you'd fetch this from the API
  const { upcomingMatches } = await import('@/lib/mock-data');
  return upcomingMatches;
}

async function getBucketCounts() {
    const { upcomingMatches } = await import('@/lib/mock-data');
    const counts = {
        vip: 0,
        '2odds': 0,
        '5odds': 0,
        big10: 0,
    };
    for (const match of upcomingMatches) {
        if (match.prediction) {
            counts[match.prediction.bucket]++;
        }
    }
    return counts;
}


export default async function HomePage() {
  const upcomingMatches = await getUpcomingMatches();
  const bucketCounts = await getBucketCounts();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
          <div className="w-full flex-1">
            <h1 className="font-semibold text-lg md:text-2xl">Dashboard</h1>
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
                  <div className="text-2xl font-bold">{bucketCounts[bucket.bucket as keyof typeof bucketCounts]} Active</div>
                  <p className="text-xs text-muted-foreground">
                    {bucket.description}
                  </p>
                </CardContent>
              </Card>
              </Link>
            ))}
          </div>
          
          <div className="grid gap-4 md:gap-8">
            <Card>
              <CardHeader className='flex flex-row items-center'>
                <div className='grid gap-2'>
                  <CardTitle>Upcoming Matches</CardTitle>
                  <CardDescription>Predictions for matches in the next 7 days.</CardDescription>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                  <Link href="/predictions">
                    View All
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className='space-y-4'>
                {upcomingMatches.slice(0, 5).map((match) => (
                   <MatchCard key={match._id} match={match} />
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
