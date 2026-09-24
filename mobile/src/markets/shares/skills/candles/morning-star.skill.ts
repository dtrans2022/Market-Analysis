import type { CandlePatternSkill } from "./types";

export const MorningStarSkill: CandlePatternSkill = {
  id: "morning-star",
  name: "Morning Star",
  bias: "bullish",
  category: "shares",
  description: "A bearish candle, a small indecision candle, and then a strong bullish candle form a reversal.",
  typicalUse: "Strongest after a decline near support.",
  invalidWhen: "Do not take it in isolation without support context."
};

export default MorningStarSkill;
