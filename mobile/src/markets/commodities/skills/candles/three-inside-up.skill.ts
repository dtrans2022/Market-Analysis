import type { CandlePatternSkill } from "./types";

export const ThreeInsideUpSkill: CandlePatternSkill = {
  id: "three-inside-up",
  name: "Three Inside Up",
  bias: "bullish",
  category: "commodities",
  description: "A bearish candle, a contained bullish candle, and a confirming candle indicate reversal upward.",
  typicalUse: "Good after a decline at support.",
  invalidWhen: "Do not trust it if price remains far from support."
};

export default ThreeInsideUpSkill;
