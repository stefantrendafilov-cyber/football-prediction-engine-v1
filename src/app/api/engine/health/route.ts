import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const { data: oddsCoverage } = await supabase
      .from('odds_averages')
      .select('market, line, count:fixture_id.count()')
      .group('market, line');

    const { data: predictionsCoverage } = await supabase
      .from('predictions')
      .select('market, line, decision, count:fixture_id.count()')
      .group('market, line, decision');

    return NextResponse.json({
      odds_averages_coverage: oddsCoverage,
      predictions_coverage: predictionsCoverage
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
