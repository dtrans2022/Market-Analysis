import type { SupportResistanceZone } from "./types";

export const supportResistanceZones: SupportResistanceZone[] = [
  {
    id: "gold-support-zone",
    name: "Gold Support Zone",
    asset: "commodities",
    zoneType: "support",
    level: 2305,
    strength: "major",
    candlePatterns: ["hammer", "dragonfly-doji", "bullish-engulfing", "morning-star"],
    rationale: "Gold often attracts defensive buying at this level when bullish candle clusters validate support.",
  },
  {
    id: "gold-resistance-zone",
    name: "Gold Resistance Zone",
    asset: "commodities",
    zoneType: "resistance",
    level: 2385,
    strength: "major",
    candlePatterns: ["gravestone-doji", "hanging-man", "bearish-engulfing", "three-black-crows"],
    rationale: "This zone acts as supply, where bearish candles frequently cluster during rejection.",
  },
];
