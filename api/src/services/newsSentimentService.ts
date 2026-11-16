import { config } from "../config.js";
import { getGlobalMarketNews, type NewsItem } from "./newsService.js";

export type NewsSentimentSource = "llm" | "lexicon" | "fallback";

export type MarketNewsSentiment = {
  score: number; // -1..1 aggregate market tone
  label: "bullish" | "bearish" | "neutral";
  source: NewsSentimentSource;
  sampleSize: number;
  updatedAt: string;
  byCurrency: Record<string, number>; // per-currency score -1..1
};

const SENTIMENT_CACHE_TTL_MS = 10 * 60 * 1000;
const LLM_TIMEOUT_MS = 8000;
const MAX_HEADLINES_FOR_LLM = 25;

const BULLISH_TERMS = [
  "surge", "rally", "soar", "gain", "jump", "beat", "upgrade", "record high", "bullish",
  "optimism", "strong", "growth", "outperform", "recovery", "rebound", "boost", "upbeat",
  "profit", "expansion", "hawkish", "rate hike", "tightening", "stimulus", "demand"
];

const BEARISH_TERMS = [
  "plunge", "slump", "fall", "drop", "miss", "downgrade", "record low", "bearish",
  "fear", "weak", "recession", "underperform", "selloff", "sell-off", "crash", "cut",
  "loss", "contraction", "dovish", "rate cut", "slowdown", "default", "layoff", "crisis", "tumble"
];

const CURRENCY_CODES = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"];

let cache: { value: MarketNewsSentiment; cachedAt: number } | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function labelFor(score: number): MarketNewsSentiment["label"] {
  if (score > 0.12) {
    return "bullish";
  }
  if (score < -0.12) {
    return "bearish";
  }
  return "neutral";
}

function lexiconScoreForText(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const term of BULLISH_TERMS) {
    if (lower.includes(term)) {
      score += 1;
    }
  }
  for (const term of BEARISH_TERMS) {
    if (lower.includes(term)) {
      score -= 1;
    }
  }
  if (score === 0) {
    return 0;
  }
  // Normalize a single headline contribution into -1..1.
  return clamp(score / 3, -1, 1);
}

function directionScore(item: NewsItem): number {
  // News impacts already encode Up/Down with confidence; fold them in.
  let total = 0;
  let count = 0;
  for (const impact of item.impacts) {
    if (impact.direction === "Up") {
      total += impact.confidence / 100;
      count += 1;
    } else if (impact.direction === "Down") {
      total -= impact.confidence / 100;
      count += 1;
    }
  }
  return count > 0 ? clamp(total / count, -1, 1) : 0;
}

function accumulateCurrencyScores(item: NewsItem, score: number, byCurrency: Record<string, number[]>) {
  const haystack = `${item.title} ${item.summary}`.toUpperCase();
  const pairsUp = new Set<string>();
  const pairsDown = new Set<string>();
  for (const impact of item.impacts) {
    for (const pair of impact.pairsUp ?? []) {
      for (const code of extractCurrencies(pair)) {
        pairsUp.add(code);
      }
    }
    for (const pair of impact.pairsDown ?? []) {
      for (const code of extractCurrencies(pair)) {
        pairsDown.add(code);
      }
    }
  }

  for (const code of CURRENCY_CODES) {
    if (pairsUp.has(code)) {
      (byCurrency[code] ??= []).push(clamp(Math.abs(score) || 0.3, 0, 1));
    } else if (pairsDown.has(code)) {
      (byCurrency[code] ??= []).push(-clamp(Math.abs(score) || 0.3, 0, 1));
    } else if (haystack.includes(code)) {
      (byCurrency[code] ??= []).push(score);
    }
  }
}

function extractCurrencies(pair: string): string[] {
  const upper = pair.toUpperCase();
  return CURRENCY_CODES.filter((code) => upper.includes(code));
}

function averageOf(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildLexiconSentiment(items: NewsItem[]): MarketNewsSentiment {
  const perItemScores: number[] = [];
  const byCurrencyRaw: Record<string, number[]> = {};

  for (const item of items) {
    const lexical = lexiconScoreForText(`${item.title} ${item.summary}`);
    const directional = directionScore(item);
    const combined = clamp((lexical * 0.6) + (directional * 0.4), -1, 1);
    perItemScores.push(combined);
    accumulateCurrencyScores(item, combined, byCurrencyRaw);
  }

  const byCurrency: Record<string, number> = {};
  for (const [code, values] of Object.entries(byCurrencyRaw)) {
    byCurrency[code] = clamp(averageOf(values), -1, 1);
  }

  const score = clamp(averageOf(perItemScores), -1, 1);
  return {
    score,
    label: labelFor(score),
    source: "lexicon",
    sampleSize: items.length,
    updatedAt: new Date().toISOString(),
    byCurrency
  };
}

async function classifyWithLlm(items: NewsItem[]): Promise<MarketNewsSentiment | null> {
  if (!config.NEWS_SENTIMENT_LLM_ENABLED || !config.NEWS_SENTIMENT_LLM_API_KEY) {
    return null;
  }

  const headlines = items.slice(0, MAX_HEADLINES_FOR_LLM).map((item, index) => `${index + 1}. ${item.title}`).join("\n");
  const prompt = `You are a financial markets sentiment analyst. Rate the overall market tone of these headlines and the tone for each major currency (USD, EUR, GBP, JPY, AUD, NZD, CAD, CHF). Respond ONLY with compact JSON of shape {"score": number from -1 to 1, "byCurrency": {"USD": number, ...}}. A positive number is bullish/risk-on, negative is bearish/risk-off. Headlines:\n${headlines}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.NEWS_SENTIMENT_LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.NEWS_SENTIMENT_LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: config.NEWS_SENTIMENT_LLM_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content) as { score?: number; byCurrency?: Record<string, number> };
    if (typeof parsed.score !== "number" || !Number.isFinite(parsed.score)) {
      return null;
    }

    const byCurrency: Record<string, number> = {};
    for (const code of CURRENCY_CODES) {
      const value = parsed.byCurrency?.[code];
      if (typeof value === "number" && Number.isFinite(value)) {
        byCurrency[code] = clamp(value, -1, 1);
      }
    }

    const score = clamp(parsed.score, -1, 1);
    return {
      score,
      label: labelFor(score),
      source: "llm",
      sampleSize: Math.min(items.length, MAX_HEADLINES_FOR_LLM),
      updatedAt: new Date().toISOString(),
      byCurrency
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const NEUTRAL_SENTIMENT: MarketNewsSentiment = {
  score: 0,
  label: "neutral",
  source: "fallback",
  sampleSize: 0,
  updatedAt: new Date(0).toISOString(),
  byCurrency: {}
};

export async function getMarketNewsSentiment(): Promise<MarketNewsSentiment> {
  const now = Date.now();
  if (cache && now - cache.cachedAt < SENTIMENT_CACHE_TTL_MS) {
    return cache.value;
  }

  let value: MarketNewsSentiment;
  try {
    const news = await getGlobalMarketNews();
    const items = news.data ?? [];
    if (!items.length) {
      value = { ...NEUTRAL_SENTIMENT, updatedAt: new Date().toISOString() };
    } else {
      value = (await classifyWithLlm(items)) ?? buildLexiconSentiment(items);
    }
  } catch {
    value = { ...NEUTRAL_SENTIMENT, updatedAt: new Date().toISOString() };
  }

  cache = { value, cachedAt: now };
  return value;
}

// Resolve a directional sentiment bias (-1..1) for a specific traded symbol.
export function resolveSymbolNewsScore(symbol: string, sentiment: MarketNewsSentiment): number {
  const codes = extractCurrencies(symbol);
  if (codes.length === 2) {
    const base = sentiment.byCurrency[codes[0]];
    const quote = sentiment.byCurrency[codes[1]];
    if (typeof base === "number" || typeof quote === "number") {
      return clamp((base ?? 0) - (quote ?? 0), -1, 1);
    }
  }
  if (codes.length === 1 && typeof sentiment.byCurrency[codes[0]] === "number") {
    return clamp(sentiment.byCurrency[codes[0]], -1, 1);
  }
  return sentiment.score;
}
