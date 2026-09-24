import type { CandlePatternSkill } from "./types";

export const InvertedHammerSkill: CandlePatternSkill = {
  id: "inverted-hammer",
  name: "Inverted Hammer",
  bias: "bullish",
  category: "forex",
  description: "A small body with a long upper wick shows attempted buying pressure that was rejected.",
  typicalUse: "Use it after a decline only if the next candle confirms the bullish reversal.",
  invalidWhen: "Do not rely on it as a standalone reversal signal."
};

export default InvertedHammerSkill;
