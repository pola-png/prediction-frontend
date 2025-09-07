
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
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator';
import { Terminal } from 'lucide-react';
import axios from 'axios';

interface PredictionDetailsDialogProps {
  match: Match;
  children: ReactNode;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

const ProbabilityBar = ({ label, value, variant }: { label: string; value: number; variant?: 'default' | 'primary' }) => (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{(value * 100).toFixed(0)}%</span>
      </div>
      <Progress value={value * 100} className="h-2" />
    </div>
);


const PredictionGridItem = ({ title, value }: { title: string; value: string }) => (
  <div className='flex flex-col items-center justify-center p-4 border rounded-lg bg-muted/50 text-center'>
      <div className='text-3xl font-bold'>{value}</div>
      <div className='text-sm text-muted-foreground'>{title}</div>
  </div>
);


export function PredictionDetailsDialog({ match, children }: PredictionDetailsDialogProps) {
    const [summary, setSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (open && match.prediction && !summary) {
            const fetchSummary = async () => {
                setLoading(true);
                setError(null);
                try {
                    const response = await axios.get(`${API_BASE_URL}/summary/${match._id}`);
                    setSummary(response.data.summary);
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
                    setError(`Failed to load AI summary: ${errorMessage}`);
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            fetchSummary();
        }
    }, [open, match, summary]);

    if (!match.prediction) {
        return <>{children}</>;
    }
  
    const { oneXTwo, doubleChance, over05, over15, over25, bttsYes, bttsNo } = match.prediction.outcomes;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-4">
             <div className="flex items-center gap-2">
                <span className='text-lg font-semibold'>{match.homeTeam.name}</span>
             </div>
              {match.status === 'finished' ? (
                <span className='font-bold text-2xl'>{match.homeGoals} - {match.awayGoals}</span>
              ) : (
                <span className='text-muted-foreground text-xl'>vs</span>
              )}
             <div className="flex items-center gap-2">
                 <span className='text-lg font-semibold'>{match.awayTeam.name}</span>
             </div>
          </DialogTitle>
          <DialogDescription className='text-center'>
            {match.leagueCode} - {new Date(match.matchDateUtc).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
            
            <div className="space-y-3">
                <h4 className="font-medium text-center text-sm uppercase text-muted-foreground">Match Outcome (1X2)</h4>
                <div className='flex gap-4'>
                    <ProbabilityBar label="Home Win" value={oneXTwo.home} />
                    <ProbabilityBar label="Draw" value={oneXTwo.draw} />
                    <ProbabilityBar label="Away Win" value={oneXTwo.away} />
                </div>
            </div>
            
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-center text-sm uppercase text-muted-foreground">Goals</h4>
                <div className="space-y-3">
                   {typeof over05 === 'number' && <ProbabilityBar label="Over 0.5" value={over05} />}
                   <ProbabilityBar label="Over 1.5" value={over15} />
                   <ProbabilityBar label="Over 2.5" value={over25} />
                </div>
                 <Separator />
                 <div className="space-y-3">
                   <ProbabilityBar label="Both Teams to Score (Yes)" value={bttsYes} />
                   {typeof bttsNo === 'number' && <ProbabilityBar label="Both Teams to Score (No)" value={bttsNo} />}
                 </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-center text-sm uppercase text-muted-foreground">Other Markets</h4>
                {doubleChance && (
                  <>
                    <div className="space-y-3">
                        <ProbabilityBar label="Double Chance (Home/Draw)" value={doubleChance.homeOrDraw} />
                        <ProbabilityBar label="Double Chance (Home/Away)" value={doubleChance.homeOrAway} />
                        <ProbabilityBar label="Double Chance (Away/Draw)" value={doubleChance.drawOrAway} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator />
            
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
                        {error && <p className="text-destructive">{error}</p>}
                        {summary && !loading && <p className='leading-relaxed'>{summary}</p>}
                    </AlertDescription>
                </Alert>
            </div>

            <div className="text-center">
                <Badge variant="outline" className="text-base px-4 py-1">{match.prediction.bucket}</Badge>
                <p className="text-sm text-muted-foreground mt-2">Confidence: {match.prediction.confidence}%</p>
            </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
