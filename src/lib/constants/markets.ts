export const MARKETS = {
  ONE_X_TWO: "1X2",
  BTTS: "BTTS",
  OU: "OU",
} as const;

export const ONE_X_TWO_SELECTIONS = ["HOME", "DRAW", "AWAY"] as const;
export const BTTS_SELECTIONS = ["YES", "NO"] as const;
export const OU_SELECTIONS = ["OVER", "UNDER"] as const;
export const OU_LINES = [1.5, 2.5, 3.5] as const;

export const ENGINE_RULES = {
  LOOKAHEAD_HOURS: 72,
  HISTORY_MATCHES: 10,
  PROB_THRESHOLD: 0.70,
  MIN_EDGE: 0.05,
  MIN_PUBLISH_ODDS: 1.50,
  DAILY_PICK_LIMIT: 20,
  ODDS_FRESH_MINUTES: 60,
  AVG_ODDS_WINDOW_HOURS: 24,
  POISSON_MAX_GOALS: 6,
} as const;
