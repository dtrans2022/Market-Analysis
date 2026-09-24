import type { CandlePatternSkill } from "./types";

export const ThreeWhiteSoldiersSkill: CandlePatternSkill = {
  id: "three-white-soldiers",
  name: "Three White Soldiers",
  bias: "bullish",
  category: "commodities",
  description: "Three consecutive strong bullish candles with higher closes signal sustained buying pressure.",
  typicalUse: "Use it after a pullback or in fresh bullish trends.",
  invalidWhen: "Do not interpret it as continuation if the market is already exhausted."
};

export default ThreeWhiteSoldiersSkill;
