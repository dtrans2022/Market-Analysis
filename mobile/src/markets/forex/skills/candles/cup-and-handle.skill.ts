import type { CandlePatternSkill } from "./types";

export const CupAndHandleSkill: CandlePatternSkill = {
  id: "cup-and-handle",
  name: "Cup and Handle",
  bias: "bullish",
  category: "forex",
  description: "A rounded recovery forms the cup and a shallow pullback forms the handle.",
  typicalUse: "Trade only after the breakout clears the rim with confirmation.",
  invalidWhen: "Do not treat the cup alone as enough to buy."
};

export default CupAndHandleSkill;
