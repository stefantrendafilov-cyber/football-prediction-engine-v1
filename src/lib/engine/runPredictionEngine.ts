import { supabase } from '../supabase-admin';
import { getUpcomingFixtures, getTeamHistory, getLeagueAvgGoals } from '../clients/sportmonks';
import { computeOddsAveragesForFixture } from '../jobs/computeOddsAverages';
import { syncOddsPointsForFixture } from '../odds/syncOdds';
import { getMatchProbabilities } from '../models/elo';
import { getExpectedGoals, calculateProbabilities } from '../models/poisson';
import { ENGINE_RULES, OU_LINES } from '../constants/markets';

// Constants
const MIN_PUBLISH_ODDS = 1.5;

export async function runPredictionEngine(cycleId?: string) {
  const startTime = new Date();
  console.log(`--- ENGINE RUN START: ${startTime.toISOString()} (Cycle: ${cycleId}) ---`);

  const diagnostics = {
    fixtures_found: 0,
    fixtures_processed: 0,
    predictions_published: 0,
    predictions_blocked: 0,
  };

  try {
    // 1. Get upcoming fixtures from SportMonks
    let smFixtures = [];
    try {
      smFixtures = await getUpcomingFixtures();
    } catch (err) {
      console.error('Failed to fetch upcoming fixtures from SportMonks:', err);
    }

    const now = new Date();
    // Use a 2-hour buffer to catch games that just started
    const bufferNow = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const seventyTwoHoursFromNow = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    
    // Filter SM fixtures
    let fixturesToProcess = smFixtures
      .filter((f: any) => {
        const kickoff = new Date(f.starting_at);
        return kickoff >= bufferNow && kickoff <= seventyTwoHoursFromNow;
      });

    // 2. FALLBACK: If SportMonks returned nothing, fetch from LOCAL DB
    if (fixturesToProcess.length === 0) {
      console.log('SportMonks returned 0 upcoming fixtures. Falling back to local database...');
      const { data: localFixtures } = await supabase
        .from('fixtures')
        .select(`
          *,
          participants:teams!inner (id, name)
        `)
        .eq('status', 'scheduled')
        .gte('kickoff_at', bufferNow.toISOString())
        .lte('kickoff_at', seventyTwoHoursFromNow.toISOString())
        .limit(100);

      if (localFixtures && localFixtures.length > 0) {
        // Map local fixtures to SM format for the loop
        fixturesToProcess = localFixtures.map(f => ({
          id: f.id,
          league_id: f.league_id,
          starting_at: f.kickoff_at,
          participants: [
            { id: f.home_team_id, name: 'Home Team', meta: { location: 'home' } },
            { id: f.away_team_id, name: 'Away Team', meta: { location: 'away' } }
          ]
        }));
        console.log(`Found ${fixturesToProcess.length} fixtures in local database.`);
      }
    }

    diagnostics.fixtures_found = fixturesToProcess.length;
    
    // Limit to 100 fixtures per run to prevent timeouts
    fixturesToProcess = fixturesToProcess.slice(0, 100);

    if (cycleId) {
      await supabase
        .from('engine_cycles')
        .update({ fixtures_found: diagnostics.fixtures_found })
        .eq('id', cycleId);
    }

    if (fixturesToProcess.length === 0) {
      console.log('No fixtures found to process in the next 72 hours.');
    }

    for (const fixture of fixturesToProcess) {
      try {
        const fixtureId = fixture.id;
        const leagueId = fixture.league_id;
        const homeTeam = fixture.participants?.find((p: any) => p.meta?.location === 'home' || p.id === fixture.home_team_id);
        const awayTeam = fixture.participants?.find((p: any) => p.meta?.location === 'away' || p.id === fixture.away_team_id);

        if (!homeTeam || !awayTeam) {
            console.warn(`Fixture ${fixtureId} missing participants, skipping.`);
            continue;
        }

        diagnostics.fixtures_processed++;

        // Upsert Teams & Fixture (ensure we have them in DB)
        if (homeTeam.name !== 'Home Team') {
            await supabase.from('teams').upsert([{ id: homeTeam.id, name: homeTeam.name }, { id: awayTeam.id, name: awayTeam.name }], { onConflict: 'id' });
        }
        
        if (fixture.league?.id && fixture.league?.name) {
          await supabase.from('leagues').upsert({ id: fixture.league.id, name: fixture.league.name }, { onConflict: 'id' });
        }
        
        await supabase.from('fixtures').upsert({
          id: fixtureId,
          league_id: leagueId,
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          kickoff_at: fixture.starting_at,
          status: 'scheduled'
        }, { onConflict: 'id' });

        // History
        const [homeHistory, awayHistory] = await Promise.all([
          getTeamHistory(homeTeam.id),
          getTeamHistory(awayTeam.id)
        ]);

        if (homeHistory.length < ENGINE_RULES.HISTORY_MATCHES || awayHistory.length < ENGINE_RULES.HISTORY_MATCHES) {
          await supabase
            .from('predictions')
            .update({ decision: 'BLOCK', reason: 'REPLACED_BY_NEW_RUN' })
            .eq('fixture_id', fixtureId)
            .eq('decision', 'PUBLISH');
            
          await supabase.from('predictions').insert({
            fixture_id: fixtureId,
            market: 'ALL',
            line: null,
            selection: 'N/A',
            model_probability: 0,
            avg_odds: 0,
            implied_probability: 0,
            decision: 'BLOCK',
            reason: 'INSUFFICIENT_HISTORY'
          });
          diagnostics.predictions_blocked++;
          continue;
        }

        // Odds Ingestion
        await syncOddsPointsForFixture(fixture);
        await computeOddsAveragesForFixture(fixtureId);

        // Models
        const leagueAvg = await getLeagueAvgGoals(leagueId);
        const getStats = (hist: any[], tId: number) => {
          const recent = hist.slice(0, 10);
          let s = 0, c = 0;
          recent.forEach(h => {
            const hHome = h.participants?.find((p: any) => p.meta?.location === 'home');
            const hG = h.scores?.find((s: any) => s.description === 'CURRENT' && s.score.participant === 'home')?.score?.goals ?? 0;
            const aG = h.scores?.find((s: any) => s.description === 'CURRENT' && s.score.participant === 'away')?.score?.goals ?? 0;
            const isH = hHome?.id === tId;
            s += isH ? hG : aG;
            c += isH ? aG : hG;
          });
          return { scored: s / recent.length, conceded: c / recent.length };
        };

        const hStats = getStats(homeHistory, homeTeam.id);
        const aStats = getStats(awayHistory, awayTeam.id);

        const { lambdaHome, lambdaAway } = getExpectedGoals(
          leagueAvg,
          hStats.scored / (leagueAvg / 2 || 1),
          aStats.conceded / (leagueAvg / 2 || 1),
          aStats.scored / (leagueAvg / 2 || 1),
          hStats.conceded / (leagueAvg / 2 || 1)
        );

        const poisson = calculateProbabilities(lambdaHome, lambdaAway);
        
        const getElo = (hist: any[], tId: number) => {
          let elo = 1500;
          hist.slice(0, 10).forEach(h => {
            const hHome = h.participants?.find((p: any) => p.meta?.location === 'home');
            const hG = h.scores?.find((s: any) => s.description === 'CURRENT' && s.score.participant === 'home')?.score?.goals ?? 0;
            const aG = h.scores?.find((s: any) => s.description === 'CURRENT' && s.score.participant === 'away')?.score?.goals ?? 0;
            const isH = hHome?.id === tId;
            if ((isH && hG > aG) || (!isH && aG > hG)) elo += 20;
            else if (hG === aG) elo += 5;
            else elo -= 15;
          });
          return elo;
        };
        const eloProbs = getMatchProbabilities(getElo(homeHistory, homeTeam.id), getElo(awayHistory, awayTeam.id), 0.25);

        const evaluations: any[] = [
          { m: "1X2", l: null, s: "HOME", p: eloProbs.home },
          { m: "1X2", l: null, s: "DRAW", p: eloProbs.draw },
          { m: "1X2", l: null, s: "AWAY", p: eloProbs.away },
          { m: "BTTS", l: null, s: "YES", p: poisson.btts },
          { m: "BTTS", l: null, s: "NO", p: 1 - poisson.btts },
        ];
        for (const line of OU_LINES) {
          const probOver = line === 1.5 ? poisson.over15 : (line === 2.5 ? poisson.over25 : poisson.over35);
          evaluations.push({ m: "OU", l: line, s: "OVER", p: probOver });
          evaluations.push({ m: "OU", l: line, s: "UNDER", p: 1 - probOver });
        }

        const eligibleCandidates: any[] = [];
        const evaluatedRows: any[] = [];

        for (const e of evaluations) {
          let query = supabase.from('odds_averages')
            .select('avg_odds, source, computed_at_utc')
            .eq('fixture_id', fixtureId)
            .eq('market', e.m)
            .eq('selection', e.s);
          
          if (e.l === null) query = query.is('line', null);
          else query = query.eq('line', e.l);

          const { data: avgRows } = await query
            .order('computed_at_utc', { ascending: false })
            .limit(10);

          const bestRow = avgRows?.sort((a: any, b: any) => {
            return new Date(b.computed_at_utc).getTime() - new Date(a.computed_at_utc).getTime();
          })[0];

          const avgOdds = bestRow?.avg_odds || 0;
          let reason: string | null = null;
          if (avgOdds <= 0) reason = 'MISSING_ODDS';
          else if (avgOdds < MIN_PUBLISH_ODDS) reason = 'LOW_ODDS';
          else if (e.p < ENGINE_RULES.PROB_THRESHOLD) reason = 'LOW_PROB';

          if (reason) {
            evaluatedRows.push({
              fixture_id: fixtureId, market: e.m, line: e.l, selection: e.s,
              model_probability: e.p, avg_odds: avgOdds, implied_probability: avgOdds > 0 ? 1 / avgOdds : 0,
              decision: 'BLOCK', reason: reason
            });
          } else {
            eligibleCandidates.push({ ...e, avgOdds });
          }
        }

        if (eligibleCandidates.length > 0) {
          eligibleCandidates.sort((a, b) => {
            if (Math.abs(b.p - a.p) > 0.001) return b.p - a.p;
            return b.avgOdds - a.avgOdds;
          });

          const winner = eligibleCandidates[0];
          evaluatedRows.push({
            fixture_id: fixtureId, market: winner.m, line: winner.l, selection: winner.s,
            model_probability: winner.p, avg_odds: winner.avgOdds, implied_probability: winner.avgOdds > 0 ? 1 / winner.avgOdds : 0,
            decision: 'PUBLISH', reason: null
          });
          diagnostics.predictions_published++;

          for (let i = 1; i < eligibleCandidates.length; i++) {
            const c = eligibleCandidates[i];
            evaluatedRows.push({
              fixture_id: fixtureId, market: c.m, line: c.l, selection: c.s,
              model_probability: c.p, avg_odds: c.avgOdds, implied_probability: c.avgOdds > 0 ? 1 / c.avgOdds : 0,
              decision: 'BLOCK', reason: 'BETTER_PICK_EXISTS'
            });
            diagnostics.predictions_blocked++;
          }
        } else {
          diagnostics.predictions_blocked += evaluatedRows.length;
        }

        if (evaluatedRows.length > 0) {
          await supabase
            .from('predictions')
            .update({ decision: 'BLOCK', reason: 'REPLACED_BY_NEW_RUN' })
            .eq('fixture_id', fixtureId)
            .eq('decision', 'PUBLISH');

          await supabase.from('predictions').insert(evaluatedRows);
        }

      } catch (err) {
        console.error(`Fixture ${fixture.id} error:`, err);
      }
    }

    if (cycleId) {
      await supabase
        .from('engine_cycles')
        .update({
          status: 'SUCCESS',
          finished_at_utc: new Date().toISOString(),
          fixtures_processed: diagnostics.fixtures_processed,
          predictions_published: diagnostics.predictions_published,
          predictions_blocked: diagnostics.predictions_blocked
        })
        .eq('id', cycleId);
    }

  } catch (err: any) {
    console.error('Engine core error:', err);
    if (cycleId) {
      await supabase
        .from('engine_cycles')
        .update({
          status: 'FAILED',
          finished_at_utc: new Date().toISOString(),
          error: err.message
        })
        .eq('id', cycleId);
    }
    throw err;
  }

  console.log(`--- ENGINE RUN COMPLETE (Cycle: ${cycleId}) ---`);
  console.log('DIAGNOSTICS:', JSON.stringify(diagnostics, null, 2));
}
