import type { CandlePatternSkill } from "./types";

export const TweezerTopSkill: CandlePatternSkill = {
  id: "tweezer-top",
  name: "Tweezer Top",
  bias: "bearish",
  category: "forex",
  description: "Two candles test the same high, suggesting resistance absorption and a bearish reversal.",
  typicalUse: "Most valid at key resistance zones.",
  invalidWhen: "Do not trade it if the highs are not comparable."
};

export default TweezerTopSkill;
