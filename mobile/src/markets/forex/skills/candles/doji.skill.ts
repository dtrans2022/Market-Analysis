import type { CandlePatternSkill } from "./types";

export const DojiSkill: CandlePatternSkill = {
  id: "doji",
  name: "Doji",
  bias: "neutral",
  category: "forex",
  description: "Open and close are nearly equal, showing indecision and a pause rather than immediate directional conviction.",
  typicalUse: "Use it as a balance check near support or resistance and wait for confirmation from the next candle.",
  invalidWhen: "Do not treat it as a directional signal without confirmation or context."
};

export default DojiSkill;
