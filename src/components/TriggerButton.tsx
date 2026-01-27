'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Play } from 'lucide-react';

export default function TriggerButton() {
  const [loading, setLoading] = useState(false);

  const handleTrigger = async () => {
    if (loading) return;
    
    setLoading(true);
    const toastId = toast.loading('Triggering prediction engine...');

    try {
      const res = await fetch('/api/engine');
      const data = await res.json();

      if (data.success) {
        toast.success('Engine run completed!', { id: toastId });
        // Refresh the page to show new predictions
        window.location.reload();
      } else {
        toast.error(`Engine error: ${data.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to trigger engine', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleTrigger}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-lg text-sm font-medium transition-all transform active:scale-95 ${loading ? 'cursor-not-allowed' : ''}`}
    >
      <Play className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
      {loading ? 'Analyzing...' : 'Trigger Engine'}
    </button>
  );
}
