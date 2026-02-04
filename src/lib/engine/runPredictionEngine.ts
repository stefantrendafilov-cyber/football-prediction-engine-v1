import { supabase } from '../supabase-admin';
import { getUpcomingFixtures, getTeamHistory, getLeagueAvgGoals } from '../clients/sportmonks';
import { computeOddsAveragesForFixture } from '../jobs/computeOddsAverages';
import { syncOddsPointsForFixture } from '../odds/syncOdds';
import { getMatchProbabilities } from '../models/elo';
import { getExpectedGoals, calculateProbabilitiesWithPenalty } from '../models/poisson';
import { adjustProbability } from '../model/probAdjust';
import { ENGINE_RULES, OU_LINES } from '../constants/markets';

async function getProtectedPredictionIds(fixtureIds: number[]): Promise<Set<string>> {
  if (fixtureIds.length === 0) return new Set();

  const { data: predictionsWithBets } = await supabase
    .from('user_bets')
    .select('prediction_id')
    .in('fixture_id', fixtureIds);

  const { data: settledPredictions } = await supabase
    .from('predictions')
    .select('id')
    .in('fixture_id', fixtureIds)
    .eq('decision', 'PUBLISH')
    .not('outcome', 'is', null);

  const protectedIds = new Set<string>();
  
  predictionsWithBets?.forEach(b => {
    if (b.prediction_id) protectedIds.add(b.prediction_id);
  });
  
  settledPredictions?.forEach(p => {
    protectedIds.add(p.id);
  });

  return protectedIds;
}

interface Candidate {
  fixture_id: number;
  kickoff_utc: string;
  market: string;
  line: number | null;
  selection: string;
  model_prob_raw: number;
  model_prob_final: number;
  avg_odds: number;
  implied_prob: number;
  edge: number;
  ev: number;
}

interface Diagnostics {
  fixtures_found: number;
  fixtures_processed: number;
  eligible_candidates: number;
  predictions_published: number;
  predictions_blocked: number;
  blocked_low_prob: number;
  blocked_low_edge: number;
  blocked_low_odds: number;
  blocked_daily_limit: number;
}

export async function runPredictionEngine(cycleId?: string) {
  const startTime = new Date();
  console.log(`--- ENGINE RUN START: ${startTime.toISOString()} (Cycle: ${cycleId}) ---`);

  const diagnostics: Diagnostics = {
    fixtures_found: 0,
    fixtures_processed: 0,
    eligible_candidates: 0,
    predictions_published: 0,
    predictions_blocked: 0,
    blocked_low_prob: 0,
    blocked_low_edge: 0,
    blocked_low_odds: 0,
    blocked_daily_limit: 0,
  };

  const allPublishCandidates: Candidate[] = [];
  const allBlockedRows: any[] = [];

  try {
    let smFixtures = [];
    try {
      smFixtures = await getUpcomingFixtures();
    } catch (err) {
      console.error('Failed to fetch upcoming fixtures from SportMonks:', err);
    }

    const now = new Date();
    const bufferNow = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const seventyTwoHoursFromNow = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    
    let fixturesToProcess = smFixtures
      .filter((f: any) => {
        const kickoff = new Date(f.starting_at);
        return kickoff >= bufferNow && kickoff <= seventyTwoHoursFromNow;
      });

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
          .limit(150);

      if (localFixtures && localFixtures.length > 0) {
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
      fixturesToProcess = fixturesToProcess.slice(0, 150);

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
        const kickoffUtc = fixture.starting_at;
        const homeTeam = fixture.participants?.find((p: any) => p.meta?.location === 'home' || p.id === fixture.home_team_id);
        const awayTeam = fixture.participants?.find((p: any) => p.meta?.location === 'away' || p.id === fixture.away_team_id);

        if (!homeTeam || !awayTeam) {
            console.warn(`Fixture ${fixtureId} missing participants, skipping.`);
            continue;
        }

        diagnostics.fixtures_processed++;

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
          kickoff_at: kickoffUtc,
          status: 'scheduled'
        }, { onConflict: 'id' });

        const [homeHistory, awayHistory] = await Promise.all([
          getTeamHistory(homeTeam.id),
          getTeamHistory(awayTeam.id)
        ]);

        if (homeHistory.length < ENGINE_RULES.HISTORY_MATCHES || awayHistory.length < ENGINE_RULES.HISTORY_MATCHES) {
          const protectedIds = await getProtectedPredictionIds([fixtureId]);
          
          const { data: existingPublish } = await supabase
            .from('predictions')
            .select('id')
            .eq('fixture_id', fixtureId)
            .eq('decision', 'PUBLISH');
          
          const idsToBlock = (existingPublish || [])
            .filter(p => !protectedIds.has(p.id))
            .map(p => p.id);
          
          if (idsToBlock.length > 0) {
            await supabase
              .from('predictions')
              .update({ decision: 'BLOCK', reason: 'REPLACED_BY_NEW_RUN' })
              .in('id', idsToBlock);
          }
            
          await supabase.from('predictions').insert({
              fixture_id: fixtureId,
              market: 'ALL',
              line: null,
              selection: 'N/A',
              model_probability: 0,
              model_prob_raw: 0,
              avg_odds: 0,
              implied_probability: 0,
              decision: 'BLOCK',
              reason: 'INSUFFICIENT_HISTORY',
              cycle_id: cycleId || null
            });
          diagnostics.predictions_blocked++;
          continue;
        }

        await syncOddsPointsForFixture(fixture);
        await computeOddsAveragesForFixture(fixtureId);

        const leagueAvg = await getLeagueAvgGoals(leagueId);
        const leagueAvgPerTeam = leagueAvg / 2;
        
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

        const poisson = calculateProbabilitiesWithPenalty(lambdaHome, lambdaAway, leagueAvgPerTeam);
        
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

        const rawEvaluations: { m: string; l: number | null; s: string; pRaw: number }[] = [
          { m: "1X2", l: null, s: "HOME", pRaw: eloProbs.home },
          { m: "1X2", l: null, s: "DRAW", pRaw: eloProbs.draw },
          { m: "1X2", l: null, s: "AWAY", pRaw: eloProbs.away },
          { m: "BTTS", l: null, s: "YES", pRaw: poisson.btts },
          { m: "BTTS", l: null, s: "NO", pRaw: 1 - poisson.btts },
        ];
        for (const line of OU_LINES) {
          const probOver = line === 1.5 ? poisson.over15 : (line === 2.5 ? poisson.over25 : poisson.over35);
          rawEvaluations.push({ m: "OU", l: line, s: "OVER", pRaw: probOver });
          rawEvaluations.push({ m: "OU", l: line, s: "UNDER", pRaw: 1 - probOver });
        }

        const fixtureEligibleCandidates: Candidate[] = [];

        for (const e of rawEvaluations) {
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
          const impliedProb = avgOdds > 0 ? 1 / avgOdds : 0;
          
          const probFinal = avgOdds > 0 
            ? adjustProbability(e.pRaw, impliedProb, e.m)
            : e.pRaw;
          
          const edge = probFinal - impliedProb;
          const ev = probFinal * avgOdds - 1;

          let blockReason: string | null = null;
          if (avgOdds <= 0) {
            blockReason = 'MISSING_ODDS';
          } else if (avgOdds < ENGINE_RULES.MIN_PUBLISH_ODDS) {
            blockReason = 'LOW_ODDS';
            diagnostics.blocked_low_odds++;
          } else if (probFinal < ENGINE_RULES.PROB_THRESHOLD) {
            blockReason = 'LOW_PROB';
            diagnostics.blocked_low_prob++;
          } else if (edge < ENGINE_RULES.MIN_EDGE) {
            blockReason = 'LOW_EDGE';
            diagnostics.blocked_low_edge++;
          }

            if (blockReason) {
              allBlockedRows.push({
                fixture_id: fixtureId,
                market: e.m,
                line: e.l,
                selection: e.s,
                model_prob_raw: e.pRaw,
                model_probability: probFinal,
                avg_odds: avgOdds,
                implied_probability: impliedProb,
                decision: 'BLOCK',
                reason: blockReason,
                cycle_id: cycleId || null
              });
            diagnostics.predictions_blocked++;
          } else {
            fixtureEligibleCandidates.push({
              fixture_id: fixtureId,
              kickoff_utc: kickoffUtc,
              market: e.m,
              line: e.l,
              selection: e.s,
              model_prob_raw: e.pRaw,
              model_prob_final: probFinal,
              avg_odds: avgOdds,
              implied_prob: impliedProb,
              edge,
              ev
            });
          }
        }

        if (fixtureEligibleCandidates.length > 0) {
          fixtureEligibleCandidates.sort((a, b) => {
            if (Math.abs(b.model_prob_final - a.model_prob_final) > 0.001) {
              return b.model_prob_final - a.model_prob_final;
            }
            return b.avg_odds - a.avg_odds;
          });

          const winner = fixtureEligibleCandidates[0];
          allPublishCandidates.push(winner);
          diagnostics.eligible_candidates++;

            for (let i = 1; i < fixtureEligibleCandidates.length; i++) {
              const c = fixtureEligibleCandidates[i];
              allBlockedRows.push({
                fixture_id: c.fixture_id,
                market: c.market,
                line: c.line,
                selection: c.selection,
                model_prob_raw: c.model_prob_raw,
                model_probability: c.model_prob_final,
                avg_odds: c.avg_odds,
                implied_probability: c.implied_prob,
                decision: 'BLOCK',
                reason: 'BETTER_PICK_EXISTS',
                cycle_id: cycleId || null
              });
              diagnostics.predictions_blocked++;
            }
        }

      } catch (err) {
        console.error(`Fixture ${fixture.id} error:`, err);
      }
    }

    const byDate: Record<string, Candidate[]> = {};
    for (const c of allPublishCandidates) {
      const dateKey = c.kickoff_utc.slice(0, 10);
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(c);
    }

    const finalPublishRows: any[] = [];

    for (const [date, candidates] of Object.entries(byDate)) {
      candidates.sort((a, b) => b.ev - a.ev);
      
      const toPublish = candidates.slice(0, ENGINE_RULES.DAILY_PICK_LIMIT);
      const toBlock = candidates.slice(ENGINE_RULES.DAILY_PICK_LIMIT);

        for (const c of toPublish) {
          finalPublishRows.push({
            fixture_id: c.fixture_id,
            market: c.market,
            line: c.line,
            selection: c.selection,
            model_prob_raw: c.model_prob_raw,
            model_probability: c.model_prob_final,
            avg_odds: c.avg_odds,
            implied_probability: c.implied_prob,
            decision: 'PUBLISH',
            reason: null,
            cycle_id: cycleId || null
          });
          diagnostics.predictions_published++;
        }

        for (const c of toBlock) {
          allBlockedRows.push({
            fixture_id: c.fixture_id,
            market: c.market,
            line: c.line,
            selection: c.selection,
            model_prob_raw: c.model_prob_raw,
            model_probability: c.model_prob_final,
            avg_odds: c.avg_odds,
            implied_probability: c.implied_prob,
            decision: 'BLOCK',
            reason: 'DAILY_LIMIT',
            cycle_id: cycleId || null
          });
          diagnostics.blocked_daily_limit++;
          diagnostics.predictions_blocked++;
        }
    }

    const fixtureIds = Array.from(new Set([
      ...finalPublishRows.map(r => r.fixture_id),
      ...allBlockedRows.map(r => r.fixture_id)
    ]));
    
    if (fixtureIds.length > 0) {
      const protectedIds = await getProtectedPredictionIds(fixtureIds);
      
      const { data: existingPublish } = await supabase
        .from('predictions')
        .select('id')
        .in('fixture_id', fixtureIds)
        .eq('decision', 'PUBLISH');
      
      const idsToBlock = (existingPublish || [])
        .filter(p => !protectedIds.has(p.id))
        .map(p => p.id);
      
      if (idsToBlock.length > 0) {
        await supabase
          .from('predictions')
          .update({ decision: 'BLOCK', reason: 'REPLACED_BY_NEW_RUN' })
          .in('id', idsToBlock);
      }
      
      console.log(`Protected ${protectedIds.size} predictions (have bets or settled). Blocked ${idsToBlock.length} replaceable predictions.`);
    }

    const allRows = [...finalPublishRows, ...allBlockedRows];
    if (allRows.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < allRows.length; i += batchSize) {
        const batch = allRows.slice(i, i + batchSize);
        await supabase.from('predictions').insert(batch);
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
          predictions_blocked: diagnostics.predictions_blocked,
          eligible_candidates: diagnostics.eligible_candidates,
          blocked_low_prob: diagnostics.blocked_low_prob,
          blocked_low_edge: diagnostics.blocked_low_edge,
          blocked_low_odds: diagnostics.blocked_low_odds,
          blocked_daily_limit: diagnostics.blocked_daily_limit
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
