import type { CandlePatternSkill } from "./types";

export const BearishEngulfingSkill: CandlePatternSkill = {
  id: "bearish-engulfing",
  name: "Bearish Engulfing",
  bias: "bearish",
  category: "shares",
  description: "A bearish candle fully covers the prior bullish real body and often signals reversal.",
  typicalUse: "Best after an advance and near a resistance zone.",
  invalidWhen: "Do not force it in a range without rejection."
};

export default BearishEngulfingSkill;
