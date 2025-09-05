'use client'

import * as React from 'react';
import { useState, useEffect, type ReactNode } from 'react';
import type { Match } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { summarizeMatchInsights } from '@/ai/flows/summarize-match-insights';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Terminal } from 'lucide-react';

interface PredictionDetailsDialogProps {
  match: Match;
  children: ReactNode;
}

const ProbabilityBar = ({ label, value, variant }: { label: string; value: number; variant: 'home' | 'draw' | 'away' }) => {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-medium">{(value * 100).toFixed(0)}%</span>
      </div>
      <Progress value={value * 100} className="h-2" />
    </div>
  );
};


export function PredictionDetailsDialog({ match, children }: PredictionDetailsDialogProps) {
    const [summary, setSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (open && match.prediction && !summary) {
            setLoading(true);
            const fetchSummary = async () => {
                try {
                    const result = await summarizeMatchInsights({
                        matchId: match._id,
                        homeTeamName: match.homeTeam.name,
                        awayTeamName: match.awayTeam.name,
                        prediction: {
                            oneXTwo: match.prediction!.outcomes.oneXTwo,
                            over15: match.prediction!.outcomes.over15,
                            over25: match.prediction!.outcomes.over25,
                            bttsYes: match.prediction!.outcomes.bttsYes,
                            correctScoreRange: match.prediction!.outcomes.correctScoreRange,
                        },
                        features: match.prediction!.features,
                    });
                    setSummary(result.summary);
                } catch (error) {
                    console.error("Failed to fetch match summary", error);
                    setSummary("Could not load AI summary for this match.");
                } finally {
                    setLoading(false);
                }
            };
            fetchSummary();
        }
    }, [open, match, summary]);

    if (!match.prediction) {
        // Find a way to render children with disabled state
        return <>{children}</>;
    }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                    <AvatarImage src={match.homeTeam.logoUrl} alt={match.homeTeam.name} data-ai-hint="team logo" />
                    <AvatarFallback>{match.homeTeam.name.substring(0,1)}</AvatarFallback>
                </Avatar>
                <span>{match.homeTeam.name}</span>
             </div>
              {match.status === 'finished' ? (
                <span className='font-bold text-2xl'>{match.homeGoals} - {match.awayGoals}</span>
              ) : (
                <span className='text-muted-foreground'>vs</span>
              )}
             <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                    <AvatarImage src={match.awayTeam.logoUrl} alt={match.awayTeam.name} data-ai-hint="team logo" />
                    <AvatarFallback>{match.awayTeam.name.substring(0,1)}</AvatarFallback>
                </Avatar>
                <span>{match.awayTeam.name}</span>
             </div>
          </DialogTitle>
          <DialogDescription>
            {match.leagueCode} - {new Date(match.matchDateUtc).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
            <div className="space-y-2">
                <h4 className="font-medium">Match Outcome (1X2)</h4>
                <div className='flex gap-4'>
                    <ProbabilityBar label="Home Win" value={match.prediction.outcomes.oneXTwo.home} variant="home" />
                    <ProbabilityBar label="Draw" value={match.prediction.outcomes.oneXTwo.draw} variant="draw" />
                    <ProbabilityBar label="Away Win" value={match.prediction.outcomes.oneXTwo.away} variant="away" />
                </div>
            </div>
          
            <div className="grid grid-cols-2 gap-4">
                <div className='flex flex-col items-center justify-center p-4 border rounded-lg bg-muted/50'>
                    <div className='text-3xl font-bold'>{(match.prediction.outcomes.over25 * 100).toFixed(0)}%</div>
                    <div className='text-sm text-muted-foreground'>Over 2.5 Goals</div>
                </div>
                <div className='flex flex-col items-center justify-center p-4 border rounded-lg bg-muted/50'>
                    <div className='text-3xl font-bold'>{(match.prediction.outcomes.bttsYes * 100).toFixed(0)}%</div>
                    <div className='text-sm text-muted-foreground'>Both Teams to Score</div>
                </div>
            </div>
            
            <div>
                 <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>AI Match Summary</AlertTitle>
                    <AlertDescription>
                        {loading && <div className='space-y-2 mt-2'>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        }
                        {summary && !loading && <p className='leading-relaxed'>{summary}</p>}
                    </AlertDescription>
                </Alert>
            </div>

            <div className="text-center">
                <Badge>{match.prediction.bucket}</Badge>
                <p className="text-sm text-muted-foreground mt-1">Confidence: {match.prediction.confidence}%</p>
            </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
