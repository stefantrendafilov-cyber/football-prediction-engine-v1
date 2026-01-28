'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toISOString().slice(11, 16);
}

interface HistoryClientProps {
  initialPredictions: any[];
  stats: {
    total: number;
    won: number;
    lost: number;
  };
  winRate: number;
}

export default function HistoryClient({ initialPredictions, stats, winRate }: HistoryClientProps) {
  const [predictions, setPredictions] = useState(initialPredictions);
  const [currentStats, setCurrentStats] = useState(stats);
  const [currentWinRate, setCurrentWinRate] = useState(winRate);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'won' | 'lost'>('all');

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const toastId = toast.loading('Syncing results...');

    try {
      const res = await fetch('/api/results/sync', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        toast.success(
          `Sync complete! ${data.fixturesUpdated} fixtures updated, ${data.predictionsSettled} predictions settled.`,
          { id: toastId }
        );
        window.location.reload();
      } else {
        toast.error(`Sync failed: ${data.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to sync results', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredPredictions = predictions.filter((p) => {
    if (filter === 'all') return true;
    return p.outcome === filter;
  });

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
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200 text-sm flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold tracking-tighter">Prediction History</h1>
          <p className="text-zinc-400 mt-2">Track performance of settled predictions.</p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:opacity-50 rounded-lg text-sm font-medium transition-all"
        >
          {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isSyncing ? 'Syncing...' : 'Sync Results'}
        </button>
      </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 uppercase">Total Settled</p>
              <p className="text-2xl font-bold text-zinc-100">{currentStats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 uppercase">Won</p>
              <p className="text-2xl font-bold text-green-400">{currentStats.won}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 uppercase">Lost</p>
              <p className="text-2xl font-bold text-red-400">{currentStats.lost}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 uppercase">Win Rate</p>
              <p className={`text-2xl font-bold ${currentWinRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                {currentWinRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'won', 'lost'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              filter === f
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPredictions.map((prediction: any) => {
          const marketLabel = prediction.market === 'OU' ? `OU ${prediction.line}` : prediction.market;
          const homeScore = prediction.fixtures?.home_score;
          const awayScore = prediction.fixtures?.away_score;
          const hasScore = homeScore !== null && awayScore !== null;

          return (
            <Card
              key={prediction.id}
              className={`bg-zinc-900 border-zinc-800 transition-all hover:border-zinc-700 ${
                prediction.outcome === 'won'
                  ? 'ring-1 ring-green-500/30'
                  : prediction.outcome === 'lost'
                  ? 'ring-1 ring-red-500/30'
                  : 'ring-1 ring-yellow-500/30'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                  {getOutcomeBadge(prediction.outcome)}
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">
                    {formatDate(prediction.fixtures?.kickoff_at)}
                  </span>
                </div>
                <CardTitle className="text-xl font-black leading-tight text-white tracking-tight">
                  {prediction.fixtures?.home_team?.name}{' '}
                  <span className="text-zinc-500 font-normal mx-1">vs</span>{' '}
                  {prediction.fixtures?.away_team?.name}
                </CardTitle>
                <p className="text-xs text-zinc-400 font-medium">
                  {prediction.fixtures?.leagues?.name} • {formatTime(prediction.fixtures?.kickoff_at)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hasScore && (
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
                      <p className="text-2xl font-black text-blue-500">
                        {(prediction.model_probability * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Odds</p>
                      <p className="text-sm font-mono text-zinc-300">
                        {prediction.avg_odds ? prediction.avg_odds.toFixed(2) : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Implied</p>
                      <p className="text-sm font-mono text-zinc-400">
                        {prediction.avg_odds ? (100 / prediction.avg_odds).toFixed(1) : '0'}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPredictions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/50">
          <p className="text-zinc-400 text-xl font-bold">No settled predictions yet</p>
          <p className="text-zinc-600 text-sm mt-2 font-mono">
            Click "Sync Results" to fetch finished game results.
          </p>
        </div>
      )}
    </div>
  );
}
