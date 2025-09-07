
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
import type { Match as MatchType } from "@/lib/types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Team from '@/models/Team';
import Prediction from '@/models/Prediction';
import { sanitizeObject } from '@/lib/utils';

async function getAllMatches(): Promise<MatchType[]> {
    await dbConnect();
    // Ensure models are registered to avoid MissingSchemaError
    Team; 
    Prediction;
    const matches = await Match.find({}).populate('homeTeam').populate('awayTeam').sort({ matchDateUtc: -1 }).limit(100).lean();
    return sanitizeObject(matches);
}


export default async function DebugMatchesPage() {
  const allMatches = await getAllMatches();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-4">Match Debug View</h1>
      <p className="text-muted-foreground mb-8">
        This page displays the last 100 matches from the MongoDB database.
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
          {allMatches.map((match: MatchType) => (
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
                        No matches found. The database might be empty.
                    </TableCell>
                </TableRow>
           )}
        </TableBody>
      </Table>
    </div>
  );
}

export const dynamic = 'force-dynamic';
