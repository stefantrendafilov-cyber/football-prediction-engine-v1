'use client';

import { useState, useMemo } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import PredictionCard from './PredictionCard';
import PredictionRow from './PredictionRow';
import Pagination from './ui/pagination';

interface HistoryClientProps {
  initialPredictions: any[];
}

export default function HistoryClient({ initialPredictions }: HistoryClientProps) {
  const [predictions] = useState(initialPredictions);
  const [filter, setFilter] = useState<'all' | 'won' | 'lost'>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prediction History</h1>
          <p className="text-zinc-500 mt-1 text-sm">View settled predictions</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {(['all', 'won', 'lost'] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setCurrentPage(1);
                }}
                className={`cursor-pointer px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  filter === f ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
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
        </div>
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
          <p className="text-zinc-600 text-sm mt-2">Results are synced automatically after matches finish.</p>
        </div>
      )}
    </div>
  );
}
