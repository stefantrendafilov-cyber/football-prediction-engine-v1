'use client';

import { useState, useEffect } from 'react';
import BetsTable from './BetsTable';
import { TrendingUp, TrendingDown, Wallet, Shield, AlertTriangle, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bankroll, PlacedBet } from '@/lib/betting/types';

export default function BankrollDashboard() {
  const [bankroll, setBankroll] = useState<Bankroll | null>(null);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [brRes, betsRes] = await Promise.all([
        fetch('/api/bankroll'),
        fetch('/api/bets')
      ]);
      
      if (!brRes.ok) {
        const error = await brRes.text();
        throw new Error(`Bankroll API error: ${brRes.status} ${error}`);
      }
      if (!betsRes.ok) {
        const error = await betsRes.text();
        throw new Error(`Bets API error: ${betsRes.status} ${error}`);
      }

      const brData = await brRes.json();
      const betsData = await betsRes.json();

      if (brData.error || (betsData && betsData.error)) {
        throw new Error(brData.error || (betsData && betsData.error));
      }

      setBankroll(brData);
      setBets(Array.isArray(betsData) ? betsData : []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      // If it's a TypeError: Failed to fetch, it might be a transient network issue or CORS
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn('Network error detected. Please check your connection or server status.');
      }
    } finally {
      setLoading(false);
    }
  };


  if (loading) return <div className="p-8 text-center">Loading bankroll data...</div>;
  if (!bankroll) return <div className="p-8 text-center text-red-500">Error: Could not load bankroll.</div>;

  const profit = bankroll.currentBankroll - bankroll.initialBankroll;
  const profitPct = (profit / bankroll.initialBankroll) * 100;

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2 uppercase">BANKROLL</h1>
          <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold">Safe Kelly v1 Management</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono text-zinc-400">ENGINE LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-950 border-zinc-900">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase text-zinc-500">Current Balance</CardDescription>
              <CardTitle className="text-3xl font-black">€{(bankroll.currentBankroll ?? 0).toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center gap-1 text-sm font-bold ${(profit ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {(profit ?? 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {(profit ?? 0) >= 0 ? '+' : ''}{(profit ?? 0).toFixed(2)} ({(profitPct ?? 0).toFixed(1)}%)
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase text-zinc-500">Open Exposure</CardDescription>
              <CardTitle className="text-3xl font-black">€{(bankroll.openExposure ?? 0).toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-zinc-500 font-bold">
                {((bankroll.openExposure ?? 0) / (bankroll.currentBankroll || 1) * 100).toFixed(1)}% of total
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase text-zinc-500">Peak Balance</CardDescription>
              <CardTitle className="text-3xl font-black">€{(bankroll.peakBankroll ?? 0).toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-zinc-500 font-bold uppercase tracking-tighter">
                Drawdown: {(((bankroll.peakBankroll || 1) - (bankroll.currentBankroll ?? 0)) / (bankroll.peakBankroll || 1) * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase text-zinc-500">Daily Risk Used</CardDescription>
              <CardTitle className="text-3xl font-black">€{(bankroll.dayRiskUsed ?? 0).toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-zinc-500 font-bold uppercase tracking-tighter">
                Cap: 5% (€{((bankroll.currentBankroll ?? 0) * 0.05).toFixed(0)})
              </div>
            </CardContent>
          </Card>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-zinc-950 border-zinc-900 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Recent Bets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <BetsTable initialBets={bets} limit={10} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-zinc-950 border-zinc-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Shield className="text-blue-500" size={20} />
                Risk Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-orange-500" />
                    <span className="text-sm font-medium">Consecutive Losses</span>
                  </div>
                  <span className="font-black text-xl">{bankroll.consecutiveLosses ?? 0}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={16} className="text-red-500" />
                    <span className="text-sm font-medium">Drawdown Level</span>
                  </div>
                  <Badge className="bg-green-500/20 text-green-500 border-none font-black uppercase text-[10px]">SAFE</Badge>
                </div>

                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-blue-500" />
                    <span className="text-sm font-medium">Daily Limit Used</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold">€{bankroll.dayRiskUsed ?? 0} / €{((bankroll.currentBankroll ?? 0) * 0.05).toFixed(0)}</div>
                  </div>
                </div>

            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-500">Kelly Configuration</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 font-mono text-zinc-400">
              <div className="flex justify-between"><span>FRACTION</span><span>0.20 (20%)</span></div>
              <div className="flex justify-between"><span>MAX STAKE</span><span>1.5%</span></div>
              <div className="flex justify-between"><span>DAILY CAP</span><span>5.0%</span></div>
              <div className="flex justify-between"><span>EXPOSURE CAP</span><span>8.0%</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
