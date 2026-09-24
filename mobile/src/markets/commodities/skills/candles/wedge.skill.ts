import type { CandlePatternSkill } from "./types";

export const WedgeSkill: CandlePatternSkill = {
  id: "wedge",
  name: "Wedge",
  bias: "continuation",
  category: "commodities",
  description: "Converging boundaries indicate tightening price action before a directional breakout.",
  typicalUse: "Use the breakout, not the wedge shape alone, to define direction.",
  invalidWhen: "Do not assume direction from the wedge geometry alone."
};

export default WedgeSkill;
