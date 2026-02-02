import {
  computeStakeDecision,
  updateBankrollAfterBet,
  settleBet,
  calculatePnl,
} from './kelly';
import { Bankroll, BetCandidate, DEFAULT_KELLY_CONFIG } from './types';

function createMockBankroll(overrides: Partial<Bankroll> = {}): Bankroll {
  return {
    id: 'test-id',
    userId: 'user-123',
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
    ...overrides,
  };
}

function createMockCandidate(overrides: Partial<BetCandidate> = {}): BetCandidate {
  return {
    predictionId: 'pred-123',
    fixtureId: 12345,
    market: 'BTTS',
    selection: 'Yes',
    oddsDecimal: 2.0,
    modelProbability: 0.70,
    ...overrides,
  };
}

function runTests() {
  console.log('=== KELLY STAKE ENGINE TESTS (Safe Kelly v1) ===\n');
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => boolean) {
    try {
      if (fn()) {
        console.log(`✓ ${name}`);
        passed++;
      } else {
        console.log(`✗ ${name}`);
        failed++;
      }
    } catch (e) {
      console.log(`✗ ${name} - Error: ${e}`);
      failed++;
    }
  }

  test('pUsed: safety-adjusted probability (0.70 model prob)', () => {
    const bankroll = createMockBankroll();
    const candidate = createMockCandidate({ modelProbability: 0.70 });
    const decision = computeStakeDecision(candidate, bankroll);
    const expected = Math.min(0.90, Math.max(0.50, 0.7 * 0.70 + 0.3 * 0.50 - 0.03));
    return Math.abs(decision.kellyResult.pUsed - expected) < 0.001;
  });

  test('pUsed: clamps to min 0.50', () => {
    const bankroll = createMockBankroll();
    const candidate = createMockCandidate({ modelProbability: 0.50 });
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.pUsed === 0.50;
  });

  test('pUsed: clamps to max 0.90', () => {
    const bankroll = createMockBankroll();
    const candidate = createMockCandidate({ modelProbability: 1.0 });
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.pUsed <= 0.90;
  });

  test('rawKelly: correct formula (b*p - q) / b', () => {
    const bankroll = createMockBankroll();
    const candidate = createMockCandidate({ modelProbability: 0.80, oddsDecimal: 2.0 });
    const decision = computeStakeDecision(candidate, bankroll);
    const pUsed = decision.kellyResult.pUsed;
    const b = 1.0;
    const expectedRaw = (b * pUsed - (1 - pUsed)) / b;
    return Math.abs(decision.kellyResult.rawKelly - expectedRaw) < 0.001;
  });

  test('fractionalKelly: applies 0.20 fraction', () => {
    const bankroll = createMockBankroll();
    const candidate = createMockCandidate({ modelProbability: 0.80 });
    const decision = computeStakeDecision(candidate, bankroll);
    const expectedFrac = decision.kellyResult.rawKelly * DEFAULT_KELLY_CONFIG.kellyFraction;
    return Math.abs(decision.kellyResult.fractionalKelly - expectedFrac) < 0.001;
  });

  test('maxStakePct: caps at 1.5%', () => {
    const bankroll = createMockBankroll();
    const candidate = createMockCandidate({ modelProbability: 0.95, oddsDecimal: 3.0 });
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.finalStakePct <= DEFAULT_KELLY_CONFIG.maxStakePct;
  });

  test('drawdownMultiplier: 1.0 when no drawdown', () => {
    const bankroll = createMockBankroll();
    const candidate = createMockCandidate();
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.drawdownMultiplier === 1.0;
  });

  test('drawdownMultiplier: 0.75 at 8% drawdown', () => {
    const bankroll = createMockBankroll({ currentBankroll: 920, peakBankroll: 1000 });
    const candidate = createMockCandidate();
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.drawdownMultiplier === 0.75;
  });

  test('drawdownMultiplier: 0.50 at 12% drawdown', () => {
    const bankroll = createMockBankroll({ currentBankroll: 880, peakBankroll: 1000 });
    const candidate = createMockCandidate();
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.drawdownMultiplier === 0.50;
  });

  test('drawdownMultiplier: 0.25 at 18% drawdown', () => {
    const bankroll = createMockBankroll({ currentBankroll: 820, peakBankroll: 1000 });
    const candidate = createMockCandidate();
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.drawdownMultiplier === 0.25;
  });

  test('lossStreakMultiplier: 1.0 with 0 consecutive losses', () => {
    const bankroll = createMockBankroll({ consecutiveLosses: 0 });
    const candidate = createMockCandidate();
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.lossStreakMultiplier === 1.0;
  });

  test('lossStreakMultiplier: 0.75 with 3 consecutive losses', () => {
    const bankroll = createMockBankroll({ consecutiveLosses: 3, last50Results: ['LOSS', 'LOSS', 'LOSS'] });
    const candidate = createMockCandidate();
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.lossStreakMultiplier === 0.75;
  });

  test('lossStreakMultiplier: 0.50 with 5 consecutive losses', () => {
    const bankroll = createMockBankroll({ consecutiveLosses: 5, last50Results: ['LOSS', 'LOSS', 'LOSS', 'LOSS', 'LOSS'] });
    const candidate = createMockCandidate();
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.lossStreakMultiplier === 0.50;
  });

  test('lossStreakMultiplier: resets to 1.0 with 2 wins in last 3', () => {
    const bankroll = createMockBankroll({ 
      consecutiveLosses: 5, 
      last50Results: ['WIN', 'WIN', 'LOSS', 'LOSS', 'LOSS'] 
    });
    const candidate = createMockCandidate();
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.lossStreakMultiplier === 1.0;
  });

  test('formMultiplier: 1.0 with insufficient data (<20 bets)', () => {
    const bankroll = createMockBankroll({ last50Results: Array(10).fill('LOSS') });
    const candidate = createMockCandidate();
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.formMultiplier === 1.0;
  });

  test('formMultiplier: 0.50 with <60% win rate over 20+ bets', () => {
    const results: ('WIN' | 'LOSS')[] = [...Array(8).fill('WIN'), ...Array(17).fill('LOSS')];
    const bankroll = createMockBankroll({ last50Results: results });
    const candidate = createMockCandidate();
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.formMultiplier === 0.50;
  });

  test('formMultiplier: 1.0 with >=60% win rate', () => {
    const results: ('WIN' | 'LOSS')[] = [...Array(15).fill('WIN'), ...Array(10).fill('LOSS')];
    const bankroll = createMockBankroll({ last50Results: results });
    const candidate = createMockCandidate();
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.kellyResult.formMultiplier === 1.0;
  });

  test('dailyRisk: caps stake at remaining daily allowance', () => {
    const bankroll = createMockBankroll({ dayRiskUsed: 40 });
    const candidate = createMockCandidate({ modelProbability: 0.95, oddsDecimal: 3.0 });
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.stakeAmount <= 10;
  });

  test('openExposure: caps stake at remaining exposure allowance', () => {
    const bankroll = createMockBankroll({ openExposure: 70 });
    const candidate = createMockCandidate({ modelProbability: 0.95, oddsDecimal: 3.0 });
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.stakeAmount <= 10;
  });

  test('stake: rounds to whole number', () => {
    const bankroll = createMockBankroll();
    const candidate = createMockCandidate();
    const decision = computeStakeDecision(candidate, bankroll);
    return Number.isInteger(decision.stakeAmount);
  });

  test('stake: returns 0 if calculated < 1', () => {
    const bankroll = createMockBankroll({ currentBankroll: 10 });
    const candidate = createMockCandidate({ modelProbability: 0.55, oddsDecimal: 1.5 });
    const decision = computeStakeDecision(candidate, bankroll);
    return decision.stakeAmount === 0;
  });

  test('updateBankrollAfterBet: increases openExposure', () => {
    const bankroll = createMockBankroll();
    const updates = updateBankrollAfterBet(bankroll, 30);
    return updates.openExposure === 30;
  });

  test('updateBankrollAfterBet: increases dayRiskUsed', () => {
    const bankroll = createMockBankroll();
    const updates = updateBankrollAfterBet(bankroll, 30);
    return updates.dayRiskUsed === 30;
  });

  test('updateBankrollAfterBet: resets dayRiskUsed on new day', () => {
    const bankroll = createMockBankroll({ dayKey: '2020-01-01', dayRiskUsed: 50 });
    const updates = updateBankrollAfterBet(bankroll, 30);
    return updates.dayRiskUsed === 30 && updates.dayKey !== '2020-01-01';
  });

  test('calculatePnl: WIN returns stake * (odds - 1)', () => {
    const pnl = calculatePnl(30, 2.0, 'WIN');
    return pnl === 30;
  });

  test('calculatePnl: LOSS returns -stake', () => {
    const pnl = calculatePnl(30, 2.0, 'LOSS');
    return pnl === -30;
  });

  test('calculatePnl: VOID returns 0', () => {
    const pnl = calculatePnl(30, 2.0, 'VOID');
    return pnl === 0;
  });

  test('settleBet WIN: increases bankroll', () => {
    const bankroll = createMockBankroll({ openExposure: 30 });
    const updates = settleBet(bankroll, 30, 2.0, 'WIN');
    return updates.currentBankroll === 1030;
  });

  test('settleBet WIN: resets consecutiveLosses', () => {
    const bankroll = createMockBankroll({ consecutiveLosses: 5, openExposure: 30 });
    const updates = settleBet(bankroll, 30, 2.0, 'WIN');
    return updates.consecutiveLosses === 0;
  });

  test('settleBet LOSS: decreases bankroll', () => {
    const bankroll = createMockBankroll({ openExposure: 30 });
    const updates = settleBet(bankroll, 30, 2.0, 'LOSS');
    return updates.currentBankroll === 970;
  });

  test('settleBet LOSS: increments consecutiveLosses', () => {
    const bankroll = createMockBankroll({ consecutiveLosses: 2, openExposure: 30 });
    const updates = settleBet(bankroll, 30, 2.0, 'LOSS');
    return updates.consecutiveLosses === 3;
  });

  test('settleBet VOID: bankroll unchanged', () => {
    const bankroll = createMockBankroll({ openExposure: 30 });
    const updates = settleBet(bankroll, 30, 2.0, 'VOID');
    return updates.currentBankroll === 1000;
  });

  test('settleBet: decreases openExposure', () => {
    const bankroll = createMockBankroll({ openExposure: 50 });
    const updates = settleBet(bankroll, 30, 2.0, 'WIN');
    return updates.openExposure === 20;
  });

  test('settleBet: updates peakBankroll on new high', () => {
    const bankroll = createMockBankroll({ openExposure: 30 });
    const updates = settleBet(bankroll, 30, 2.0, 'WIN');
    return updates.peakBankroll === 1030;
  });

  test('settleBet: adds result to last50Results (WIN)', () => {
    const bankroll = createMockBankroll({ openExposure: 30 });
    const updates = settleBet(bankroll, 30, 2.0, 'WIN');
    return updates.last50Results?.[0] === 'WIN';
  });

  test('settleBet: adds result to last50Results (LOSS)', () => {
    const bankroll = createMockBankroll({ openExposure: 30 });
    const updates = settleBet(bankroll, 30, 2.0, 'LOSS');
    return updates.last50Results?.[0] === 'LOSS';
  });

  test('settleBet: caps last50Results at 50 entries', () => {
    const bankroll = createMockBankroll({ 
      last50Results: Array(50).fill('WIN'),
      openExposure: 30 
    });
    const updates = settleBet(bankroll, 30, 2.0, 'LOSS');
    return updates.last50Results?.length === 50 && updates.last50Results?.[0] === 'LOSS';
  });

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

runTests();
