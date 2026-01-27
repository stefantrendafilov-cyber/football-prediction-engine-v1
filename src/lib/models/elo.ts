export function calculateExpectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function updateElo(rating: number, actualScore: number, expectedScore: number, kFactor: number = 20) {
  return rating + kFactor * (actualScore - expectedScore);
}

export function getMatchProbabilities(homeElo: number, awayElo: number, drawRate: number) {
  const homeAdvantage = 60;
  const eloDiff = (homeElo + homeAdvantage) - awayElo;

  // Compute draw probability that decreases with Elo difference
  const baseDraw = drawRate || 0.26;
  const drawFactor = Math.exp(-Math.abs(eloDiff) / 400);
  const pDraw = Math.min(Math.max(baseDraw * drawFactor, 0.10), 0.30);

  // Probability of home win vs away win (no draw scenario)
  const pHomeWinNoDraw = 1 / (1 + Math.pow(10, -eloDiff / 400));

  // Allocate remaining probability (1 - pDraw) between Home and Away
  const pHome = (1 - pDraw) * pHomeWinNoDraw;
  const pAway = (1 - pDraw) * (1 - pHomeWinNoDraw);

  return {
    home: pHome,
    draw: pDraw,
    away: pAway
  };
}
