import type { CandlePatternSkill } from "./types";

export const ThreeBlackCrowsSkill: CandlePatternSkill = {
  id: "three-black-crows",
  name: "Three Black Crows",
  bias: "bearish",
  category: "forex",
  description: "Three substantial bearish candles with lower closes signal conviction and distribution.",
  typicalUse: "Use it after an advance or at resistance with a clear prior uptrend.",
  invalidWhen: "Do not call it a pattern without prior bullish context."
};

export default ThreeBlackCrowsSkill;
