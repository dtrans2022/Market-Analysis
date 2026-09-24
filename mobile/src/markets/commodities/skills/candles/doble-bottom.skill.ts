import type { CandlePatternSkill } from "./types";

export const DobleBottomSkill: CandlePatternSkill = {
  id: "doble-bottom",
  name: "Doble Bottom",
  bias: "bullish",
  category: "commodities",
  description: "Project-specific misspelling of the double-bottom structure; it should be normalized to the standard label.",
  typicalUse: "Use the same interpretation as double-bottom.",
  invalidWhen: "Do not treat it as a separate pattern if the canonical double-bottom definition is used."
};

export default DobleBottomSkill;
