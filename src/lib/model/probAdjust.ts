export function adjustProbability(
  pModel: number,
  pImplied: number,
  _market?: string
): number {
  // A) Market anchoring blend: 60% model, 40% implied
  const pBlend = 0.60 * pModel + 0.40 * pImplied;
  
  // B) Shrink toward 0.50
  const pShrunk = 0.75 * pBlend + 0.25 * 0.50;
  
  // C) Cap max at 0.85
  return Math.min(pShrunk, 0.85);
}
