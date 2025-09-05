import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
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


const predictionBuckets = [
  {
    title: 'VIP Predictions',
    description: 'High confidence, conservative picks.',
    icon: ShieldCheck,
    href: '/predictions/vip',
    bucket: 'vip',
  },
  {
    title: '2 Odds Picks',
    description: 'Curated small accumulators.',
    icon: Rocket,
    href: '/predictions/2odds',
    bucket: '2odds',
  },
  {
    title: '5 Odds Picks',
    description: 'Medium risk accumulator targets.',
    icon: BarChart,
    href: '/predictions/5odds',
    bucket: '5odds',
  },
  {
    title: 'Big 10+ Odds',
    description: 'Higher-risk aggregate selections.',
    icon: Trophy,
    href: '/predictions/big10',
    bucket: 'big10',
  },
];

async function getBucketCounts() {
  const buckets = ['vip', '2odds', '5odds', 'big10'];
  const counts: Record<string, number> = {};

  for (const bucket of buckets) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/predictions?bucket=${bucket}&limit=100`, { cache: 'no-store' });
      if (res.ok) {
          const data = await res.json();
          counts[bucket] = data.length;
      } else {
          counts[bucket] = 0;
      }
  }
  return counts;
}


export default async function PredictionsPage() {
  const bucketCounts = await getBucketCounts();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
          <div className="w-full flex-1">
            <h1 className="font-semibold text-lg md:text-2xl">Prediction Buckets</h1>
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
                <Card className="hover:bg-muted/50 transition-colors h-full">
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
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
