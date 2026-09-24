import type { CandlePatternSkill } from "./types";

export const ThreeOutsideUpSkill: CandlePatternSkill = {
  id: "three-outside-up",
  name: "Three Outside Up",
  bias: "bullish",
  category: "shares",
  description: "A bullish engulfing candle followed by confirmation and recovery.",
  typicalUse: "Strong bullish reversal near support.",
  invalidWhen: "Do not trade it if the engulfing move is not confirmed."
};

export default ThreeOutsideUpSkill;
