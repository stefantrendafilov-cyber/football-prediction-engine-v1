import { supabase } from '../supabase';
import { getSportMonksOddsForFixtures } from '../clients/sportmonksOdds';
import { getUpcomingFixtures } from '../clients/sportmonks';

/**
 * Syncs odds for all fixtures in the next 72 hours.
 */
export async function syncOddsPoints72h() {
  const fixtures = await getUpcomingFixtures();
  console.log(`Syncing odds for ${fixtures.length} upcoming fixtures...`);
  
  for (const fixture of fixtures) {
    await syncOddsPointsForFixture(fixture);
  }
}

/**
 * De-duplicates points to prevent "ON CONFLICT DO UPDATE command cannot affect row a second time"
 */
function deduplicatePoints(points: any[]): any[] {
  const seen = new Set();
  return points.filter(p => {
    // Ensure bookmaker_id is treated as part of the key even if null/undefined
    const bid = p.bookmaker_id ?? 'null';
    const key = `${p.fixture_id}-${p.market}-${p.line}-${p.selection}-${p.source}-${p.ts_utc}-${bid}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Syncs Sportmonks odds for a specific fixture.
 */
export async function syncOddsPointsForFixture(fixture: any) {
  const fixtureId = fixture.id;

  try {
    const smPoints = await getSportMonksOddsForFixtures([fixtureId]);
    
    if (smPoints.length > 0) {
      const uniqueSmPoints = deduplicatePoints(smPoints);
      const { error: upsertError } = await supabase.from('odds_points').upsert(uniqueSmPoints, { 
        onConflict: 'fixture_id,market,line,selection,source,ts_utc,bookmaker_id' 
      });
      
      if (upsertError) {
        console.error(`SportMonks upsert failed for fixture ${fixtureId}:`, upsertError);
      } else {
        console.log(`[DEBUG] Saved ${uniqueSmPoints.length} SportMonks odds for fixture ${fixtureId}`);
      }
    } else {
      console.log(`[DEBUG] No SportMonks odds found for fixture ${fixtureId}`);
    }
  } catch (err) {
    console.error(`SportMonks sync failed for fixture ${fixtureId}:`, err);
  }
}
