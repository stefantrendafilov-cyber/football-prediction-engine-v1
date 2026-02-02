import {
  KellyConfig,
  Bankroll,
  BetCandidate,
  KellyResult,
  BetResult,
  DEFAULT_KELLY_CONFIG,
} from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getEffectiveDayRiskUsed(bankroll: Bankroll): number {
  const today = getTodayKey();
  return bankroll.dayKey === today ? bankroll.dayRiskUsed : 0;
}

function computeSafetyAdjustedProbability(modelProb: number): number {
  const pUsedRaw = 0.7 * modelProb + 0.3 * 0.50;
  return clamp(pUsedRaw - 0.03, 0.50, 0.90);
}

function computeRawKelly(pUsed: number, oddsDecimal: number): number {
  const b = oddsDecimal - 1;
  if (b <= 0) return 0;
  const rawKelly = (b * pUsed - (1 - pUsed)) / b;
  return Math.max(0, rawKelly);
}

function computeDrawdownMultiplier(bankroll: Bankroll): number {
  if (bankroll.peakBankroll <= 0) return 1.0;
  const drawdown = (bankroll.peakBankroll - bankroll.currentBankroll) / bankroll.peakBankroll;
  if (drawdown >= 0.18) return 0.25;
  if (drawdown >= 0.12) return 0.50;
  if (drawdown >= 0.08) return 0.75;
  return 1.0;
}

function computeLossStreakMultiplier(bankroll: Bankroll): number {
  const last3 = bankroll.last50Results.slice(0, 3);
  const winsInLast3 = last3.filter(r => r === 'WIN').length;
  if (winsInLast3 >= 2) return 1.0;
  
  if (bankroll.consecutiveLosses >= 5) return 0.50;
  if (bankroll.consecutiveLosses >= 3) return 0.75;
  return 1.0;
}

function computeFormMultiplier(bankroll: Bankroll): number {
  const betsLast50 = bankroll.last50Results.length;
  if (betsLast50 < 20) return 1.0;
  
  const wins = bankroll.last50Results.filter(r => r === 'WIN').length;
  const winRate = wins / betsLast50;
  if (winRate < 0.60) return 0.50;
  return 1.0;
}

export interface StakeDecision {
  shouldBet: boolean;
  stakePct: number;
  stakeAmount: number;
  kellyResult: KellyResult;
}

export function computeStakeDecision(
  candidate: BetCandidate,
  bankroll: Bankroll,
  config: KellyConfig = DEFAULT_KELLY_CONFIG
): StakeDecision {
  const pUsed = computeSafetyAdjustedProbability(candidate.modelProbability);
  const rawKelly = computeRawKelly(pUsed, candidate.oddsDecimal);
  const fractionalKelly = rawKelly * config.kellyFraction;
  
  let stake = fractionalKelly * bankroll.currentBankroll;
  
  const drawdownMultiplier = computeDrawdownMultiplier(bankroll);
  const lossStreakMultiplier = computeLossStreakMultiplier(bankroll);
  const formMultiplier = computeFormMultiplier(bankroll);
  
  stake *= drawdownMultiplier;
  stake *= lossStreakMultiplier;
  stake *= formMultiplier;
  
  stake = Math.min(stake, bankroll.currentBankroll * config.maxStakePct);
  
  const dayRiskUsed = getEffectiveDayRiskUsed(bankroll);
  const dailyRiskRemaining = bankroll.currentBankroll * config.maxDailyRiskPct - dayRiskUsed;
  stake = Math.min(stake, dailyRiskRemaining);
  
  const exposureRemaining = bankroll.currentBankroll * config.maxOpenExposurePct - bankroll.openExposure;
  stake = Math.min(stake, exposureRemaining);
  
  stake = Math.round(stake);
  if (stake < 1) stake = 0;
  
  const finalStakePct = bankroll.currentBankroll > 0 ? stake / bankroll.currentBankroll : 0;
  
  const kellyResult: KellyResult = {
    rawKelly,
    fractionalKelly,
    finalStakePct,
    finalStakeAmount: stake,
    pUsed,
    drawdownMultiplier,
    lossStreakMultiplier,
    formMultiplier,
  };
  
  return {
    shouldBet: stake > 0,
    stakePct: finalStakePct,
    stakeAmount: stake,
    kellyResult,
  };
}

export function updateBankrollAfterBet(
  bankroll: Bankroll,
  stakeAmount: number
): Partial<Bankroll> {
  const today = getTodayKey();
  const currentDayRiskUsed = bankroll.dayKey === today ? bankroll.dayRiskUsed : 0;

  return {
    openExposure: bankroll.openExposure + stakeAmount,
    dayKey: today,
    dayRiskUsed: currentDayRiskUsed + stakeAmount,
    updatedAt: new Date(),
  };
}

export function settleBet(
  bankroll: Bankroll,
  stakeAmount: number,
  oddsDecimal: number,
  result: 'WIN' | 'LOSS' | 'VOID'
): Partial<Bankroll> {
  let pnl: number;
  if (result === 'WIN') {
    pnl = stakeAmount * (oddsDecimal - 1);
  } else if (result === 'LOSS') {
    pnl = -stakeAmount;
  } else {
    pnl = 0;
  }
  
  const newBankroll = bankroll.currentBankroll + pnl;
  const newPeak = Math.max(bankroll.peakBankroll, newBankroll);
  
  let newConsecutiveLosses: number;
  if (result === 'WIN') {
    newConsecutiveLosses = 0;
  } else if (result === 'LOSS') {
    newConsecutiveLosses = bankroll.consecutiveLosses + 1;
  } else {
    newConsecutiveLosses = bankroll.consecutiveLosses;
  }
  
  const betResult: BetResult = result;
  const newLast50Results = [betResult, ...bankroll.last50Results].slice(0, 50);

  return {
    currentBankroll: newBankroll,
    peakBankroll: newPeak,
    openExposure: Math.max(0, bankroll.openExposure - stakeAmount),
    consecutiveLosses: newConsecutiveLosses,
    last50Results: newLast50Results,
    updatedAt: new Date(),
  };
}

export function calculatePnl(
  stakeAmount: number,
  oddsDecimal: number,
  result: 'WIN' | 'LOSS' | 'VOID'
): number {
  if (result === 'WIN') return stakeAmount * (oddsDecimal - 1);
  if (result === 'LOSS') return -stakeAmount;
  return 0;
}
