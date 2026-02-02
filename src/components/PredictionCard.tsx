'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import PlaceBetButton from './PlaceBetButton';

interface PredictionCardProps {
  prediction: any;
  showOutcome?: boolean;
}

function formatTime(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toISOString().slice(11, 16);
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PredictionCard({ prediction, showOutcome = false }: PredictionCardProps) {
  const marketLabel = prediction.market === 'OU' ? `OU ${prediction.line}` : prediction.market;
  const homeScore = prediction.fixtures?.home_score;
  const awayScore = prediction.fixtures?.away_score;
  const hasScore = homeScore !== null && awayScore !== null;

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'won':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
            <TrendingUp className="w-3 h-3 mr-1" />
            WON
          </Badge>
        );
      case 'lost':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
            <TrendingDown className="w-3 h-3 mr-1" />
            LOST
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card
      className={`bg-zinc-900 border-zinc-800 transition-all hover:border-zinc-700 ${
        showOutcome
          ? prediction.outcome === 'won'
            ? 'ring-1 ring-green-500/30'
            : prediction.outcome === 'lost'
            ? 'ring-1 ring-red-500/30'
            : 'ring-1 ring-yellow-500/30'
          : 'ring-1 ring-green-500/30'
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          {showOutcome ? (
            getOutcomeBadge(prediction.outcome)
          ) : (
            <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10">
              {prediction.decision}
            </Badge>
          )}
          <span className="text-[10px] text-zinc-500 uppercase font-mono">
            {showOutcome ? formatDate(prediction.fixtures?.kickoff_at) : formatTime(prediction.created_at)}
          </span>
        </div>
        <CardTitle className="text-xl font-black leading-tight text-white tracking-tight">
          {prediction.fixtures?.home_team?.name} <span className="text-zinc-500 font-normal mx-1">vs</span> {prediction.fixtures?.away_team?.name}
        </CardTitle>
        <p className="text-xs text-zinc-400 font-medium">
          {prediction.fixtures?.leagues?.name} • {formatDate(prediction.fixtures?.kickoff_at)} • {formatTime(prediction.fixtures?.kickoff_at)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {showOutcome && hasScore && (
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-zinc-500 uppercase mb-1">Final Score</p>
              <p className="text-3xl font-black text-white">
                {homeScore} <span className="text-zinc-500 text-xl">-</span> {awayScore}
              </p>
            </div>
          )}

          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase mb-1 tracking-wider">Market</p>
              <p className="text-base font-bold text-zinc-100">{marketLabel}</p>
              <p className="text-xs text-blue-400 font-bold">{prediction.selection}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 uppercase mb-1 tracking-wider">Model Prob</p>
              <p className="text-2xl font-black text-blue-500">{(prediction.model_probability * 100).toFixed(1)}%</p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Odds</p>
              <p className="text-sm font-mono text-zinc-300">{prediction.avg_odds ? prediction.avg_odds.toFixed(2) : 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Implied</p>
              <p className="text-sm font-mono text-zinc-400">{prediction.avg_odds ? (100 / prediction.avg_odds).toFixed(1) : '0'}%</p>
            </div>
          </div>
          
          {!showOutcome && (
            <div className="pt-2">
              <PlaceBetButton prediction={prediction} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
