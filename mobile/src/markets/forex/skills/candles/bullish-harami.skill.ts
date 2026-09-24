import type { CandlePatternSkill } from "./types";

export const BullishHaramiSkill: CandlePatternSkill = {
  id: "bullish-harami",
  name: "Bullish Harami",
  bias: "bullish",
  category: "forex",
  description: "A smaller bullish candle forms inside the previous large bearish real body.",
  typicalUse: "Signals weakening selling pressure; use it with confirmation.",
  invalidWhen: "Do not assume a turn without follow-through."
};

export default BullishHaramiSkill;
