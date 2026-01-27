export function normalizeMarket(raw: string): "1X2" | "BTTS" | "OU" | null {
  const s = raw.toLowerCase().replace(/[\/_\-\.]/g, ' ');
  if (s.includes("1x2") || s.includes("h2h") || s.includes("moneyline") || s === "match winner" || s.includes("fulltime result")) return "1X2";
  if (s.includes("btts") || s.includes("both teams to score")) return "BTTS";
  if (s.includes("ou") || s.includes("over under") || s.includes("totals") || s.includes("total") || s.includes("goal line")) return "OU";
  return null;
}

export function normalizeSelection(
  market: "1X2" | "BTTS" | "OU",
  raw: string
): "HOME" | "DRAW" | "AWAY" | "YES" | "NO" | "OVER" | "UNDER" | null {
  const s = String(raw).trim().toLowerCase();

  if (market === "1X2") {
    if (s === "home" || s === "h" || s === "1") return "HOME";
    if (s === "draw" || s === "d" || s === "x") return "DRAW";
    if (s === "away" || s === "a" || s === "2") return "AWAY";
    return null;
  }
  if (market === "BTTS") {
    if (s === "yes" || s === "y" || s === "1") return "YES";
    if (s === "no" || s === "n" || s === "0") return "NO";
    return null;
  }
  if (market === "OU") {
    if (s.includes("over") || s === "o") return "OVER";
    if (s.includes("under") || s === "u") return "UNDER";
    return null;
  }
  return null;
}

export function normalizeLine(rawLine: any): number|null {
  if (rawLine === null || rawLine === undefined || rawLine === "") return null;
  const n = Number(rawLine);
  if (Number.isFinite(n)) return n;
  return null;
}

export function calculateAverageOdds(oddsPoints: number[]) {
  const filtered = oddsPoints.filter(o => o > 1.01 && o < 100);
  if (filtered.length === 0) return null;
  const sum = filtered.reduce((a, b) => a + b, 0);
  return sum / filtered.length;
}
