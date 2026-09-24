import type { CandlePatternSkill } from "./types";

export const PiercingLineSkill: CandlePatternSkill = {
  id: "piercing-line",
  name: "Piercing Line",
  bias: "bullish",
  category: "shares",
  description: "A bullish candle closes above the midpoint of the previous bearish body but remains below that candle's open.",
  typicalUse: "Use after a decline near support to confirm a reversal attempt.",
  invalidWhen: "Do not use it as a standalone bullish trigger when the trend remains strongly bearish."
};

export default PiercingLineSkill;
