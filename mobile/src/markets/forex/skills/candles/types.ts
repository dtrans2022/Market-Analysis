export type CandlePatternBias = "bullish" | "bearish" | "neutral" | "continuation";

export type CandlePatternSkill = {
  id: string;
  name: string;
  bias: CandlePatternBias;
  category: "forex" | "commodities" | "shares";
  description: string;
  typicalUse: string;
  invalidWhen: string;
};

export type SupportResistanceZone = {
  id: string;
  name: string;
  asset: "forex" | "commodities" | "shares";
  zoneType: "support" | "resistance";
  level: number;
  strength: "minor" | "major" | "key";
  candlePatterns: string[];
  rationale: string;
};
