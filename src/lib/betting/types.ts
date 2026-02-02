export type BetResult = 'WIN' | 'LOSS' | 'VOID' | 'PUSH';

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

export interface FixedStakeResult {
  stake: number;
  pct: number;
  isReduced: boolean;
  bankroll: number;
  consecutiveLosses: number;
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
  recommendationData?: FixedStakeResult;
  createdAt: Date;
  fixture?: {
    homeTeam: string;
    awayTeam: string;
    startingAt: string;
  };
}
