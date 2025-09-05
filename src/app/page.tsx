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
import { upcomingMatches } from '@/lib/mock-data';
import { MatchCard } from '@/components/match-card';

const predictionBuckets = [
  {
    title: 'VIP Predictions',
    description: 'High confidence, conservative picks.',
    icon: ShieldCheck,
    href: '#',
    count: 3,
  },
  {
    title: '2 Odds Picks',
    description: 'Curated small accumulators.',
    icon: Rocket,
    href: '#',
    count: 5,
  },
  {
    title: '5 Odds Picks',
    description: 'Medium risk accumulator targets.',
    icon: BarChart,
    href: '#',
    count: 2,
  },
  {
    title: 'Big 10+ Odds',
    description: 'Higher-risk aggregate selections.',
    icon: Trophy,
    href: '#',
    count: 1,
  },
];

export default function HomePage() {
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
              <Card key={bucket.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {bucket.title}
                  </CardTitle>
                  <bucket.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bucket.count} Active</div>
                  <p className="text-xs text-muted-foreground">
                    {bucket.description}
                  </p>
                </CardContent>
              </Card>
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
                  <Link href="#">
                    View All
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className='space-y-4'>
                {upcomingMatches.map((match) => (
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
