import { calculateFixedStake } from './fixed-stake';
import { Bankroll, BetCandidate } from './types';

const bankroll: Bankroll = {
  id: 'test',
  userId: 'test-user',
  currency: 'EUR',
  initialBankroll: 1000,
  currentBankroll: 1000,
  peakBankroll: 1000,
  openExposure: 0,
  consecutiveLosses: 0,
  last50Results: [],
  dayKey: new Date().toISOString().split('T')[0],
  dayRiskUsed: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testFixtures: { name: string; fixtureId: number; market: string; selection: string; odds: number; modelProb: number }[] = [
  { name: 'Radomiak vs Arka', fixtureId: 19425108, market: 'BTTS', selection: 'Yes', odds: 1.95, modelProb: 0.75 },
  { name: 'Fixture 19425108', fixtureId: 19425108, market: 'Over 2.5', selection: 'Over', odds: 2.10, modelProb: 0.72 },
  { name: 'Fixture 19425105', fixtureId: 19425105, market: '1X2', selection: 'Home', odds: 1.80, modelProb: 0.78 },
  { name: 'Fixture 19425431', fixtureId: 19425431, market: 'BTTS', selection: 'Yes', odds: 2.05, modelProb: 0.70 },
];

console.log('=== FIXED STAKE ENGINE TEST (Ultra-Robust v1) ===');
console.log(`Bankroll: €${bankroll.currentBankroll}`);
console.log('');

for (const fix of testFixtures) {
  const recommendation = calculateFixedStake(
    bankroll.currentBankroll,
    bankroll.consecutiveLosses,
    bankroll.last50Results
  );

  console.log(`--- ${fix.name} ---`);
  console.log(`Market: ${fix.market} ${fix.selection} @ ${fix.odds}`);
  console.log(`Model Prob: ${(fix.modelProb * 100).toFixed(1)}%`);
  console.log(`Stake: €${recommendation.stake} (${(recommendation.pct * 100).toFixed(2)}%)`);
  console.log(`Status: ${recommendation.isReduced ? 'REDUCED' : 'STANDARD'}`);
  console.log('');
}
