import assert from "node:assert/strict";
import {
  buildSignal,
  buildTechnicalAnalysis,
  computeHistoricalRecurrenceConfidenceAdjustment,
  computeVolatilityConfidenceAdjustment
} from "./marketAgentService.js";
import { detectCandlestickPattern } from "./marketHistoryService.js";

const candles = Array.from({ length: 25 }, (_, index) => {
  const base = 1.095 + index * 0.0004;
  return {
    t: index * 3600,
    o: base,
    h: base + 0.0008,
    l: base - 0.0006,
    c: base + 0.0002
  };
});

const technicals = buildTechnicalAnalysis("EUR/USD", "1hour", candles, 1.09, 1.11);

assert.ok(Number.isFinite(technicals.atrPercent));
assert.ok(Number.isFinite(technicals.impliedVolatilityPercent));
assert.ok(computeVolatilityConfidenceAdjustment(technicals) !== 0);
assert.equal(computeHistoricalRecurrenceConfidenceAdjustment(4), 4);
assert.equal(computeHistoricalRecurrenceConfidenceAdjustment(-20), -6);
assert.equal(computeHistoricalRecurrenceConfidenceAdjustment(undefined), 0);

const validThreeBlackCrows = [
  { t: 0, o: 1.090, h: 1.112, l: 1.088, c: 1.110 },
  { t: 1, o: 1.110, h: 1.111, l: 1.095, c: 1.098 },
  { t: 2, o: 1.099, h: 1.100, l: 1.083, c: 1.086 },
  { t: 3, o: 1.087, h: 1.088, l: 1.071, c: 1.074 }
];
const ordinaryDecline = [
  { t: 0, o: 1.110, h: 1.116, l: 1.095, c: 1.098 },
  { t: 1, o: 1.105, h: 1.112, l: 1.083, c: 1.086 },
  { t: 2, o: 1.100, h: 1.108, l: 1.071, c: 1.074 },
  { t: 3, o: 1.090, h: 1.098, l: 1.068, c: 1.070 }
];
assert.equal(detectCandlestickPattern(validThreeBlackCrows, -1).pattern, "three-black-crows");
assert.notEqual(detectCandlestickPattern(ordinaryDecline, -1).pattern, "three-black-crows");

const bullishEngulfing = [
  { t: 0, o: 1.110, h: 1.112, l: 1.096, c: 1.100 },
  { t: 1, o: 1.098, h: 1.116, l: 1.096, c: 1.114 }
];
assert.equal(
  detectCandlestickPattern(bullishEngulfing, -1, { isAtSupport: true, isAtResistance: false }).pattern,
  "bullish-engulfing"
);
assert.equal(
  detectCandlestickPattern(bullishEngulfing, -1, { isAtSupport: false, isAtResistance: false }).pattern,
  "none"
);

const validThreeWhiteSoldiers = [
  { t: 0, o: 1.080, h: 1.084, l: 1.078, c: 1.082 },
  { t: 1, o: 1.082, h: 1.094, l: 1.081, c: 1.092 },
  { t: 2, o: 1.091, h: 1.104, l: 1.090, c: 1.102 },
  { t: 3, o: 1.101, h: 1.115, l: 1.100, c: 1.113 }
];
const weakRisingCandles = [
  { t: 0, o: 112.555, h: 112.852, l: 112.397, c: 112.567 },
  { t: 1, o: 112.077, h: 112.808, l: 112.060, c: 112.081 },
  { t: 2, o: 113.013, h: 113.400, l: 112.628, c: 113.023 },
  { t: 3, o: 113.171, h: 113.868, l: 113.100, c: 113.201 },
  { t: 4, o: 113.926, h: 114.235, l: 113.755, c: 113.951 }
];

assert.equal(detectCandlestickPattern(validThreeWhiteSoldiers, -1).pattern, "three-white-soldiers");
assert.notEqual(detectCandlestickPattern(weakRisingCandles, 1).pattern, "three-white-soldiers");
assert.equal(detectCandlestickPattern([{ t: 0, o: 1.1, h: 1.12, l: 1.08, c: 1.101 }], 0).bias, "neutral");

const fallbackSignal = buildSignal(
  "EUR/USD",
  "forex",
  "1hour",
  {
    symbol: "EUR/USD",
    name: "EUR/USD",
    category: "forex",
    timeframe: "1hour",
    pattern: "trend",
    direction: "up",
    confidence: 70,
    support: 1.09,
    resistance: 1.11,
    latestClose: 1.101,
    sampleSize: 12,
    source: "derived",
    candlestickPattern: "none",
    candlestickBias: "neutral",
    candlestickImpactScore: 0,
    volumeRatio: 1.2,
    volumeImpactScore: 4,
    trendImpactScore: 6,
    historicalRecurrenceScore: 5,
    historicalRecurrenceSummary: "recent support retest",
    volumeConfirmation: "strong",
    isAtSupport: false,
    isAtResistance: false,
    note: "trend structure remains intact"
  },
  Array.from({ length: 12 }, (_, index) => ({
    t: index * 3600,
    o: 1.09 + index * 0.0005,
    h: 1.095 + index * 0.0006,
    l: 1.085 + index * 0.0004,
    c: 1.092 + index * 0.0007
  })),
  "derived"
);

assert.ok(fallbackSignal !== null);
assert.equal(fallbackSignal?.direction, "up");
assert.ok(typeof fallbackSignal?.tradePlan.entry === "number");
assert.ok(typeof fallbackSignal?.strategySummary === "string");

console.log("volatility-adjustment-ok", {
  atrPercent: technicals.atrPercent,
  impliedVolatilityPercent: technicals.impliedVolatilityPercent,
  adjustment: computeVolatilityConfidenceAdjustment(technicals)
});
