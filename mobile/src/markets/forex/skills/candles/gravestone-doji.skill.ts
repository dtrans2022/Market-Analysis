import type { CandlePatternSkill } from "./types";

export const GravestoneDojiSkill: CandlePatternSkill = {
  id: "gravestone-doji",
  name: "Gravestone Doji",
  bias: "bearish",
  category: "forex",
  description: "A long upper wick with a close near the low shows sellers rejected a higher move.",
  typicalUse: "Most useful at resistance after an advance, with bearish confirmation.",
  invalidWhen: "Do not treat it as bearish without rejection at a supply zone."
};

export default GravestoneDojiSkill;
