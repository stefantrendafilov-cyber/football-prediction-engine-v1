'use client';

import { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlacedBet } from '@/lib/betting/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BetsTableProps {
  initialBets?: PlacedBet[];
  limit?: number;
  itemsPerPage?: number;
}

export default function BetsTable({ initialBets, limit, itemsPerPage = 10 }: BetsTableProps) {
  const [bets, setBets] = useState<PlacedBet[]>(initialBets || []);
  const [loading, setLoading] = useState(!initialBets);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!initialBets) {
      fetchBets();
    }
  }, [initialBets]);

  const fetchBets = async () => {
    try {
      const res = await fetch('/api/bets');
      const data = await res.json();
      if (!data.error) {
        setBets(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching bets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBets = useMemo(() => {
    return limit ? bets.slice(0, limit) : bets;
  }, [bets, limit]);

  const totalPages = Math.ceil(filteredBets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBets = useMemo(() => {
    if (limit) return filteredBets;
    return filteredBets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBets, startIndex, itemsPerPage, limit]);

  if (loading) return <div className="p-8 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading bets...</div>;

  return (
    <div className="flex flex-col">
      <Table>
        <TableHeader className="bg-zinc-900/50">
          <TableRow className="border-zinc-900 hover:bg-transparent">
            <TableHead className="text-zinc-500 text-xs font-black uppercase tracking-tight">Fixture</TableHead>
            <TableHead className="text-zinc-500 text-xs font-black uppercase tracking-tight">Market</TableHead>
            <TableHead className="text-zinc-500 text-xs font-black uppercase tracking-tight">Odds</TableHead>
            <TableHead className="text-zinc-500 text-xs font-black uppercase tracking-tight">Stake</TableHead>
            <TableHead className="text-zinc-500 text-xs font-black uppercase tracking-tight">Status</TableHead>
            <TableHead className="text-right text-zinc-500 text-xs font-black uppercase tracking-tight">PnL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedBets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-zinc-600 font-bold uppercase text-xs tracking-widest">No bets placed yet.</TableCell>
            </TableRow>
          ) : (
            paginatedBets.map((bet) => (
              <TableRow key={bet.id} className="border-zinc-900 hover:bg-zinc-900/30 transition-colors group">
                <TableCell className="py-4">
                  <div className="font-black text-zinc-100 uppercase tracking-tight">
                    {bet.fixture ? `${bet.fixture.homeTeam} vs ${bet.fixture.awayTeam}` : `#${bet.fixtureId}`}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    {bet.fixture ? new Date(bet.fixture.startingAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-bold text-zinc-300">{bet.market}</div>
                  <div className="text-xs text-zinc-500 font-medium uppercase tracking-tighter">{bet.selection}</div>
                </TableCell>
                <TableCell className="font-black text-zinc-400">{(bet.oddsDecimal ?? 0).toFixed(2)}</TableCell>
                <TableCell className="font-black text-blue-500">€{(bet.stake ?? 0).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge 
                    variant={bet.status === 'WON' ? 'default' : bet.status === 'LOST' ? 'destructive' : 'secondary'} 
                    className={cn(
                      "font-black uppercase tracking-tighter rounded-sm px-2 py-0.5",
                      bet.status === 'WON' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                      bet.status === 'LOST' ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                      "bg-zinc-800 text-zinc-400 border-zinc-700"
                    )}
                  >
                    {bet.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {bet.pnl !== undefined && (
                    <span className={`font-black tracking-tight ${bet.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {bet.pnl >= 0 ? '+' : ''}€{(bet.pnl ?? 0).toFixed(2)}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!limit && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-4 border-t border-zinc-900 bg-zinc-950/50">
          <div className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
            Showing <span className="text-zinc-400">{startIndex + 1}</span> to <span className="text-zinc-400">{Math.min(startIndex + itemsPerPage, filteredBets.length)}</span> of <span className="text-zinc-400">{filteredBets.length}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-black transition-all",
                    currentPage === i + 1 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                      : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
