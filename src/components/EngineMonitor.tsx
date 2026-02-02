'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2, RefreshCw, AlertCircle, History, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import PlaceBetButton from './PlaceBetButton';
import PredictionCard from './PredictionCard';
import PredictionRow from './PredictionRow';
import Pagination from './ui/pagination';

function formatTime(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toISOString().slice(11, 19);
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 10);
}

interface EngineMonitorProps {
  initialPredictions: any[];
  initialLatestCycle: any;
}

export default function EngineMonitor({ initialPredictions, initialLatestCycle }: EngineMonitorProps) {
  const [predictions, setPredictions] = useState(initialPredictions);
  const [latestCycle, setLatestCycle] = useState(initialLatestCycle);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedPredictions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return predictions.slice(start, start + pageSize);
  }, [predictions, currentPage, pageSize]);

  const totalPages = Math.ceil(predictions.length / pageSize);

  const fetchLatestData = useCallback(async (cycleId?: string) => {
    // Fetch latest cycle
    const { data: cycle } = await supabaseBrowser
      .from('engine_cycles')
      .select('*')
      .order('started_at_utc', { ascending: false })
      .limit(1)
      .single();

    if (cycle) setLatestCycle(cycle);

    // Fetch predictions for next 72 hours
    const now = new Date();
    const bufferNow = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const seventyTwoHoursFromNow = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

    const { data: rawPredictions } = await supabaseBrowser
      .from('predictions')
      .select(`
        *,
        fixtures!inner (
          kickoff_at,
          home_team:teams!fixtures_home_team_id_fkey (name),
          away_team:teams!fixtures_away_team_id_fkey (name),
          leagues (name)
        )
      `)
      .eq('decision', 'PUBLISH')
      .gte('model_probability', 0.70)
      .gte('fixtures.kickoff_at', bufferNow)
      .lte('fixtures.kickoff_at', seventyTwoHoursFromNow)
      .order('kickoff_at', { foreignTable: 'fixtures', ascending: true });

    if (rawPredictions) {
      setPredictions(rawPredictions);
      setCurrentPage(1); // Reset to first page on refresh
    }
  }, []);

  const startPolling = useCallback((cycleId: string) => {
    setIsPolling(true);
    const interval = setInterval(async () => {
      const { data: cycle } = await supabaseBrowser
        .from('engine_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();

      if (cycle) {
        setLatestCycle(cycle);
        if (cycle.status !== 'RUNNING') {
          clearInterval(interval);
          setIsPolling(false);
          fetchLatestData();
          if (cycle.status === 'SUCCESS') {
            toast.success(`Engine run completed! ${cycle.predictions_published} predictions published.`);
          } else {
            toast.error(`Engine run failed: ${cycle.error}`);
          }
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchLatestData]);

  const handleTrigger = async () => {
    if (isTriggering || isPolling) return;
    setIsTriggering(true);
    const toastId = toast.loading('Triggering prediction engine...');

    try {
      const res = await fetch('/api/engine', { method: 'POST' });
      const data = await res.json();

      if (data.success && data.cycleId) {
        toast.info('Engine is running...', { id: toastId });
        startPolling(data.cycleId);
      } else {
        toast.error(`Engine error: ${data.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to trigger engine', { id: toastId });
    } finally {
      setIsTriggering(false);
    }
  };

  // Initial poll check: if latest cycle is RUNNING, resume polling
  useEffect(() => {
    if (latestCycle?.status === 'RUNNING') {
      startPolling(latestCycle.id);
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter">Engine Monitor</h1>
          <p className="text-zinc-400 mt-2">Live prediction stream from the Poisson/Elo model.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* View Toggle */}
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

          <Link
            href="/dashboard/history"
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-all"
          >
            <History className="w-4 h-4" />
            History
          </Link>
          <button
            onClick={handleTrigger}
            disabled={isTriggering || isPolling}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-lg text-sm font-medium transition-all transform active:scale-95 ${
              isTriggering || isPolling ? 'cursor-not-allowed' : ''
            }`}
          >
            {isTriggering || isPolling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isTriggering || isPolling ? 'Analyzing...' : 'Trigger Engine'}
          </button>
        </div>
      </div>

      {/* Debug Panel */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl font-mono text-[11px]">
        <div className="flex flex-col">
          <span className="text-zinc-500 uppercase">Latest Cycle</span>
          <span
            className={`font-bold ${
              latestCycle?.status === 'SUCCESS'
                ? 'text-green-500'
                : latestCycle?.status === 'FAILED'
                ? 'text-red-500'
                : 'text-blue-500'
            }`}
          >
            {latestCycle?.status || 'NO RUNS YET'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-zinc-500 uppercase">Fixtures Found</span>
          <span className="text-zinc-100">{latestCycle?.fixtures_found || 0}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-zinc-500 uppercase">Predictions Published</span>
          <span className="text-green-400 font-bold">{latestCycle?.predictions_published || 0}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-zinc-500 uppercase">Last Run</span>
          <span className="text-zinc-400">{formatTime(latestCycle?.started_at_utc)}</span>
        </div>
        {latestCycle?.error && (
          <div className="col-span-full mt-2 pt-2 border-t border-zinc-800 text-red-400 flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            <span>{latestCycle.error}</span>
          </div>
        )}
      </div>

      {predictions.length > 0 ? (
        <>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPredictions.map((prediction: any) => (
                <PredictionCard key={prediction.id} prediction={prediction} />
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
                    <th className="py-4 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPredictions.map((prediction: any) => (
                    <PredictionRow key={prediction.id} prediction={prediction} />
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
            totalItems={predictions.length}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/50">
          <p className="text-zinc-400 text-xl font-bold">
            {isPolling
              ? 'Analyzing fixtures...'
              : latestCycle
              ? 'No predictions found in last run'
              : 'Waiting for engine cycles...'}
          </p>
          <p className="text-zinc-600 text-sm mt-2 font-mono">
            {isPolling
              ? 'Engine is evaluating upcoming games...'
              : 'Run trigger engine to start the analysis.'}
          </p>
        </div>
      )}
    </div>
  );
}
