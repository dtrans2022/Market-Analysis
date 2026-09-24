import type { CandlePatternSkill } from "./types";

export const FallingWindowSkill: CandlePatternSkill = {
  id: "falling-window",
  name: "Falling Window",
  bias: "bearish",
  category: "commodities",
  description: "A gap lower creates a downward break and often confirms continuation.",
  typicalUse: "Use it where real gaps are valid and supported by trend context.",
  invalidWhen: "Do not use it in synthetic or clustered candles without checking for artifact gaps."
};

export default FallingWindowSkill;
