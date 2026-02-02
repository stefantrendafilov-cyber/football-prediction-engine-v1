'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, ArrowLeft, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import PredictionCard from './PredictionCard';
import PredictionRow from './PredictionRow';
import Pagination from './ui/pagination';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'won' | 'lost'>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredPredictions = useMemo(() => {
    return predictions.filter((p) => {
      if (filter === 'all') return true;
      return p.outcome === filter;
    });
  }, [predictions, filter]);

  const paginatedPredictions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPredictions.slice(start, start + pageSize);
  }, [filteredPredictions, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPredictions.length / pageSize);

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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-200 text-sm flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold tracking-tighter">Prediction History</h1>
          <p className="text-zinc-400 mt-2">Track performance of settled predictions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'card' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase">Total Settled</p>
            <p className="text-2xl font-bold text-zinc-100">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase">Won</p>
            <p className="text-2xl font-bold text-green-400">{stats.won}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase">Lost</p>
            <p className="text-2xl font-bold text-red-400">{stats.lost}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase">Win Rate</p>
            <p className={`text-2xl font-bold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
              {winRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'won', 'lost'] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              filter === f ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filteredPredictions.length > 0 ? (
        <>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPredictions.map((prediction: any) => (
                <PredictionCard key={prediction.id} prediction={prediction} showOutcome />
              ))}
            </div>
          ) : (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                    <th className="py-4 px-4">Time</th>
                    <th className="py-4 px-4">Fixture</th>
                    <th className="py-4 px-4">Market</th>
                    <th className="py-4 px-4 text-center">Confidence</th>
                    <th className="py-4 px-4 text-center">Odds</th>
                    <th className="py-4 px-4 text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPredictions.map((prediction: any) => (
                    <PredictionRow key={prediction.id} prediction={prediction} showOutcome />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            totalItems={filteredPredictions.length}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/50">
          <p className="text-zinc-400 text-xl font-bold">No settled predictions yet</p>
          <p className="text-zinc-600 text-sm mt-2 font-mono">Click "Sync Results" to fetch finished game results.</p>
        </div>
      )}
    </div>
  );
}
