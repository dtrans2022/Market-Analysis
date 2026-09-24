import type { CandlePatternSkill } from "./types";

export const BearishAbandonedBabySkill: CandlePatternSkill = {
  id: "bearish-abandoned-baby",
  name: "Bearish Abandoned Baby",
  bias: "bearish",
  category: "shares",
  description: "A bullish candle, isolated doji, and bearish candle form with gaps separating the doji.",
  typicalUse: "Rare but powerful reversal when the gaps are real.",
  invalidWhen: "Do not create it from ordinary continuous data without genuine gaps."
};

export default BearishAbandonedBabySkill;
