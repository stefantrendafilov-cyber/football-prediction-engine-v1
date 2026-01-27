import { supabase } from '../supabase';
import { MARKETS, ENGINE_RULES, OU_LINES } from '../constants/markets';
import { calculateAverageOdds } from '../odds/normalizeOdds';

export async function computeOddsAveragesForFixture(fixtureId: number) {
  const windowStart = new Date(Date.now() - ENGINE_RULES.AVG_ODDS_WINDOW_HOURS * 3600000).toISOString();
  const BIG_5_BOOKMAKERS = [2, 5, 9, 20, 29]; // bet365, 888Sport, Betfair, Pinnacle, William Hill
  
  const { data: recentPoints, error } = await supabase.from('odds_points')
    .select('*')
    .eq('fixture_id', fixtureId)
    .in('bookmaker_id', BIG_5_BOOKMAKERS)
    .gte('ts_utc', windowStart);

  if (error || !recentPoints || recentPoints.length === 0) return null;

  const averages = [];
  const windowEnd = new Date().toISOString();

  const marketConfigs = [
    { name: MARKETS.ONE_X_TWO, line: null, selections: ["HOME", "DRAW", "AWAY"] },
    { name: MARKETS.BTTS, line: null, selections: ["YES", "NO"] },
    ...OU_LINES.map(line => ({ name: MARKETS.OU, line, selections: ["OVER", "UNDER"] }))
  ];

  for (const m of marketConfigs) {
    const sourceToUse = 'sportmonks';
    const sourcePoints = recentPoints.filter(p => p.market === m.name && p.line === m.line && p.source === 'sportmonks');
    
    const marketAverages = [];
    let allSelectionsValid = true;

    for (const selection of m.selections) {
      const selectionPoints = sourcePoints.filter(p => p.selection === selection);
      
      if (selectionPoints.length < 1) {
        allSelectionsValid = false;
        break;
      }

      // To ensure one vote per bookmaker, take the latest point for each bookmaker
      const latestByBookmaker: Record<number, number> = {};
      for (const p of selectionPoints) {
        const bid = Number(p.bookmaker_id);
        if (!latestByBookmaker[bid] || new Date(p.ts_utc) > new Date((selectionPoints.find(sp => Number(sp.bookmaker_id) === bid && sp.odds_decimal === latestByBookmaker[bid])?.ts_utc || 0))) {
            latestByBookmaker[bid] = p.odds_decimal;
        }
      }

      const bookmakerOdds = Object.values(latestByBookmaker);
      const avg = calculateAverageOdds(bookmakerOdds);
      
      if (avg && avg > 0) {
        marketAverages.push({
          fixture_id: fixtureId,
          market: m.name,
          line: m.line,
          selection,
          avg_odds: avg,
          count_points: bookmakerOdds.length, // Now represents count of bookmakers
          window_end_utc: windowEnd,
          source: sourceToUse
        });
      } else {
        allSelectionsValid = false;
        break;
      }
    }

    if (allSelectionsValid && marketAverages.length === m.selections.length) {
      averages.push(...marketAverages);
    }
  }

  if (averages.length > 0) {
    await supabase.from('odds_averages').upsert(averages, { 
      onConflict: 'fixture_id,market,line,selection,source,window_end_utc' 
    });
  }

  return averages;
}
