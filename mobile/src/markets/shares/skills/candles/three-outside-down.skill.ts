import type { CandlePatternSkill } from "./types";

export const ThreeOutsideDownSkill: CandlePatternSkill = {
  id: "three-outside-down",
  name: "Three Outside Down",
  bias: "bearish",
  category: "shares",
  description: "A bearish engulfing candle followed by confirmation and breakdown.",
  typicalUse: "Strong bearish reversal near resistance.",
  invalidWhen: "Do not trade it if the breakdown lacks follow-through."
};

export default ThreeOutsideDownSkill;
