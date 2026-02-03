'use client';

import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import PlaceBetButton from './PlaceBetButton';

interface PredictionRowProps {
  prediction: any;
  showOutcome?: boolean;
}

function formatTime(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PredictionRow({ prediction, showOutcome = false }: PredictionRowProps) {
  const marketLabel = prediction.market === 'OU' ? `OU ${prediction.line}` : prediction.market;
  const homeScore = prediction.fixtures?.home_score;
  const awayScore = prediction.fixtures?.away_score;
  const hasScore = homeScore !== null && awayScore !== null;

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'won':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
            WON
          </Badge>
        );
      case 'lost':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
            LOST
          </Badge>
        );
      default:
        return (
            <Badge variant="outline" className="text-zinc-500 border-zinc-500/50">
                PENDING
            </Badge>
        );
    }
  };

  return (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors group">
      <td className="py-4 px-4">
        <div className="flex flex-col">
          <span className="text-xs text-zinc-500 font-mono mb-1">{formatDate(prediction.fixtures?.kickoff_at)}</span>
          <span className="text-sm font-bold text-zinc-100">{formatTime(prediction.fixtures?.kickoff_at)}</span>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex flex-col">
          <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">
            {prediction.fixtures?.home_team?.name} vs {prediction.fixtures?.away_team?.name}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase">{prediction.fixtures?.leagues?.name}</span>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-zinc-200">{marketLabel}</span>
          <span className="text-xs text-blue-400 font-bold">{prediction.selection}</span>
        </div>
      </td>
      <td className="py-4 px-4 text-center">
        <span className="text-base font-black text-blue-500">{(prediction.model_probability * 100).toFixed(1)}%</span>
      </td>
      <td className="py-4 px-4 text-center font-mono text-sm text-zinc-300">
        {prediction.avg_odds ? prediction.avg_odds.toFixed(2) : 'N/A'}
      </td>
      {showOutcome ? (
        <td className="py-4 px-4 text-center">
          <div className="flex flex-col items-center gap-1">
            {hasScore ? (
              <span className="text-sm font-bold text-white">{homeScore} - {awayScore}</span>
            ) : (
              <span className="text-xs text-zinc-600">-</span>
            )}
            {getOutcomeBadge(prediction.outcome)}
          </div>
        </td>
      ) : (
        <td className="py-4 px-4 text-right">
          <PlaceBetButton prediction={prediction} />
        </td>
      )}
    </tr>
  );
}
