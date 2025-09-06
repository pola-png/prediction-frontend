
'use client';

import * as React from 'react';
import type { Match } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { PredictionDetailsDialog } from './prediction-details-dialog';

function getPredictionSummary(match: Match) {
    if (!match.prediction) return 'No prediction available';
    
    const { home, away, draw } = match.prediction.outcomes.oneXTwo;

    if (home > away && home > draw) return `${match.homeTeam.name} to Win`;
    if (away > home && away > draw) return `${match.awayTeam.name} to Win`;
    if (draw > home && draw > away) return 'Draw';

    const { over25, bttsYes } = match.prediction.outcomes;
    if (over25 > 0.6) return 'Over 2.5 Goals';
    if (bttsYes > 0.6) return 'Both Teams to Score';
    
    return 'Prediction available';
}

const ResultIcon = ({ match }: { match: Match }) => {
    if (!match.prediction || match.status !== 'finished') return null;

    const { home, away } = match.prediction.outcomes.oneXTwo;
    
    let predictedOutcome: 'home' | 'away' | 'draw' = 'draw';
    if (home > away && home > 0.5) predictedOutcome = 'home';
    else if (away > home && away > 0.5) predictedOutcome = 'away';

    let actualOutcome: 'home' | 'away' | 'draw' = 'draw';
    if (match.homeGoals! > match.awayGoals!) actualOutcome = 'home';
    else if (match.awayGoals! > match.homeGoals!) actualOutcome = 'away';

    if (predictedOutcome === actualOutcome) {
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
}


export function MatchCard({ match }: { match: Match }) {
  const [formattedTime, setFormattedTime] = React.useState('');
  const matchDate = new Date(match.matchDateUtc);
  const summary = getPredictionSummary(match);

  const isFinished = match.status === 'finished';

  React.useEffect(() => {
    setFormattedTime(format(matchDate, 'HH:mm'));
  }, [matchDate]);

  return (
    <div className="border rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4 hover:bg-card/60 transition-colors">
      <div className="flex-1 grid grid-cols-[1fr,auto,1fr] items-center gap-2 sm:gap-4 w-full">
        <div className="flex items-center gap-2 sm:gap-4 justify-end">
          <span className="font-semibold text-right hidden sm:block">{match.homeTeam.name}</span>
          <Avatar>
            <AvatarImage src={match.homeTeam.logoUrl} alt={match.homeTeam.name} data-ai-hint="team logo" />
            <AvatarFallback>{match.homeTeam.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
        <div className="text-center">
            {isFinished ? (
                 <span className="font-bold text-lg">{`${match.homeGoals} - ${match.awayGoals}`}</span>
            ) : (
                <>
                    <span className="font-bold text-lg">vs</span>
                     <div className="text-xs text-muted-foreground sm:hidden flex flex-col items-center">
                        <span>{match.homeTeam.name}</span>
                        <span>{match.awayTeam.name}</span>
                    </div>
                </>
            )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Avatar>
            <AvatarImage src={match.awayTeam.logoUrl} alt={match.awayTeam.name} data-ai-hint="team logo" />
            <AvatarFallback>{match.awayTeam.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="font-semibold hidden sm:block">{match.awayTeam.name}</span>
        </div>
      </div>
      <div className="w-full sm:w-px sm:h-12 bg-border my-2 sm:my-0" />
      <div className="flex flex-col items-center sm:items-start gap-1 text-sm text-muted-foreground w-full sm:w-auto sm:min-w-48">
        <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(matchDate, 'EEE, MMM d')}</span>
        </div>
        <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formattedTime}</span>
        </div>
         <Badge variant="secondary">{match.leagueCode}</Badge>
      </div>
       <div className="w-full sm:w-px sm:h-12 bg-border my-2 sm:my-0" />
      <div className="flex flex-col items-center sm:items-start gap-2 w-full sm:w-auto sm:min-w-48">
        <Badge variant={match.prediction?.bucket === 'vip' ? "default" : "outline"} className={match.prediction?.bucket === 'vip' ? 'bg-accent text-accent-foreground' : ''}>{summary}</Badge>
        {match.prediction && !isFinished && (
            <div className="text-xs text-muted-foreground">
                Confidence: <span className="font-semibold text-foreground">{match.prediction.confidence}%</span>
            </div>
        )}
        {isFinished && <ResultIcon match={match} />}
      </div>
      <div className="ml-auto flex-shrink-0">
        <PredictionDetailsDialog match={match}>
            <Button variant="outline" size="sm" disabled={!match.prediction}>View Details</Button>
        </PredictionDetailsDialog>
      </div>
    </div>
  );
}
