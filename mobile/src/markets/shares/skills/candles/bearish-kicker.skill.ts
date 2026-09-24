import type { CandlePatternSkill } from "./types";

export const BearishKickerSkill: CandlePatternSkill = {
  id: "bearish-kicker",
  name: "Bearish Kicker",
  bias: "bearish",
  category: "shares",
  description: "A bullish candle is followed by a strong bearish candle with decisive displacement.",
  typicalUse: "Useful at resistance as a fast bearish shift.",
  invalidWhen: "Do not use it on low-quality aggregated candles or artificial gaps."
};

export default BearishKickerSkill;
