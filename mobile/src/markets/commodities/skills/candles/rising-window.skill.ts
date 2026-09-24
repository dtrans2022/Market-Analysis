import type { CandlePatternSkill } from "./types";

export const RisingWindowSkill: CandlePatternSkill = {
  id: "rising-window",
  name: "Rising Window",
  bias: "bullish",
  category: "commodities",
  description: "A gap higher creates an upward break in the range and often confirms continuation.",
  typicalUse: "Use it where real gaps are valid and supported by trend context.",
  invalidWhen: "Do not use it in synthetic continuous forex candles without validating the gap."
};

export default RisingWindowSkill;
