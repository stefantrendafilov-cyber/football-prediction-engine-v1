import { supabase } from '@/lib/supabase-admin';
import { getFixturesByIds } from '@/lib/clients/sportmonks';
import { BettingService } from '@/lib/betting/service';
import { BetResult } from '@/lib/betting/types';

interface SyncResult {
  fixturesUpdated: number;
  predictionsSettled: number;
  errors: string[];
}

function extractScores(fixture: any): { home: number | null; away: number | null } {
  const scores = fixture.scores || [];
  
  // Try to find TOTAL or CURRENT score, fallback to any available score
  const homeScore = scores.find(
    (s: any) => s.score?.participant === 'home' && (s.description === 'TOTAL' || s.description === 'CURRENT')
  ) || scores.find((s: any) => s.score?.participant === 'home');

  const awayScore = scores.find(
    (s: any) => s.score?.participant === 'away' && (s.description === 'TOTAL' || s.description === 'CURRENT')
  ) || scores.find((s: any) => s.score?.participant === 'away');

  return {
    home: homeScore?.score?.goals ?? null,
    away: awayScore?.score?.goals ?? null,
  };
}

function isFinishedState(fixture: any): boolean {
  // SportMonks v3 finished states: 5 (Ended), 7 (AET), 8 (Penalties)
  const finishedStates = [5, 7, 8];
  const stateId = fixture.state_id || fixture.state?.id;
  return finishedStates.includes(stateId);
}

function settlePrediction(
  market: string,
  selection: string,
  line: number | null,
  homeScore: number,
  awayScore: number
): 'won' | 'lost' | 'push' {
  const totalGoals = homeScore + awayScore;
  const bttsResult = homeScore > 0 && awayScore > 0;

  switch (market) {
    case '1X2':
      if (selection === 'HOME' && homeScore > awayScore) return 'won';
      if (selection === 'DRAW' && homeScore === awayScore) return 'won';
      if (selection === 'AWAY' && awayScore > homeScore) return 'won';
      return 'lost';

    case 'BTTS':
      if (selection === 'YES' && bttsResult) return 'won';
      if (selection === 'NO' && !bttsResult) return 'won';
      return 'lost';

    case 'OU':
      if (line === null) return 'lost';
      if (totalGoals === line) return 'push';
      if (selection === 'OVER' && totalGoals > line) return 'won';
      if (selection === 'UNDER' && totalGoals < line) return 'won';
      return 'lost';

    default:
      return 'lost';
  }
}

export async function syncResults(): Promise<SyncResult> {
  const result: SyncResult = {
    fixturesUpdated: 0,
    predictionsSettled: 0,
    errors: [],
  };

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // 1. Fetch unsettled predictions that are PUBLISH
  const { data: publishPredictions, error: fetchError } = await supabase
    .from('predictions')
    .select(`
      id, fixture_id, market, selection, line,
      fixtures!inner (id, kickoff_at, status, home_score, away_score)
    `)
    .eq('decision', 'PUBLISH')
    .is('outcome', null)
    .lt('fixtures.kickoff_at', twoHoursAgo);

  // 2. Fetch predictions that have OPEN bets (regardless of decision or time)
  const { data: openBetPredictions, error: betFetchError } = await supabase
    .from('user_bets')
    .select(`
      prediction_id,
      predictions!inner (
        id, fixture_id, market, selection, line, outcome,
        fixtures!inner (id, kickoff_at, status, home_score, away_score)
      )
    `)
    .eq('status', 'OPEN');

  const allPredictionsToProcess = new Map<string, any>();

  if (publishPredictions) {
    for (const p of publishPredictions) allPredictionsToProcess.set(p.id, p);
  }

  if (openBetPredictions) {
    for (const obp of openBetPredictions) {
      const p = obp.predictions as any;
      if (p && !p.outcome) {
        allPredictionsToProcess.set(p.id, p);
      }
    }
  }

  if (allPredictionsToProcess.size === 0) {
    console.log('No unsettled predictions or predictions with open bets found');
    return result;
  }

  const predictions = Array.from(allPredictionsToProcess.values());
  const fixtureIds = [...new Set(predictions.map((p: any) => p.fixture_id))] as number[];

  console.log(`Processing ${predictions.length} predictions across ${fixtureIds.length} fixtures`);

  // Fetch SportMonks data
  let apiFixtures: any[] = [];
  const BATCH_SIZE = 50;
  for (let i = 0; i < fixtureIds.length; i += BATCH_SIZE) {
    const batch = fixtureIds.slice(i, i + BATCH_SIZE);
    try {
      const batchResults = await getFixturesByIds(batch);
      apiFixtures.push(...batchResults);
    } catch (err: any) {
      result.errors.push(`SportMonks API error: ${err.message}`);
    }
  }

  const fixtureMap = new Map<number, any>();
  for (const f of apiFixtures) {
    fixtureMap.set(f.id, f);
    if (isFinishedState(f)) {
      const { home, away } = extractScores(f);
      if (home !== null && away !== null) {
        await supabase.from('fixtures').update({ home_score: home, away_score: away, status: 'finished' }).eq('id', f.id);
        result.fixturesUpdated++;
      }
    }
  }

  for (const prediction of predictions) {
    const apiFixture = fixtureMap.get(prediction.fixture_id);
    if (!apiFixture || !isFinishedState(apiFixture)) continue;

    const { home, away } = extractScores(apiFixture);
    if (home === null || away === null) continue;

    const outcome = settlePrediction(prediction.market, prediction.selection, prediction.line, home, away);
    
    await supabase.from('predictions').update({ outcome, settled_at: new Date().toISOString() }).eq('id', prediction.id);

    // Settle associated bets
    const { data: openBets } = await supabase.from('user_bets').select('id').eq('prediction_id', prediction.id).eq('status', 'OPEN');
    if (openBets) {
      for (const bet of openBets) {
        const betResult: BetResult = outcome === 'won' ? 'WIN' : outcome === 'lost' ? 'LOSS' : 'VOID';
        try {
          await BettingService.settleBet(bet.id, betResult, supabase);
          console.log(`Settled bet ${bet.id} as ${betResult}`);
        } catch (err: any) {
          result.errors.push(`Failed to settle bet ${bet.id}: ${err.message}`);
        }
      }
    }
    result.predictionsSettled++;
  }

  // Final catch-all for stuck bets (prediction settled but bet open)
  const { data: stuckBets } = await supabase.from('user_bets').select('id, predictions!inner(outcome)').eq('status', 'OPEN').not('predictions.outcome', 'is', null);
  if (stuckBets) {
    for (const bet of stuckBets) {
      const outcome = (bet.predictions as any)?.outcome;
      const betResult: BetResult = outcome === 'won' ? 'WIN' : outcome === 'lost' ? 'LOSS' : 'VOID';
      await BettingService.settleBet(bet.id, betResult, supabase);
    }
  }

  return result;
}
