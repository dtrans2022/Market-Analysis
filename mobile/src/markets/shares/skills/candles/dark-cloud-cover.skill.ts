import type { CandlePatternSkill } from "./types";

export const DarkCloudCoverSkill: CandlePatternSkill = {
  id: "dark-cloud-cover",
  name: "Dark Cloud Cover",
  bias: "bearish",
  category: "shares",
  description: "A bearish candle closes below the midpoint of the previous bullish body but remains above that candle's open.",
  typicalUse: "Use after an advance near resistance for a bearish reversal signal.",
  invalidWhen: "Do not trust it without rejection at supply."
};

export default DarkCloudCoverSkill;
