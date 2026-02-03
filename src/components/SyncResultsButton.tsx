'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SyncResultsButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const toastId = toast.loading('Syncing results...');

    try {
      const res = await fetch('/api/results/sync', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        toast.success(
          `Sync complete! ${data.fixturesUpdated} fixtures updated, ${data.predictionsSettled} predictions settled.`,
          { id: toastId }
        );
      } else {
        toast.error(`Sync failed: ${data.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to sync results', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
    >
      {isSyncing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync Results
        </>
      )}
    </Button>
  );
}
