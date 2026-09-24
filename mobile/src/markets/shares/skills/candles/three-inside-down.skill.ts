import type { CandlePatternSkill } from "./types";

export const ThreeInsideDownSkill: CandlePatternSkill = {
  id: "three-inside-down",
  name: "Three Inside Down",
  bias: "bearish",
  category: "shares",
  description: "A bullish candle, a contained bearish candle, and a confirming candle indicate reversal downward.",
  typicalUse: "Good after an advance at resistance.",
  invalidWhen: "Do not trust it if price remains far from resistance."
};

export default ThreeInsideDownSkill;
