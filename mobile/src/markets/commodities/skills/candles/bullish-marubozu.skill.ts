import type { CandlePatternSkill } from "./types";

export const BullishMarubozuSkill: CandlePatternSkill = {
  id: "bullish-marubozu",
  name: "Bullish Marubozu",
  bias: "bullish",
  category: "commodities",
  description: "A long bullish candle with very small shadows indicates sustained buyer control.",
  typicalUse: "Strongest on breakouts and in confirmed trends.",
  invalidWhen: "Avoid using it as a blind continuation signal after a runaway move."
};

export default BullishMarubozuSkill;
