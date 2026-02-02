'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/card'; // Wait, Button is in ui/button.tsx
import { Button as ShcnButton } from '@/components/ui/button';
import { Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { KellyResult } from '@/lib/betting/types';

interface PlaceBetButtonProps {
  prediction: any;
}

export default function PlaceBetButton({ prediction }: PlaceBetButtonProps) {
  const [loading, setLoading] = useState(false);
  const [kelly, setKelly] = useState<KellyResult | null>(null);
  const [step, setStep] = useState<'IDLE' | 'RECOMMEND' | 'PLACED'>('IDLE');

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
        setKelly(data);
        setStep('RECOMMEND');
      } else {
        toast.error(data.error || 'Failed to get recommendation');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const placeBet = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bets', {
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
        toast.success('Bet placed successfully!');
        setStep('PLACED');
      } else {
        toast.error(data.error || 'Failed to place bet');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'PLACED') {
    return (
      <ShcnButton disabled className="w-full bg-zinc-800 text-zinc-500 font-bold italic uppercase h-9">
        BET PLACED
      </ShcnButton>
    );
  }

  if (step === 'RECOMMEND' && kelly) {
    return (
      <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-2">
        <div className="flex justify-between items-center px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">STAKE</span>
            <span className="text-sm font-black text-blue-400">€{kelly.finalStakeAmount.toFixed(2)}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">KELLY %</span>
            <span className="text-sm font-black text-blue-400">{(kelly.finalStakePct * 100).toFixed(2)}%</span>
          </div>
        </div>
        <div className="flex gap-2">
          <ShcnButton 
            variant="outline" 
            className="flex-1 h-9 border-zinc-800 text-zinc-400" 
            onClick={() => setStep('IDLE')}
            disabled={loading}
          >
            CANCEL
          </ShcnButton>
          <ShcnButton 
            className="flex-1 h-9 bg-blue-600 hover:bg-blue-500 text-white font-black italic uppercase" 
            onClick={placeBet}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'CONFIRM'}
          </ShcnButton>
        </div>
      </div>
    );
  }

  return (
    <ShcnButton 
      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black italic uppercase tracking-wider h-10 group"
      onClick={getRecommendation}
      disabled={loading}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <>
          <Target size={16} className="mr-2 group-hover:scale-110 transition-transform" />
          CALCULATE STAKE
        </>
      )}
    </ShcnButton>
  );
}
