import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EngineMonitor from '@/components/EngineMonitor';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect('/login');
    }

    const { data: latestCycle } = await supabase
      .from('engine_cycles')
      .select('*')
      .lte('started_at_utc', new Date().toISOString())
      .order('started_at_utc', { ascending: false })
      .limit(1)
      .single();

    let predictions: any[] = [];
    
    if (latestCycle?.id) {
      const now = new Date();
      const bufferNow = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
      const seventyTwoHoursFromNow = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

      const { data: rawPredictions, error } = await supabase
        .from('predictions')
        .select(`
          *,
          fixtures!inner (
            kickoff_at,
            home_team:teams!fixtures_home_team_id_fkey (name),
            away_team:teams!fixtures_away_team_id_fkey (name),
            leagues (name)
          )
        `)
        .eq('decision', 'PUBLISH')
        .eq('cycle_id', latestCycle.id)
        .gte('fixtures.kickoff_at', bufferNow)
        .lte('fixtures.kickoff_at', seventyTwoHoursFromNow)
        .order('kickoff_at', { foreignTable: 'fixtures', ascending: true })
        .limit(200);

      if (error) {
        console.error('Dashboard Query Error:', error);
      }

      predictions = rawPredictions || [];
    }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-8">
      <EngineMonitor 
        initialPredictions={predictions} 
        initialLatestCycle={latestCycle} 
      />
    </div>
  );
}
