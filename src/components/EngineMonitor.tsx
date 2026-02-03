'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, AlertCircle, LayoutGrid, List, Info } from 'lucide-react';
import { toast } from 'sonner';
import PlaceBetButton from './PlaceBetButton';
import PredictionCard from './PredictionCard';
import PredictionRow from './PredictionRow';
import Pagination from './ui/pagination';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function formatTime(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
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
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  
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
        .lte('started_at_utc', new Date().toISOString())
        .order('started_at_utc', { ascending: false })
        .limit(1)
        .single();

    if (cycle) setLatestCycle(cycle);

    // Fetch predictions for this cycle only (within 72h window)
    if (cycle?.id) {
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
        .eq('cycle_id', cycle.id)
        .gte('fixtures.kickoff_at', bufferNow)
        .lte('fixtures.kickoff_at', seventyTwoHoursFromNow)
        .order('kickoff_at', { foreignTable: 'fixtures', ascending: true });

      if (rawPredictions) {
        setPredictions(rawPredictions);
        setCurrentPage(1);
      }
    } else {
      setPredictions([]);
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
    <TooltipProvider>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Today's Picks</h1>
            <p className="text-zinc-500 mt-1 text-sm">High-confidence predictions for upcoming matches</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`cursor-pointer p-1.5 rounded-md transition-all ${
                  viewMode === 'card' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`cursor-pointer p-1.5 rounded-md transition-all ${
                  viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => fetchLatestData()}
              className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Status:</span>
            <span className={`font-medium ${
              latestCycle?.status === 'SUCCESS' ? 'text-emerald-400' :
              latestCycle?.status === 'FAILED' ? 'text-red-400' :
              latestCycle?.status === 'RUNNING' ? 'text-blue-400' : 'text-zinc-400'
            }`}>
              {latestCycle?.status === 'SUCCESS' ? 'Updated' :
               latestCycle?.status === 'RUNNING' ? 'Updating...' :
               latestCycle?.status === 'FAILED' ? 'Error' : 'Pending'}
            </span>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Picks:</span>
            <span className="font-medium text-white">{predictions.length}</span>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Last update:</span>
            <span className="font-medium text-zinc-300">{latestCycle?.started_at_utc ? new Date(latestCycle.started_at_utc).toLocaleString() : 'Never'}</span>
          </div>
          {latestCycle?.error && (
            <>
              <div className="h-4 w-px bg-zinc-800" />
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>{latestCycle.error}</span>
              </div>
            </>
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
                    <tr className="bg-zinc-900 border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-medium">
                      <th className="py-3 px-4">Kickoff</th>
                      <th className="py-3 px-4">Match</th>
                      <th className="py-3 px-4">Pick</th>
                      <th className="py-3 px-4 text-center">Confidence</th>
                      <th className="py-3 px-4 text-center">Odds</th>
                      <th className="py-3 px-4 text-right">Action</th>
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
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
            <p className="text-zinc-400 text-lg font-medium">
              {isPolling ? 'Analyzing matches...' : 'No predictions available'}
            </p>
            <p className="text-zinc-600 text-sm mt-2">
              {isPolling ? 'This may take a moment' : 'Check back later for new picks'}
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
