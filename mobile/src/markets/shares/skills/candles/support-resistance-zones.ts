import type { SupportResistanceZone } from "./types";

export const supportResistanceZones: SupportResistanceZone[] = [
  {
    id: "nasdaq-support-zone",
    name: "Nasdaq Support Zone",
    asset: "shares",
    zoneType: "support",
    level: 5200,
    strength: "major",
    candlePatterns: ["bullish-engulfing", "three-white-soldiers", "double-bottom", "morning-star"],
    rationale: "Support is often defended by bullish reversal candles with strong participation from buyers.",
  },
  {
    id: "nasdaq-resistance-zone",
    name: "Nasdaq Resistance Zone",
    asset: "shares",
    zoneType: "resistance",
    level: 5400,
    strength: "major",
    candlePatterns: ["bearish-engulfing", "tweezer-top", "double-top", "three-black-crows"],
    rationale: "A dense supply zone where bearish candles tend to appear after failed breakouts.",
  },
];
