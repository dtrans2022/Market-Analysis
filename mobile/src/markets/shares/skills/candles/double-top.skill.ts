import type { CandlePatternSkill } from "./types";

export const DoubleTopSkill: CandlePatternSkill = {
  id: "double-top",
  name: "Double Top",
  bias: "bearish",
  category: "shares",
  description: "Two failed attempts to push above the same high usually mark a bearish reversal.",
  typicalUse: "Confirm with a neckline break and weaker follow-through.",
  invalidWhen: "Do not call it a reversal before the neckline breaks."
};

export default DoubleTopSkill;
