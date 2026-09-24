import type { CandlePatternSkill } from "./types";

export const HammerSkill: CandlePatternSkill = {
  id: "hammer",
  name: "Hammer",
  bias: "bullish",
  category: "forex",
  description: "A small body with a long lower wick indicates rejection of lower prices.",
  typicalUse: "Look for this pattern near support after downside pressure.",
  invalidWhen: "Avoid using it in a strong rally when no support zone is present."
};

export default HammerSkill;
