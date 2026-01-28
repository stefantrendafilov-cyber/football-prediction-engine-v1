import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import HistoryClient from '@/components/HistoryClient';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: predictions, error } = await supabase
    .from('predictions')
    .select(`
      *,
      fixtures!inner (
        id,
        kickoff_at,
        home_score,
        away_score,
        status,
        home_team:teams!fixtures_home_team_id_fkey (name),
        away_team:teams!fixtures_away_team_id_fkey (name),
        leagues (name)
      )
    `)
    .eq('decision', 'PUBLISH')
    .not('outcome', 'is', null)
    .order('settled_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('History Query Error:', error);
  }

  const settledPredictions = predictions || [];

  const stats = {
    total: settledPredictions.length,
    won: settledPredictions.filter((p) => p.outcome === 'won').length,
    lost: settledPredictions.filter((p) => p.outcome === 'lost').length,
  };

  const winRate = stats.total > 0 ? ((stats.won / (stats.won + stats.lost)) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-8">
      <HistoryClient 
        initialPredictions={settledPredictions}
        stats={stats}
        winRate={winRate}
      />
    </div>
  );
}
