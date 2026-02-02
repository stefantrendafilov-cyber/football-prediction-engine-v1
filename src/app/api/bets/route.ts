import { NextRequest, NextResponse } from 'next/server';
import { BettingService } from '@/lib/betting/service';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: bets, error } = await supabase
      .from('user_bets')
      .select(`
        *,
        fixtures:fixtures!user_bets_fixture_id_fkey (
          *,
          home_team:teams!fixtures_home_team_id_fkey (name),
          away_team:teams!fixtures_away_team_id_fkey (name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(bets.map(b => BettingService.mapBet(b)));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const candidate = await req.json();
    const bet = await BettingService.placeBet(candidate);
    return NextResponse.json(bet);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
