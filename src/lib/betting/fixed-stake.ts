export const BASE_PCT = 0.015;
export const REDUCED_MULTIPLIER = 0.5;

export interface FixedStakeResult {
  stake: number;
  pct: number;
  isReduced: boolean;
  bankroll: number;
  consecutiveLosses: number;
}

/**
 * Fixed Stake v1 (Ultra-Robust)
 * 
 * Logic:
 * 1. Base rule: 1.5% of current bankroll
 * 2. Loss-streak reducer: 3 consecutive losses -> activate reduced mode (50% of base)
 * 3. Recovery: Return to base stake when 2 wins occur within the last 3 settled bets (ignore VOID)
 */
export function calculateFixedStake(
  bankroll: number,
  consecutiveLosses: number,
  lastSettledResults: string[]
): FixedStakeResult {
  const results = lastSettledResults.filter(r => r !== 'VOID');
  let currentState: 'STANDARD' | 'REDUCED' = 'STANDARD';
  let currentStreak = 0;

  // Process history from oldest to newest to determine the current state
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    
    // Update streak
    if (r === 'LOSS' || r === 'LOST') {
      currentStreak++;
    } else if (r === 'WIN' || r === 'WON') {
      currentStreak = 0;
    }

    // Trigger check
    if (currentStreak >= 3) {
      currentState = 'REDUCED';
    }

    // Recovery check (2 wins in last 3)
    if (currentState === 'REDUCED') {
      const window = results.slice(Math.max(0, i - 2), i + 1);
      const winsInWindow = window.filter(w => w === 'WIN' || w === 'WON').length;
      if (winsInWindow >= 2) {
        currentState = 'STANDARD';
      }
    }
  }

  const pct = currentState === 'REDUCED' ? BASE_PCT * REDUCED_MULTIPLIER : BASE_PCT;
  const stake = bankroll * pct;

  return {
    stake: Math.floor(stake * 100) / 100,
    pct,
    isReduced: currentState === 'REDUCED',
    bankroll,
    consecutiveLosses
  };
}
