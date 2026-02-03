export function poisson(k: number, lambda: number) {
  const factorial = (n: number): number => {
    if (n === 0) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  };
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export function getExpectedGoals(
  leagueAvgGoals: number,
  homeAttackStrength: number,
  awayDefenseWeakness: number,
  awayAttackStrength: number,
  homeDefenseWeakness: number
) {
  const homeAdvantage = 1.1;
  const lambdaHome = leagueAvgGoals * homeAttackStrength * awayDefenseWeakness * homeAdvantage;
  const lambdaAway = leagueAvgGoals * awayAttackStrength * homeDefenseWeakness;

  return { lambdaHome, lambdaAway };
}

export function calculateProbabilities(lambdaHome: number, lambdaAway: number) {
  const maxGoals = 6;
  
  const pHome: number[] = [];
  const pAway: number[] = [];

  for (let i = 0; i <= maxGoals; i++) {
    pHome[i] = poisson(i, lambdaHome);
    pAway[i] = poisson(i, lambdaAway);
  }

  // BTTS: 1 - P(home=0) - P(away=0) + P(0,0)
  const pBTTS = 1 - pHome[0] - pAway[0] + (pHome[0] * pAway[0]);

  // Over/Under
  let pOver15 = 0;
  let pOver25 = 0;
  let pOver35 = 0;

  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const jointProb = pHome[i] * pAway[j];
      const totalGoals = i + j;
      if (totalGoals > 1.5) pOver15 += jointProb;
      if (totalGoals > 2.5) pOver25 += jointProb;
      if (totalGoals > 3.5) pOver35 += jointProb;
    }
  }

  return {
    btts: pBTTS,
    over15: pOver15,
    over25: pOver25,
    over35: pOver35,
    under15: 1 - pOver15,
    under25: 1 - pOver25,
    under35: 1 - pOver35
  };
}

export function calculateProbabilitiesWithPenalty(
  lambdaHome: number,
  lambdaAway: number,
  leagueAvgGoalsPerTeam: number
) {
  const base = calculateProbabilities(lambdaHome, lambdaAway);
  
  let pBttsYes = base.btts;
  
  // Penalty if min lambda < 0.90 (low-scoring team)
  if (Math.min(lambdaHome, lambdaAway) < 0.90) {
    pBttsYes *= 0.90;
  }
  
  // Penalty if league average is low (<1.15 goals per team)
  if (leagueAvgGoalsPerTeam < 1.15) {
    pBttsYes *= 0.92;
  }
  
  return {
    ...base,
    btts_raw: base.btts,
    btts: pBttsYes,
  };
}
