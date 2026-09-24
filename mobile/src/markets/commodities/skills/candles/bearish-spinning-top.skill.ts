import type { CandlePatternSkill } from "./types";

export const BearishSpinningTopSkill: CandlePatternSkill = {
  id: "bearish-spinning-top",
  name: "Bearish Spinning Top",
  bias: "bearish",
  category: "commodities",
  description: "A small bearish body with meaningful upper and lower shadows reflects slight seller control.",
  typicalUse: "Useful in a downtrend or near resistance as a cautionary sign.",
  invalidWhen: "Do not trade it alone without a confirming close."
};

export default BearishSpinningTopSkill;
