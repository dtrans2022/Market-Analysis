import type { CandlePatternSkill } from "./types";

export const BullishKickerSkill: CandlePatternSkill = {
  id: "bullish-kicker",
  name: "Bullish Kicker",
  bias: "bullish",
  category: "commodities",
  description: "A bearish candle is followed by a strong bullish candle with decisive displacement.",
  typicalUse: "Useful as a rapid sentiment reversal when the gap or shift is genuine.",
  invalidWhen: "Do not use it on synthetic or heavily aggregated candle data."
};

export default BullishKickerSkill;
