import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BettingService } from '@/lib/betting/service';
import PerformanceAnalytics from '@/components/PerformanceAnalytics';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const analytics = await BettingService.getAnalytics();
  const bankroll = await BettingService.getOrCreateBankroll();

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Performance Analytics</h1>
          <p className="text-zinc-500">In-depth analysis of your betting strategy and outcomes.</p>
        </div>

        <PerformanceAnalytics data={analytics} initialBankroll={bankroll.initialBankroll} />
      </div>
    </div>
  );
}
