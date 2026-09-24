import type { CandlePatternSkill } from "./types";

export const ThreeLineStrikeSkill: CandlePatternSkill = {
  id: "three-line-strike",
  name: "Three Line Strike",
  bias: "continuation",
  category: "forex",
  description: "Three candles move in one direction and a fourth strong candle reverses sharply through the previous range.",
  typicalUse: "Use it as a warning of exhaustion requiring confirmation before trading.",
  invalidWhen: "Do not assume a reversal without context."
};

export default ThreeLineStrikeSkill;
