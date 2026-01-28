import { supabase } from '@/lib/supabase-admin';
import { getFixturesByIds } from '@/lib/clients/sportmonks';

interface SyncResult {
  fixturesUpdated: number;
  predictionsSettled: number;
  errors: string[];
}

function extractScores(fixture: any): { home: number | null; away: number | null } {
  const scores = fixture.scores || [];
  
  const homeScore = scores.find(
    (s: any) => s.score?.participant === 'home' && s.description === 'CURRENT'
  );
  const awayScore = scores.find(
    (s: any) => s.score?.participant === 'away' && s.description === 'CURRENT'
  );

  return {
    home: homeScore?.score?.goals ?? null,
    away: awayScore?.score?.goals ?? null,
  };
}

function isFinishedState(fixture: any): boolean {
  const finishedStates = [5, 7, 8];
  return finishedStates.includes(fixture.state_id);
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

  const { data: unsettledPredictions, error: fetchError } = await supabase
    .from('predictions')
    .select(`
      id,
      fixture_id,
      market,
      selection,
      line,
      fixtures!inner (
        id,
        kickoff_at,
        status,
        home_score,
        away_score
      )
    `)
    .eq('decision', 'PUBLISH')
    .is('outcome', null)
    .lt('fixtures.kickoff_at', twoHoursAgo);

  if (fetchError) {
    result.errors.push(`Failed to fetch predictions: ${fetchError.message}`);
    return result;
  }

  if (!unsettledPredictions || unsettledPredictions.length === 0) {
    console.log('No unsettled predictions found');
    return result;
  }

  console.log(`Found ${unsettledPredictions.length} unsettled predictions to process`);

  const fixtureIds = [...new Set(unsettledPredictions.map((p: any) => p.fixture_id))] as number[];
  console.log(`Fetching results for ${fixtureIds.length} fixtures from SportMonks`);

  let apiFixtures: any[] = [];
  const BATCH_SIZE = 50;
  
  for (let i = 0; i < fixtureIds.length; i += BATCH_SIZE) {
    const batch = fixtureIds.slice(i, i + BATCH_SIZE);
    try {
      const batchResults = await getFixturesByIds(batch);
      apiFixtures.push(...batchResults);
    } catch (err: any) {
      result.errors.push(`SportMonks API error (batch ${i / BATCH_SIZE + 1}): ${err.message}`);
    }
  }

  const fixtureMap = new Map<number, any>();
  for (const f of apiFixtures) {
    fixtureMap.set(f.id, f);
  }

  for (const apiFixture of apiFixtures) {
    if (!isFinishedState(apiFixture)) {
      console.log(`Fixture ${apiFixture.id} not finished (state_id: ${apiFixture.state_id})`);
      continue;
    }

    const { home, away } = extractScores(apiFixture);
    if (home === null || away === null) {
      console.log(`Fixture ${apiFixture.id} missing scores`);
      continue;
    }

    const { error: updateError } = await supabase
      .from('fixtures')
      .update({
        home_score: home,
        away_score: away,
        status: 'finished',
      })
      .eq('id', apiFixture.id);

    if (updateError) {
      result.errors.push(`Failed to update fixture ${apiFixture.id}: ${updateError.message}`);
      continue;
    }

    result.fixturesUpdated++;
  }

  for (const prediction of unsettledPredictions) {
    const apiFixture = fixtureMap.get(prediction.fixture_id);
    
    if (!apiFixture || !isFinishedState(apiFixture)) {
      continue;
    }

    const { home, away } = extractScores(apiFixture);
    if (home === null || away === null) {
      continue;
    }

    const outcome = settlePrediction(
      prediction.market,
      prediction.selection,
      prediction.line,
      home,
      away
    );

    const { error: settleError } = await supabase
      .from('predictions')
      .update({
        outcome,
        settled_at: new Date().toISOString(),
      })
      .eq('id', prediction.id);

    if (settleError) {
      result.errors.push(`Failed to settle prediction ${prediction.id}: ${settleError.message}`);
      continue;
    }

    console.log(
      `Settled prediction ${prediction.id}: ${prediction.market} ${prediction.selection} ` +
      `(line: ${prediction.line}) => ${outcome} (Score: ${home}-${away})`
    );
    result.predictionsSettled++;
  }

  return result;
}
