export type BetResult = 'WIN' | 'LOSS' | 'VOID';

export interface KellyConfig {
  maxStakePct: number;
  kellyFraction: number;
  maxDailyRiskPct: number;
  maxOpenExposurePct: number;
}

export interface Bankroll {
  id: string;
  userId: string;
  currency: string;
  initialBankroll: number;
  currentBankroll: number;
  peakBankroll: number;
  openExposure: number;
  consecutiveLosses: number;
  last50Results: BetResult[];
  dayKey: string;
  dayRiskUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BetCandidate {
  predictionId: string;
  fixtureId: number;
  market: string;
  selection: string;
  line?: number;
  oddsDecimal: number;
  modelProbability: number;
}

export interface KellyResult {
  rawKelly: number;
  fractionalKelly: number;
  finalStakePct: number;
  finalStakeAmount: number;
  pUsed: number;
  drawdownMultiplier: number;
  lossStreakMultiplier: number;
  formMultiplier: number;
}

export interface PlacedBet {
  id: string;
  userId: string;
  predictionId: string;
  fixtureId: number;
  market: string;
  selection: string;
  line?: number;
  oddsDecimal: number;
  modelProbability: number;
  stake: number;
  stakePct: number;
  currency: string;
  status: 'OPEN' | 'WON' | 'LOST' | 'VOID' | 'PUSH';
  pnl?: number;
  lockedAt: Date;
  settledAt?: Date;
  kellyData?: KellyResult;
  createdAt: Date;
  fixture?: {
    homeTeam: string;
    awayTeam: string;
    startingAt: string;
  };
}

export const DEFAULT_KELLY_CONFIG: KellyConfig = {
  maxStakePct: 0.015,
  kellyFraction: 0.20,
  maxDailyRiskPct: 0.05,
  maxOpenExposurePct: 0.08,
};
