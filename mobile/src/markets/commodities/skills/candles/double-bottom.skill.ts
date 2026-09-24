import type { CandlePatternSkill } from "./types";

export const DoubleBottomSkill: CandlePatternSkill = {
  id: "double-bottom",
  name: "Double Bottom",
  bias: "bullish",
  category: "commodities",
  description: "Two failed attempts to push below the same low usually mark a bullish reversal.",
  typicalUse: "Confirm with a neckline break and higher closes.",
  invalidWhen: "Do not assume a bottom until the neckline holds."
};

export default DoubleBottomSkill;
