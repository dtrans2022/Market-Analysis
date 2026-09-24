import type { SupportResistanceZone } from "./types";

export const supportResistanceZones: SupportResistanceZone[] = [
  {
    id: "eurusd-support-zone",
    name: "EUR/USD Support Zone",
    asset: "forex",
    zoneType: "support",
    level: 1.084,
    strength: "key",
    candlePatterns: ["hammer", "bullish-engulfing", "morning-star", "double-bottom"],
    rationale: "Buyers often reject this zone with bullish candle clusters and form a reversal.",
  },
  {
    id: "eurusd-resistance-zone",
    name: "EUR/USD Resistance Zone",
    asset: "forex",
    zoneType: "resistance",
    level: 1.1,
    strength: "key",
    candlePatterns: ["hanging-man", "bearish-engulfing", "three-black-crows", "double-top"],
    rationale: "Sellers often reassert control here, especially when bearish candles appear at the same supply zone.",
  },
];
