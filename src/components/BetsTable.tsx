'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlacedBet } from '@/lib/betting/types';

interface BetsTableProps {
  initialBets?: PlacedBet[];
  limit?: number;
}

export default function BetsTable({ initialBets, limit }: BetsTableProps) {
  const [bets, setBets] = useState<PlacedBet[]>(initialBets || []);
  const [loading, setLoading] = useState(!initialBets);

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

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading bets...</div>;

  const displayBets = limit ? bets.slice(0, limit) : bets;

  return (
    <Table>
      <TableHeader className="bg-zinc-900/50">
        <TableRow className="border-zinc-900 hover:bg-transparent">
          <TableHead className="text-zinc-500 text-xs font-bold uppercase">Fixture</TableHead>
          <TableHead className="text-zinc-500 text-xs font-bold uppercase">Market</TableHead>
          <TableHead className="text-zinc-500 text-xs font-bold uppercase">Odds</TableHead>
          <TableHead className="text-zinc-500 text-xs font-bold uppercase">Stake</TableHead>
          <TableHead className="text-zinc-500 text-xs font-bold uppercase">Status</TableHead>
          <TableHead className="text-right text-zinc-500 text-xs font-bold uppercase">PnL</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayBets.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-zinc-500">No bets placed yet.</TableCell>
          </TableRow>
        ) : (
          displayBets.map((bet) => (
            <TableRow key={bet.id} className="border-zinc-900 hover:bg-zinc-900/30 transition-colors">
              <TableCell>
                <div className="font-bold">
                  {bet.fixture ? `${bet.fixture.homeTeam} vs ${bet.fixture.awayTeam}` : `#${bet.fixtureId}`}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {bet.fixture ? new Date(bet.fixture.startingAt).toLocaleDateString() : ''}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium">{bet.market}</div>
                <div className="text-xs text-zinc-500">{bet.selection}</div>
              </TableCell>
              <TableCell className="font-mono">{(bet.oddsDecimal ?? 0).toFixed(2)}</TableCell>
              <TableCell className="font-bold text-blue-400">€{(bet.stake ?? 0).toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={bet.status === 'WON' ? 'default' : bet.status === 'LOST' ? 'destructive' : 'secondary'} className="font-black italic">
                  {bet.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {bet.pnl !== undefined && (
                  <span className={`font-bold ${bet.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {bet.pnl >= 0 ? '+' : ''}€{(bet.pnl ?? 0).toFixed(2)}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
