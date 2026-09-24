import type { CandlePatternSkill } from "./types";

export const FlagSkill: CandlePatternSkill = {
  id: "flag",
  name: "Flag",
  bias: "continuation",
  category: "shares",
  description: "A short countertrend consolidation follows a strong directional move.",
  typicalUse: "Trade in the direction of the prior impulse once the flag breaks.",
  invalidWhen: "Do not trade the flag in isolation without the breakout."
};

export default FlagSkill;
