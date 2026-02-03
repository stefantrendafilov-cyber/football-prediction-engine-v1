'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import LockBetDialog from './LockBetDialog';

interface PlaceBetButtonProps {
  prediction: any;
}

export default function PlaceBetButton({ prediction }: PlaceBetButtonProps) {
  const [open, setOpen] = useState(false);
  const [placed, setPlaced] = useState(false);

  if (placed) {
    return (
      <Button disabled className="w-full bg-zinc-800 text-zinc-500 font-bold uppercase h-10 border border-zinc-700">
        <Lock size={16} className="mr-2 opacity-50" />
        BET LOCKED
      </Button>
    );
  }

    return (
      <>
        <Button 
          className="cursor-pointer w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider h-10 group shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all"
          onClick={() => setOpen(true)}
        >
          LOCK BET
        </Button>

      <LockBetDialog 
        prediction={prediction} 
        open={open} 
        onOpenChange={setOpen}
        onSuccess={() => setPlaced(true)}
      />
    </>
  );
}
