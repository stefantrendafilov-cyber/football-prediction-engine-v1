import { fetchSportMonks } from './sportmonks';
import { normalizeMarket, normalizeSelection } from '../odds/normalizeOdds';

/**
 * Fetches and normalizes pre-match odds from SportMonks v3.
 * Focuses on 1X2, BTTS, and Over/Under markets.
 */
export async function getSportMonksOddsForFixtures(fixtureIds: number[]) {
  const allPoints: any[] = [];
  
  // Market IDs from SportMonks v3
  const TARGET_MARKETS = [1, 14, 12, 80]; // 1X2, BTTS, OU, Goals OU
  const BIG_5_BOOKMAKERS = [2, 5, 9, 20, 29]; // bet365, 888Sport, Betfair, Pinnacle, William Hill

  for (const fixtureId of fixtureIds) {
    try {
      // Fetch all pre-match odds for the fixture
      const data = await fetchSportMonks(`odds/pre-match/fixtures/${fixtureId}`, {
        include: 'market'
      });
      
      const oddsList = data.data || [];
      const stableTs = new Date().toISOString();
      
      for (const odds of oddsList) {
        // Ensure bookmakerId is a Number for comparison and storage
        const bookmakerId = odds.bookmaker_id ? Number(odds.bookmaker_id) : null;
        if (!bookmakerId || !BIG_5_BOOKMAKERS.includes(bookmakerId)) continue;

        const marketId = odds.market_id;
        if (!TARGET_MARKETS.includes(marketId)) continue;

        const marketName = odds.market?.name || odds.market_description || '';
        const normalizedMarket = normalizeMarket(marketName);
        if (!normalizedMarket) continue;
        
        const selection = normalizeSelection(normalizedMarket, odds.label || odds.value || odds.name);
        if (!selection) continue;
        
        let line: number | null = null;
        if (normalizedMarket === 'OU') {
            const rawTotal = odds.total || odds.handicap;
            line = rawTotal ? parseFloat(rawTotal) : null;
            
            // Fallback for label matching (e.g. "Over 2.5")
            if (line === null && (odds.label || odds.name)) {
              const match = (odds.label || odds.name).match(/(\d+\.?\d*)/);
              if (match) line = parseFloat(match[1]);
            }
            
            // Only keep common lines we support
            if (line !== 1.5 && line !== 2.5 && line !== 3.5) continue;
        }
        
        const oddsValue = parseFloat(odds.value);
        if (isNaN(oddsValue) || oddsValue <= 1.01) continue;

        allPoints.push({
          fixture_id: fixtureId,
          bookmaker_id: bookmakerId, // Valid number now
          market: normalizedMarket,
          selection,
          line,
          odds_decimal: oddsValue,
          ts_utc: stableTs,
          source: 'sportmonks'
        });
      }

    } catch (error) {
      console.error(`Error fetching SportMonks odds for fixture ${fixtureId}:`, error);
    }
  }
  
  return allPoints;
}
