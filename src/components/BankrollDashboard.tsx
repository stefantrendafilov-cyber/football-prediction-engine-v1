'use client';

import { useState, useEffect } from 'react';
import BetsTable from './BetsTable';
import { TrendingUp, TrendingDown, Shield, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bankroll, PlacedBet } from '@/lib/betting/types';
import { BASE_PCT, REDUCED_MULTIPLIER } from '@/lib/betting/fixed-stake';

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
      
      if (!brRes.ok) throw new Error(`Bankroll API error: ${brRes.status}`);
      if (!betsRes.ok) throw new Error(`Bets API error: ${betsRes.status}`);

      const brData = await brRes.json();
      const betsData = await betsRes.json();

      setBankroll(brData);
      setBets(Array.isArray(betsData) ? betsData : []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) return <div className="p-8 text-center">Loading bankroll data...</div>;
  if (!bankroll) return <div className="p-8 text-center text-red-500">Error: Could not load bankroll.</div>;

  const profit = bankroll.currentBankroll - bankroll.initialBankroll;
  const profitPct = (profit / bankroll.initialBankroll) * 100;

  // Calculate status using robust state tracking
  const getSystemStatus = () => {
    if (!bankroll) return { isReduced: false, currentPct: BASE_PCT, winsLast3: 0 };
    
    const results = (bankroll.last50Results || []).filter(r => r !== 'VOID');
    let currentState: 'STANDARD' | 'REDUCED' = 'STANDARD';
    let currentStreak = 0;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r === 'LOSS' || r === 'LOST') {
        currentStreak++;
      } else if (r === 'WIN' || r === 'WON') {
        currentStreak = 0;
      }

      if (currentStreak >= 3) {
        currentState = 'REDUCED';
      }

      if (currentState === 'REDUCED') {
        const window = results.slice(Math.max(0, i - 2), i + 1);
        const winsInWindow = window.filter(w => w === 'WIN' || w === 'WON').length;
        if (winsInWindow >= 2) {
          currentState = 'STANDARD';
        }
      }
    }

    const last3Results = results.slice(-3);
    const winsLast3 = last3Results.filter(w => w === 'WIN' || w === 'WON').length;

    return {
      isReduced: currentState === 'REDUCED',
      currentPct: currentState === 'REDUCED' ? BASE_PCT * REDUCED_MULTIPLIER : BASE_PCT,
      winsLast3
    };
  };

  const { isReduced, currentPct, winsLast3 } = getSystemStatus();

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Bankroll</h1>
          <p className="text-zinc-500 text-sm">Track your betting balance and stake management</p>
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

          <Card className={`bg-zinc-950 border-zinc-900 relative overflow-hidden group`}>
            {isReduced && <div className="absolute inset-0 bg-red-500/5 animate-pulse" />}
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase text-zinc-500">Current Risk</CardDescription>
              <CardTitle className={`text-3xl font-black ${isReduced ? 'text-red-500' : 'text-blue-500'}`}>
                {(currentPct * 100).toFixed(2)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-sm font-bold uppercase ${isReduced ? 'text-red-400' : 'text-zinc-500'}`}>
                {isReduced ? 'REDUCED MODE' : 'STANDARD MODE'}
              </div>
            </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-zinc-950 border-zinc-900 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight">Recent Bets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <BetsTable initialBets={bets} limit={10} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-zinc-950 border-zinc-900">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2 tracking-tight">
                <Shield className="text-blue-500" size={20} />
                Win/Loss Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className={bankroll.consecutiveLosses >= 3 ? 'text-red-500' : 'text-zinc-500'} />
                    <span className="text-sm font-medium">Consecutive Losses</span>
                  </div>
                  <span className={`font-black text-xl ${bankroll.consecutiveLosses >= 3 ? 'text-red-500' : ''}`}>
                    {bankroll.consecutiveLosses ?? 0}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className={winsLast3 >= 2 ? 'text-green-500' : 'text-zinc-500'} />
                    <span className="text-sm font-medium">Recovery Progress</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-xl">{winsLast3}</span>
                    <span className="text-xs text-zinc-500 ml-1">/ 2 wins</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-blue-500" />
                    <span className="text-sm font-medium">Daily Risk Used</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-zinc-400">€{bankroll.dayRiskUsed ?? 0}</div>
                  </div>
                </div>

            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900 overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${isReduced ? 'from-red-600 to-orange-600' : 'from-blue-600 to-cyan-600'}`} />
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-500">Smart Stake Settings</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 font-mono text-zinc-400">
              <div className="flex justify-between"><span>Standard stake</span><span>1.5%</span></div>
              <div className="flex justify-between"><span>Reduced stake</span><span>0.75%</span></div>
              <div className="flex justify-between"><span>Auto-reduce after</span><span>3 losses</span></div>
              <div className="flex justify-between"><span>Restore after</span><span>2/3 wins</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
