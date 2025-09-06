
'use client';

import * as React from 'react';
import type { Match } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { getPredictionSummary } from "./match-card";
import { format } from "date-fns";
import { PredictionDetailsDialog } from "./prediction-details-dialog";
import { Button } from "./ui/button";
import { Skeleton } from './ui/skeleton';

function getIndividualOutcomeOdds(match: Match): number {
    if (!match.prediction) return 1;
    const { home, away, draw } = match.prediction.outcomes.oneXTwo;
    const maxProb = Math.max(home, away, draw);
    if (maxProb === 0) return 1;
    return 1 / maxProb;
}


export function PredictionCard({ matches }: { matches: Match[] }) {
    
    const [totalOdds, setTotalOdds] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchTotalOdds = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const matchIds = matches.map(m => m._id);
                const res = await fetch('/api/odds/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ matchIds })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || 'Failed to fetch odds');
                }

                const data = await res.json();
                setTotalOdds(data.totalOdds);

            } catch (e: any) {
                setError(e.message);
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };

        if (matches.length > 0) {
            fetchTotalOdds();
        } else {
            setIsLoading(false);
        }
    }, [matches]);


    return (
        <Card className="border-2 border-primary/40 shadow-lg">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Accumulator Playcard</CardTitle>
                    <div className="text-right">
                        {isLoading && <Skeleton className="h-7 w-40" />}
                        {error && <Badge variant="destructive">Error</Badge>}
                        {!isLoading && !error && totalOdds && (
                             <Badge variant="default" className="text-lg px-4 py-1">
                                Total Odds: {totalOdds}
                            </Badge>
                        )}
                    </div>
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
                        <div className="flex items-center justify-center gap-4 mt-2">
                             <Badge variant="secondary">{getPredictionSummary(match)}</Badge>
                             <span className="text-sm font-bold">(@{getIndividualOutcomeOdds(match).toFixed(2)})</span>
                             <PredictionDetailsDialog match={match}>
                                <Button variant="outline" size="sm" disabled={!match.prediction}>View Details</Button>
                            </PredictionDetailsDialog>
                        </div>
                        {index < matches.length - 1 && <Separator className="my-4" />}
                    </div>
                ))}
            </CardContent>
            <CardFooter>
                 <p className="text-xs text-muted-foreground">
                    Please bet responsibly. Odds are subject to change and are based on AI-generated probabilities, not live market data.
                 </p>
            </CardFooter>
        </Card>
    )
}
