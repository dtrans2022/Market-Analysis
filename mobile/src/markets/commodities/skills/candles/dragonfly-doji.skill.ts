import type { CandlePatternSkill } from "./types";

export const DragonflyDojiSkill: CandlePatternSkill = {
  id: "dragonfly-doji",
  name: "Dragonfly Doji",
  bias: "bullish",
  category: "commodities",
  description: "A long lower wick with a close near the high shows buyers reabsorbed selling pressure.",
  typicalUse: "Most useful at support after a decline, with bullish confirmation.",
  invalidWhen: "Do not trust it in a strong uptrend or when price is far from support."
};

export default DragonflyDojiSkill;
