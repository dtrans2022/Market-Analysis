import type { CandlePatternSkill } from "./types";

export const TweezerBottomSkill: CandlePatternSkill = {
  id: "tweezer-bottom",
  name: "Tweezer Bottom",
  bias: "bullish",
  category: "shares",
  description: "Two candles test the same low, suggesting support absorption and a bullish reversal.",
  typicalUse: "Most valid at key support zones.",
  invalidWhen: "Do not trade it if the lows are not near the same price level."
};

export default TweezerBottomSkill;
