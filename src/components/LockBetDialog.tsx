'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { FixedStakeResult } from '@/lib/betting/types';

interface LockBetDialogProps {
  prediction: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function LockBetDialog({
  prediction,
  open,
  onOpenChange,
  onSuccess,
}: LockBetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(false);
  const [recommendation, setRecommendation] = useState<FixedStakeResult | null>(null);
  const [actualStake, setActualStake] = useState<string>('');
  const [actualOdds, setActualOdds] = useState<string>('');
  const [step, setStep] = useState<'IDLE' | 'PLACED'>('IDLE');

  const fixture = prediction.fixtures || {};
  const homeTeam = fixture.home_team?.name || 'Home';
  const awayTeam = fixture.away_team?.name || 'Away';

  useEffect(() => {
    if (open) {
      getRecommendation();
      setActualOdds(prediction.avg_odds?.toString() || '2.00');
      setStep('IDLE');
    }
  }, [open, prediction]);

  const getRecommendation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bets/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictionId: prediction.id,
          fixtureId: prediction.fixture_id,
          market: prediction.market,
          selection: prediction.selection,
          line: prediction.line,
          oddsDecimal: prediction.avg_odds || 2.0,
          modelProbability: prediction.model_probability
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRecommendation(data);
        setActualStake(data.stake.toString());
      } else {
        toast.error(data.error || 'Failed to get recommendation');
      }
    } catch (err) {
      toast.error('Network error fetching recommendation');
    } finally {
      setLoading(false);
    }
  };

  const lockBet = async () => {
    const stakeNum = parseFloat(actualStake);
    const oddsNum = parseFloat(actualOdds);

    if (isNaN(stakeNum) || stakeNum <= 0) {
      toast.error('Please enter a valid stake');
      return;
    }

    if (isNaN(oddsNum) || oddsNum < 1.01) {
      toast.error('Please enter valid odds');
      return;
    }

    setLocking(true);
    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: {
            predictionId: prediction.id,
            fixtureId: prediction.fixture_id,
            market: prediction.market,
            selection: prediction.selection,
            line: prediction.line,
            oddsDecimal: oddsNum,
            modelProbability: prediction.model_probability
          },
          customStake: stakeNum,
          customOdds: oddsNum
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Bet locked successfully!');
        setStep('PLACED');
        if (onSuccess) onSuccess();
        setTimeout(() => onOpenChange(false), 2000);
      } else {
        toast.error(data.error || 'Failed to lock bet');
      }
    } catch (err) {
      toast.error('Network error locking bet');
    } finally {
      setLocking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Confirm Your Bet
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Review and confirm your bet details before locking
          </DialogDescription>
        </DialogHeader>

        {step === 'PLACED' ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold">BET LOCKED</h3>
              <p className="text-zinc-400 text-sm">Successfully moved to My Bets</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Game Details */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-zinc-500 uppercase tracking-widest">
                <span>Game Details</span>
                <span className="text-blue-500">{(prediction.model_probability * 100).toFixed(1)}% Confidence</span>
              </div>
              <div className="font-bold text-sm">
                {homeTeam} vs {awayTeam}
              </div>
              <div className="text-xs text-zinc-400">
                {prediction.market} - <span className="text-zinc-50 font-bold">{prediction.selection} {prediction.line}</span>
              </div>
            </div>

            {/* Recommendation */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <Label htmlFor="stake" className="text-xs font-bold uppercase text-zinc-500">
                  Suggested Stake
                </Label>
                {loading ? (
                  <Loader2 size={12} className="animate-spin text-zinc-500 mb-1" />
                ) : recommendation ? (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${recommendation.isReduced ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                    {recommendation.isReduced ? 'REDUCED STAKE' : 'STANDARD STAKE'}
                  </span>
                ) : null}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stake" className="text-[10px] text-zinc-500 uppercase">Actual Stake (€)</Label>
                  <Input
                    id="stake"
                    type="number"
                    step="0.01"
                    value={actualStake}
                    onChange={(e) => setActualStake(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 font-mono font-bold text-blue-400"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odds" className="text-[10px] text-zinc-500 uppercase">Actual Odds</Label>
                  <Input
                    id="odds"
                    type="number"
                    step="0.01"
                    value={actualOdds}
                    onChange={(e) => setActualOdds(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 font-mono font-bold text-zinc-50"
                    placeholder="1.00"
                  />
                </div>
              </div>

              {recommendation && recommendation.isReduced && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 flex gap-3 items-start">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-red-400 leading-relaxed font-medium">
                    Stake is temporarily reduced due to recent losses. Recovery requires 2 wins in next 3 settled bets.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step !== 'PLACED' && (
          <DialogFooter className="gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50 font-bold uppercase tracking-wider text-xs h-11"
              disabled={locking}
            >
              Cancel
            </Button>
            <Button
              onClick={lockBet}
              className={`bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider text-sm h-11 px-8 shadow-[0_0_20px_rgba(37,99,235,0.3)] flex-1 sm:flex-none ${locking || loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={locking || loading}
            >
              {locking ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                'LOCK BET'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
