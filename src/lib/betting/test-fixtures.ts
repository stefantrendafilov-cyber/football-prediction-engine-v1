import { computeStakeDecision } from './kelly';
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

console.log('=== KELLY STAKE ENGINE TEST (Safe Kelly v1) ===');
console.log(`Bankroll: €${bankroll.currentBankroll}`);
console.log('');

for (const fix of testFixtures) {
  const candidate: BetCandidate = {
    predictionId: `pred-${fix.fixtureId}`,
    fixtureId: fix.fixtureId,
    market: fix.market,
    selection: fix.selection,
    oddsDecimal: fix.odds,
    modelProbability: fix.modelProb,
  };

  const decision = computeStakeDecision(candidate, bankroll);
  const k = decision.kellyResult;

  console.log(`--- ${fix.name} ---`);
  console.log(`Market: ${fix.market} ${fix.selection} @ ${fix.odds}`);
  console.log(`Model Prob: ${(fix.modelProb * 100).toFixed(1)}%`);
  console.log(`pUsed (safety-adjusted): ${(k.pUsed * 100).toFixed(2)}%`);
  console.log(`Raw Kelly: ${(k.rawKelly * 100).toFixed(3)}%`);
  console.log(`Fractional (20%): ${(k.fractionalKelly * 100).toFixed(3)}%`);
  console.log(`Multipliers: DD=${k.drawdownMultiplier} LS=${k.lossStreakMultiplier} Form=${k.formMultiplier}`);
  console.log(`Final Stake: €${decision.stakeAmount} (${(k.finalStakePct * 100).toFixed(2)}%)`);
  console.log(`Should Bet: ${decision.shouldBet ? 'YES' : 'NO'}`);
  console.log('');
}
