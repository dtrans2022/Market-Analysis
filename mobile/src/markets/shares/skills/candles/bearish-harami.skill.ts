import type { CandlePatternSkill } from "./types";

export const BearishHaramiSkill: CandlePatternSkill = {
  id: "bearish-harami",
  name: "Bearish Harami",
  bias: "bearish",
  category: "shares",
  description: "A smaller bearish candle forms inside the previous large bullish real body.",
  typicalUse: "Signals weakening buying pressure; use it with confirmation.",
  invalidWhen: "Do not assume a turn without follow-through."
};

export default BearishHaramiSkill;
