
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Match } from "@/lib/types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from '@/components/ui/skeleton';

export default function DebugMatchesPage() {
  const [allMatches, setAllMatches] = React.useState<Match[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // In a real app, this would fetch from the API Gateway endpoint
    // that's connected to the DynamoDB table.
    // e.g., fetch('/api/matches').then(res => res.json()).then(data => setAllMatches(data));
    setTimeout(() => {
        setAllMatches([]);
        setLoading(false);
    }, 1000);
  }, []);


  if (loading) {
    return (
        <div className="container mx-auto py-10">
             <h1 className="text-3xl font-bold mb-4">Match Debug View</h1>
             <div className="space-y-4 mt-8">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
             </div>
        </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-4">Match Debug View</h1>
      <p className="text-muted-foreground mb-8">
        This page should display all matches currently in the DynamoDB table (via an API Gateway).
      </p>
      <Table>
        <TableCaption>A list of all matches from the database.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>League</TableHead>
            <TableHead>Home Team</TableHead>
            <TableHead>Away Team</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Has Prediction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allMatches.map((match: Match) => (
            <TableRow key={match._id}>
              <TableCell>{format(new Date(match.matchDateUtc), 'yyyy-MM-dd HH:mm')}</TableCell>
              <TableCell>{match.leagueCode}</TableCell>
              <TableCell>{match.homeTeam.name}</TableCell>
              <TableCell>{match.awayTeam.name}</TableCell>
              <TableCell>
                  <Badge variant={match.status === 'scheduled' ? 'secondary' : 'outline'}>
                    {match.status}
                  </Badge>
              </TableCell>
               <TableCell>
                {match.prediction ? (
                    <Badge variant="default">Yes</Badge>
                ) : (
                    <Badge variant="destructive">No</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
           {allMatches.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No matches found. The API might not be connected or the table is empty.
                    </TableCell>
                </TableRow>
           )}
        </TableBody>
      </Table>
    </div>
  );
}
