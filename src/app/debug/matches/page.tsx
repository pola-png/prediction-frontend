
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAllMatches } from "@/services/sports-data-service";
import type { Match } from "@/lib/types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default async function DebugMatchesPage() {
  const allMatches = await getAllMatches();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-4">Match Debug View</h1>
      <p className="text-muted-foreground mb-8">
        This page displays all matches currently in the database (limit 200, sorted by most recent).
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
            <TableHead>Source</TableHead>
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
              <TableCell>{match.source}</TableCell>
               <TableCell>
                {match.prediction ? (
                    <Badge variant="default">Yes</Badge>
                ) : (
                    <Badge variant="destructive">No</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
