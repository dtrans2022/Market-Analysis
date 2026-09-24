import type { CandlePatternSkill } from "./types";

export const BullishEngulfingSkill: CandlePatternSkill = {
  id: "bullish-engulfing",
  name: "Bullish Engulfing",
  bias: "bullish",
  category: "commodities",
  description: "A bullish candle fully covers the prior bearish real body and often signals reversal.",
  typicalUse: "Best after a decline and near a historical support zone.",
  invalidWhen: "Do not interpret it as a reversal after a long rally without support context."
};

export default BullishEngulfingSkill;
