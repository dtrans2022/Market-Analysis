import type { CandlePatternSkill } from "./types";

export const BullishAbandonedBabySkill: CandlePatternSkill = {
  id: "bullish-abandoned-baby",
  name: "Bullish Abandoned Baby",
  bias: "bullish",
  category: "commodities",
  description: "A bearish candle, isolated doji, and bullish candle form with gaps separating the doji.",
  typicalUse: "Rare but powerful reversal when the gaps are real.",
  invalidWhen: "Do not create it from ordinary continuous data without genuine gaps."
};

export default BullishAbandonedBabySkill;
