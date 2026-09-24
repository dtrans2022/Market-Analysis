import type { CandlePatternSkill } from "./types";

export const HangingManSkill: CandlePatternSkill = {
  id: "hanging-man",
  name: "Hanging Man",
  bias: "bearish",
  category: "shares",
  description: "A hammer-like candle after an advance warns of distribution.",
  typicalUse: "Use it near resistance with bearish confirmation.",
  invalidWhen: "Do not take it as a bearish reversal in a flat range without context."
};

export default HangingManSkill;
