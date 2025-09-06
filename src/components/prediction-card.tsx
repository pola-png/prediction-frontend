
'use client';

import type { Match } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { getPredictionSummary } from "./match-card";
import { format } from "date-fns";

function getOutcomeOdds(match: Match): number {
    if (!match.prediction) return 1;

    const { home, away, draw } = match.prediction.outcomes.oneXTwo;

    const maxProb = Math.max(home, away, draw);

    if (maxProb === 0) return 1;

    return 1 / maxProb;
}


export function PredictionCard({ matches }: { matches: Match[] }) {
    
    const totalOdds = matches.reduce((acc, match) => {
        return acc * getOutcomeOdds(match);
    }, 1);

    return (
        <Card className="border-2 border-primary/40 shadow-lg">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Accumulator Playcard</CardTitle>
                    <Badge variant="default" className="text-lg px-4 py-1">
                        Total Odds: {totalOdds.toFixed(2)}
                    </Badge>
                </div>
                <CardDescription>
                    This card combines multiple predictions into a single play. Each prediction is a "leg" of the accumulator.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {matches.map((match, index) => (
                    <div key={match._id}>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
                            <div className="font-semibold text-right">
                                {match.homeTeam.name}
                            </div>
                             <div className="text-center text-muted-foreground">vs</div>
                             <div className="font-semibold text-left">
                                {match.awayTeam.name}
                            </div>
                        </div>
                         <div className="text-center text-sm text-muted-foreground mt-2">
                            {format(new Date(match.matchDateUtc), 'EEE, MMM d, HH:mm')}
                         </div>
                        <div className="text-center mt-2">
                             <Badge variant="secondary">{getPredictionSummary(match)}</Badge>
                             <span className="ml-2 text-sm font-bold">(@{getOutcomeOdds(match).toFixed(2)})</span>
                        </div>
                        {index < matches.length - 1 && <Separator className="my-4" />}
                    </div>
                ))}
            </CardContent>
            <CardFooter>
                 <p className="text-xs text-muted-foreground">
                    Please bet responsibly. Odds are subject to change.
                 </p>
            </CardFooter>
        </Card>
    )
}
