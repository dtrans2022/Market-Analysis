import type { CandlePatternSkill } from "./types";

export const BullishSpinningTopSkill: CandlePatternSkill = {
  id: "bullish-spinning-top",
  name: "Bullish Spinning Top",
  bias: "bullish",
  category: "shares",
  description: "A small bullish body with meaningful upper and lower shadows reflects slight buyer control.",
  typicalUse: "Useful as a soft continuation clue in a trend or range.",
  invalidWhen: "Do not treat it as a strong signal without follow-through."
};

export default BullishSpinningTopSkill;
