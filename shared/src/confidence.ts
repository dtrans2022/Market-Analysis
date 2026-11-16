// Parity-critical confidence & calibration math shared between the Express API
// and the Lambda mirror. Keep these functions PURE and deterministic — both
// backends must produce identical signal confidence for identical inputs.

export type AnalysisTimeframe = "1hour" | "4hour" | "12hour" | "1Day" | "1Week";

export type ConfidenceCalibrationStats = {
  wins: number;
  total: number;
};

export type CalibrationStatsByTimeframe = Record<AnalysisTimeframe, Record<string, ConfidenceCalibrationStats>>;

export interface VolatilityTechnicals {
  bollingerWidthPercent: number;
  atrPercent: number;
  impliedVolatilityPercent: number;
}

export interface OscillatorTechnicals {
  rsi14: number;
  macdHistogram: number;
}

const CONFIDENCE_CALIBRATION_PRIOR_WEIGHT = 25;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function roundTo(value: number, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function confidenceBucket(confidence: number) {
  if (confidence <= 64) {
    return "55-64";
  }

  if (confidence <= 74) {
    return "65-74";
  }

  if (confidence <= 84) {
    return "75-84";
  }

  return "85+";
}

export function emptyCalibrationStatsByTimeframe(): CalibrationStatsByTimeframe {
  return {
    "1hour": {},
    "4hour": {},
    "12hour": {},
    "1Day": {},
    "1Week": {}
  };
}

export function calibrateConfidence(
  rawConfidence: number,
  timeframe: AnalysisTimeframe,
  calibrationStatsByTimeframe: CalibrationStatsByTimeframe
) {
  const bucket = confidenceBucket(rawConfidence);
  const bucketStats = calibrationStatsByTimeframe[timeframe][bucket];
  const total = bucketStats?.total ?? 0;
  const wins = bucketStats?.wins ?? 0;

  // Bayesian smoothing: blend empirical win-rate with raw-confidence prior.
  const prior = clamp(rawConfidence / 100, 0.01, 0.99);
  const posterior = (wins + CONFIDENCE_CALIBRATION_PRIOR_WEIGHT * prior) / (total + CONFIDENCE_CALIBRATION_PRIOR_WEIGHT);
  return {
    calibratedConfidence: Math.round(clamp(posterior * 100, 1, 99)),
    calibrationSampleSize: total,
    calibrationBucket: bucket
  };
}

export function computeVolatilityConfidenceAdjustment(technicals: VolatilityTechnicals) {
  let adjustment = 0;

  if (technicals.bollingerWidthPercent < 0.8) {
    adjustment += 4;
  } else if (technicals.bollingerWidthPercent > 2.2) {
    adjustment -= 2;
  }

  if (technicals.atrPercent < 0.8) {
    adjustment += 2;
  } else if (technicals.atrPercent > 1.8) {
    adjustment -= 2;
  }

  if (technicals.impliedVolatilityPercent > 2.5) {
    adjustment -= 3;
  } else if (technicals.impliedVolatilityPercent < 1.1) {
    adjustment += 2;
  }

  return clamp(adjustment, -6, 6);
}

export function computeOscillatorConfidenceAdjustment(technicals: OscillatorTechnicals) {
  let adjustment = 0;

  if (technicals.rsi14 <= 30) {
    adjustment += 2;
  } else if (technicals.rsi14 >= 70) {
    adjustment -= 2;
  }

  if (technicals.macdHistogram > 0) {
    adjustment += 1;
  } else if (technicals.macdHistogram < 0) {
    adjustment -= 1;
  }

  return clamp(adjustment, -4, 4);
}

export function computeHistoricalRecurrenceConfidenceAdjustment(score: number | undefined) {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return 0;
  }

  return Math.round(clamp(score, -6, 6));
}
