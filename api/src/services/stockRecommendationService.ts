import { config } from "../config.js";
import { throwLiveDataUnavailable } from "../liveData.js";

export type StockSuggestion = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  source?: "live" | "fallback";
  rationale: string;
  sector?: string;
  score?: number;
  factorScores?: {
    momentum: number;
    volatility: number;
    sentiment: number;
    participation: number;
    fundamentals?: number;
  };
  fundamentals?: {
    peRatio?: number;
    profitMargin?: number;
    revenueGrowth?: number;
    returnOnEquity?: number;
    debtToEquity?: number;
  };
};

const fallbackSuggestions: StockSuggestion[] = [
  {
    symbol: "MSFT",
    name: "Microsoft Corp",
    price: 431.2,
    changePercent: 1.92,
    source: "fallback",
    sector: "Technology",
    rationale: "Strong earnings momentum and sustained institutional buying pressure.",
    score: 82,
    factorScores: {
      momentum: 81,
      volatility: 72,
      sentiment: 80,
      participation: 79
    }
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp",
    price: 128.6,
    changePercent: 2.33,
    source: "fallback",
    sector: "Semiconductors",
    rationale: "High relative strength and leadership in AI infrastructure demand.",
    score: 87,
    factorScores: {
      momentum: 90,
      volatility: 76,
      sentiment: 85,
      participation: 84
    }
  },
  {
    symbol: "XOM",
    name: "Exxon Mobil Corp",
    price: 116.74,
    changePercent: 1.14,
    source: "fallback",
    sector: "Energy",
    rationale: "Oil price resilience and stable cash flow support the trend continuation.",
    score: 79,
    factorScores: {
      momentum: 77,
      volatility: 74,
      sentiment: 79,
      participation: 72
    }
  }
];

const TOP_SHARES_COUNT = 20;

type UniverseStock = {
  symbol: string;
  name: string;
  sector: string;
};

type FinnhubQuote = {
  c: number;
  dp: number;
  h: number;
  l: number;
  pc: number;
};

type FinnhubSentiment = {
  sentiment?: {
    companyNewsScore?: number;
    bullishPercent?: number;
    bearishPercent?: number;
  };
  buzz?: {
    buzz?: number;
    weeklyAverage?: number;
  };
};

type FinnhubMetric = {
  metric?: Record<string, number | string | null>;
};

type StockFundamentals = {
  peRatio?: number;
  profitMargin?: number;
  revenueGrowth?: number;
  returnOnEquity?: number;
  debtToEquity?: number;
};

type YahooQuoteResult = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
};

const universe: UniverseStock[] = [
  { symbol: "MSFT", name: "Microsoft Corp", sector: "Technology" },
  { symbol: "NVDA", name: "NVIDIA Corp", sector: "Semiconductors" },
  { symbol: "AAPL", name: "Apple Inc", sector: "Technology" },
  { symbol: "AMZN", name: "Amazon.com Inc", sector: "Consumer" },
  { symbol: "GOOGL", name: "Alphabet Inc", sector: "Technology" },
  { symbol: "META", name: "Meta Platforms", sector: "Technology" },
  { symbol: "TSLA", name: "Tesla Inc", sector: "Automotive" },
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Financials" },
  { symbol: "XOM", name: "Exxon Mobil Corp", sector: "Energy" },
  { symbol: "CVX", name: "Chevron Corp", sector: "Energy" },
  { symbol: "RIO", name: "Rio Tinto", sector: "Materials" },
  { symbol: "BHP", name: "BHP Group", sector: "Materials" },
  { symbol: "UNH", name: "UnitedHealth Group", sector: "Healthcare" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { symbol: "PG", name: "Procter & Gamble", sector: "Consumer" },
  { symbol: "KO", name: "Coca-Cola Co", sector: "Consumer" },
  { symbol: "PEP", name: "PepsiCo Inc", sector: "Consumer" },
  { symbol: "WMT", name: "Walmart Inc", sector: "Consumer" },
  { symbol: "HD", name: "Home Depot", sector: "Consumer" },
  { symbol: "MCD", name: "McDonald's", sector: "Consumer" },
  { symbol: "ABBV", name: "AbbVie Inc", sector: "Healthcare" },
  { symbol: "LLY", name: "Eli Lilly", sector: "Healthcare" },
  { symbol: "MRK", name: "Merck & Co", sector: "Healthcare" },
  { symbol: "BAC", name: "Bank of America", sector: "Financials" },
  { symbol: "V", name: "Visa Inc", sector: "Financials" },
  { symbol: "MA", name: "Mastercard Inc", sector: "Financials" },
  { symbol: "COST", name: "Costco Wholesale", sector: "Consumer" },
  { symbol: "NFLX", name: "Netflix Inc", sector: "Technology" },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Semiconductors" },
  { symbol: "ORCL", name: "Oracle Corp", sector: "Technology" }
];

const fallbackPrices: Record<string, number> = {
  MSFT: 431.2,
  NVDA: 128.6,
  AAPL: 227.8,
  AMZN: 231.4,
  GOOGL: 201.1,
  META: 752.3,
  TSLA: 339.5,
  JPM: 294.6,
  XOM: 116.74,
  CVX: 162.2,
  RIO: 64.3,
  BHP: 51.8,
  UNH: 308.4,
  JNJ: 179.1,
  PG: 166.7,
  KO: 70.4,
  PEP: 145.8,
  WMT: 99.2,
  HD: 407.6,
  MCD: 307.1,
  ABBV: 198.6,
  LLY: 755.3,
  MRK: 81.4,
  BAC: 47.9,
  V: 344.8,
  MA: 590.2,
  COST: 976.4,
  NFLX: 1195.6,
  AMD: 171.4,
  ORCL: 241.9
};

function buildFallbackSuggestions() {
  return universe.map((stock, index) => {
    const seed = stock.symbol.split("").reduce((sum, character, characterIndex) => sum + character.charCodeAt(0) * (characterIndex + 1), index);
    const changePercent = Number((((seed % 500) / 100) - 2.5).toFixed(2));
    const momentum = scoreMomentum(changePercent);
    const score = Number((momentum * 0.65 + 58 * 0.15 + 55 * 0.1 + 52 * 0.1).toFixed(1));

    return {
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      price: fallbackPrices[stock.symbol] ?? 100,
      changePercent,
      score,
      source: "fallback" as const,
      factorScores: {
        momentum: Number(momentum.toFixed(1)),
        volatility: 58,
        sentiment: 55,
        participation: 52
      },
      rationale: "Fallback ranked share while live quote providers are unavailable."
    } satisfies StockSuggestion;
  });
}

function rankAndLimit(items: StockSuggestion[], limit = TOP_SHARES_COUNT) {
  return items
    .slice()
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
}

function mergeUniqueSuggestions(...batches: StockSuggestion[][]) {
  const merged = new Map<string, StockSuggestion>();
  for (const batch of batches) {
    for (const item of batch) {
      if (!merged.has(item.symbol)) {
        merged.set(item.symbol, item);
      }
    }
  }
  return Array.from(merged.values());
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function scoreMomentum(changePercent: number) {
  return clamp(((changePercent + 5) / 10) * 100, 0, 100);
}

function scoreVolatility(rangePercent: number) {
  if (!Number.isFinite(rangePercent) || rangePercent <= 0) {
    return 15;
  }

  if (rangePercent < 1) {
    return 25 + rangePercent * 20;
  }

  if (rangePercent <= 5) {
    return 60 + (rangePercent - 1) * 10;
  }

  if (rangePercent <= 10) {
    return 100 - (rangePercent - 5) * 10;
  }

  return 40;
}

function scoreSentiment(sentiment: number) {
  return clamp((sentiment + 1) * 50, 0, 100);
}

function scoreParticipation(buzz: number, weeklyAverage: number) {
  const ratio = weeklyAverage > 0 ? buzz / weeklyAverage : 0;
  return clamp(ratio * 50, 0, 100);
}

function readMetric(metrics: Record<string, number | string | null> | undefined, ...keys: string[]): number | undefined {
  if (!metrics) {
    return undefined;
  }
  for (const key of keys) {
    const raw = metrics[key];
    const value = typeof raw === "string" ? Number(raw) : raw;
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function parseFundamentals(payload: FinnhubMetric | null): StockFundamentals | undefined {
  const metrics = payload?.metric;
  if (!metrics) {
    return undefined;
  }

  const fundamentals: StockFundamentals = {
    peRatio: readMetric(metrics, "peTTM", "peBasicExclExtraTTM", "peExclExtraTTM"),
    profitMargin: readMetric(metrics, "netProfitMarginTTM", "netProfitMarginAnnual"),
    revenueGrowth: readMetric(metrics, "revenueGrowthTTMYoy", "revenueGrowthQuarterlyYoy", "revenueGrowth5Y"),
    returnOnEquity: readMetric(metrics, "roeTTM", "roeRfy"),
    debtToEquity: readMetric(metrics, "totalDebt/totalEquityQuarterly", "totalDebt/totalEquityAnnual", "longTermDebt/equityQuarterly")
  };

  const hasAny = Object.values(fundamentals).some((value) => typeof value === "number");
  return hasAny ? fundamentals : undefined;
}

// Blend valuation + quality + growth + leverage into a single 0-100 score.
function scoreFundamentals(fundamentals: StockFundamentals | undefined): number | undefined {
  if (!fundamentals) {
    return undefined;
  }

  const parts: number[] = [];

  if (typeof fundamentals.peRatio === "number") {
    // Reward reasonable valuations; loss-making (<=0) PE gets a modest floor.
    const pe = fundamentals.peRatio;
    parts.push(pe <= 0 ? 35 : clamp(100 - (pe - 15) * 2.5, 0, 100));
  }
  if (typeof fundamentals.profitMargin === "number") {
    parts.push(clamp(fundamentals.profitMargin * 3, 0, 100));
  }
  if (typeof fundamentals.returnOnEquity === "number") {
    parts.push(clamp(fundamentals.returnOnEquity * 3, 0, 100));
  }
  if (typeof fundamentals.revenueGrowth === "number") {
    parts.push(clamp((fundamentals.revenueGrowth + 10) * (100 / 30), 0, 100));
  }
  if (typeof fundamentals.debtToEquity === "number") {
    parts.push(clamp(100 - fundamentals.debtToEquity * 40, 0, 100));
  }

  if (parts.length === 0) {
    return undefined;
  }

  return clamp(parts.reduce((sum, value) => sum + value, 0) / parts.length, 0, 100);
}

function buildRationale(inputs: {
  momentum: number;
  volatility: number;
  sentiment: number;
  participation: number;
  fundamentals?: number;
}) {
  const drivers: string[] = [];

  if (inputs.momentum >= 70) {
    drivers.push("strong price momentum");
  }
  if (typeof inputs.fundamentals === "number" && inputs.fundamentals >= 65) {
    drivers.push("solid fundamentals");
  }
  if (inputs.sentiment >= 60) {
    drivers.push("positive news sentiment");
  }
  if (inputs.participation >= 60) {
    drivers.push("above-average news participation");
  }
  if (inputs.volatility >= 70) {
    drivers.push("healthy intraday trading range");
  }

  if (drivers.length === 0) {
    return "Balanced technical and sentiment profile with stable trend potential.";
  }

  return `Trend setup supported by ${drivers.join(", ")}.`;
}

async function getAlphaVantageSuggestions(): Promise<StockSuggestion[] | null> {
  if (!config.ALPHA_VANTAGE_API_KEY) {
    return null;
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "TOP_GAINERS_LOSERS");
  url.searchParams.set("apikey", config.ALPHA_VANTAGE_API_KEY);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      top_gainers?: Array<{
        ticker: string;
        price: string;
        change_percentage: string;
      }>;
    };

    const picks = (payload.top_gainers ?? []).slice(0, TOP_SHARES_COUNT).map((item) => {
      const change = Number.parseFloat(item.change_percentage.replace("%", ""));
      const price = Number.parseFloat(item.price);

      return {
        symbol: item.ticker,
        name: item.ticker,
        price: Number.isFinite(price) ? price : 0,
        changePercent: Number.isFinite(change) ? change : 0,
        rationale: "Strong upside momentum with elevated participation in current sessions.",
        source: "live",
        score: clamp((Number.isFinite(change) ? change : 0) * 8 + 50, 0, 100),
        factorScores: {
          momentum: clamp((Number.isFinite(change) ? change : 0) * 10 + 50, 0, 100),
          volatility: 62,
          sentiment: 58,
          participation: 64
        }
      } satisfies StockSuggestion;
    });

    return picks.length > 0 ? picks : null;
  } catch {
    return null;
  }
}

async function getYahooSuggestions(): Promise<StockSuggestion[] | null> {
  const url = new URL("https://query1.finance.yahoo.com/v7/finance/quote");
  url.searchParams.set("symbols", universe.map((stock) => stock.symbol).join(","));

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "market-analysis-api"
      }
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      quoteResponse?: {
        result?: YahooQuoteResult[];
      };
    };

    const quoteBySymbol = new Map((payload.quoteResponse?.result ?? []).map((item) => [item.symbol, item]));

    const suggestions = universe
      .map((stock) => {
        const quote = quoteBySymbol.get(stock.symbol);
        const price = quote?.regularMarketPrice;
        const changePercent = quote?.regularMarketChangePercent;

        if (typeof price !== "number" || typeof changePercent !== "number") {
          return null;
        }

        const momentum = scoreMomentum(changePercent);
        const volatility = 58;
        const sentiment = 55;
        const participation = 52;
        const score = momentum * 0.65 + volatility * 0.15 + sentiment * 0.1 + participation * 0.1;

        return {
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          price,
          changePercent,
          score: Number(score.toFixed(1)),
          source: "live",
          factorScores: {
            momentum: Number(momentum.toFixed(1)),
            volatility,
            sentiment,
            participation
          },
          rationale: buildRationale({
            momentum,
            volatility,
            sentiment,
            participation
          })
        } satisfies StockSuggestion;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, TOP_SHARES_COUNT);

    return suggestions.length > 0 ? suggestions : null;
  } catch {
    return null;
  }
}

async function getFmpSuggestions(): Promise<StockSuggestion[] | null> {
  if (!config.FMP_API_KEY) {
    return null;
  }

  try {
    const endpoints = [
      "https://financialmodelingprep.com/api/v3/stock_market/gainers",
      "https://financialmodelingprep.com/stable/biggest-gainers"
    ];
    let payload: Array<{
      symbol?: string;
      ticker?: string;
      name?: string;
      price?: number | string;
      changesPercentage?: number | string;
      changePercentage?: number | string;
      change?: number | string;
    }> = [];

    for (const endpoint of endpoints) {
      const url = new URL(endpoint);
      url.searchParams.set("apikey", config.FMP_API_KEY);
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }

      const candidate = await response.json();
      if (Array.isArray(candidate)) {
        payload = candidate;
        break;
      }
    }

    const suggestions = payload
      .map((item) => ({
        ...item,
        symbol: item.symbol || item.ticker,
        changePercent: Number(item.changesPercentage ?? item.changePercentage ?? item.change)
      }))
      .filter((item) => typeof item.symbol === "string" && Number.isFinite(Number(item.price)) && Number.isFinite(item.changePercent))
      .slice(0, TOP_SHARES_COUNT)
      .map((item) => {
        const changePercent = item.changePercent;
        const momentum = scoreMomentum(changePercent);
        return {
          symbol: item.symbol!,
          name: item.name || item.symbol!,
          price: Number(item.price),
          changePercent,
          source: "live" as const,
          score: Number((momentum * 0.7 + 58 * 0.15 + 55 * 0.15).toFixed(1)),
          factorScores: { momentum, volatility: 58, sentiment: 55, participation: 55 },
          rationale: "Live market gainer data via Financial Modeling Prep."
        } satisfies StockSuggestion;
      });

    return suggestions.length > 0 ? suggestions : null;
  } catch {
    return null;
  }
}

export async function getBestShares(): Promise<StockSuggestion[]> {
  const fallbackUniverse = buildFallbackSuggestions();
  if (!config.FINNHUB_API_KEY) {
    const [yahoo, alpha, fmp] = await Promise.all([getYahooSuggestions(), getAlphaVantageSuggestions(), getFmpSuggestions()]);
    const merged = rankAndLimit(mergeUniqueSuggestions(yahoo ?? [], alpha ?? [], fmp ?? [], fallbackUniverse, fallbackSuggestions));
    if (merged.length > 0) {
      return merged;
    }

    if (config.STRICT_LIVE_MODE) {
      throwLiveDataUnavailable(
        "Live best shares unavailable",
        "FINNHUB_API_KEY is not configured, and Yahoo/Alpha Vantage providers are unavailable"
      );
    }

    return rankAndLimit(mergeUniqueSuggestions(fallbackUniverse, fallbackSuggestions));
  }

  try {
    const candidates = await Promise.all(
      universe.map(async (stock) => {
        const quoteUrl = new URL("https://finnhub.io/api/v1/quote");
        quoteUrl.searchParams.set("symbol", stock.symbol);
        quoteUrl.searchParams.set("token", config.FINNHUB_API_KEY!);

        const sentimentUrl = new URL("https://finnhub.io/api/v1/news-sentiment");
        sentimentUrl.searchParams.set("symbol", stock.symbol);
        sentimentUrl.searchParams.set("token", config.FINNHUB_API_KEY!);

        const metricUrl = new URL("https://finnhub.io/api/v1/stock/metric");
        metricUrl.searchParams.set("symbol", stock.symbol);
        metricUrl.searchParams.set("metric", "all");
        metricUrl.searchParams.set("token", config.FINNHUB_API_KEY!);

        try {
          const [quoteResponse, sentimentResponse, metricResponse] = await Promise.all([
            fetch(quoteUrl),
            fetch(sentimentUrl),
            fetch(metricUrl)
          ]);

          if (!quoteResponse.ok || !sentimentResponse.ok) {
            return null;
          }

          const quote = (await quoteResponse.json()) as FinnhubQuote;
          const sentimentPayload = (await sentimentResponse.json()) as FinnhubSentiment;
          const metricPayload = metricResponse.ok ? ((await metricResponse.json()) as FinnhubMetric) : null;

          if (!Number.isFinite(quote.c) || !Number.isFinite(quote.dp) || !Number.isFinite(quote.pc)) {
            return null;
          }

          const rangePercent =
            quote.pc > 0 && Number.isFinite(quote.h) && Number.isFinite(quote.l)
              ? ((quote.h - quote.l) / quote.pc) * 100
              : 0;

          const newsSentiment =
            typeof sentimentPayload.sentiment?.companyNewsScore === "number"
              ? sentimentPayload.sentiment.companyNewsScore
              : typeof sentimentPayload.sentiment?.bullishPercent === "number" &&
                  typeof sentimentPayload.sentiment?.bearishPercent === "number"
                ? (sentimentPayload.sentiment.bullishPercent - sentimentPayload.sentiment.bearishPercent) / 100
                : 0;

          const buzz = sentimentPayload.buzz?.buzz ?? 0;
          const weeklyAverage = sentimentPayload.buzz?.weeklyAverage ?? 0;

          const momentum = scoreMomentum(quote.dp);
          const volatility = scoreVolatility(rangePercent);
          const sentiment = scoreSentiment(newsSentiment);
          const participation = scoreParticipation(buzz, weeklyAverage);
          const fundamentals = parseFundamentals(metricPayload);
          const fundamentalsScore = scoreFundamentals(fundamentals);

          const score =
            typeof fundamentalsScore === "number"
              ? momentum * 0.35 +
                fundamentalsScore * 0.2 +
                volatility * 0.1 +
                sentiment * 0.2 +
                participation * 0.15
              : momentum * 0.45 +
                volatility * 0.15 +
                sentiment * 0.25 +
                participation * 0.15;

          return {
            symbol: stock.symbol,
            name: stock.name,
            sector: stock.sector,
            price: quote.c,
            changePercent: quote.dp,
            score: Number(score.toFixed(1)),
            source: "live",
            factorScores: {
              momentum: Number(momentum.toFixed(1)),
              volatility: Number(volatility.toFixed(1)),
              sentiment: Number(sentiment.toFixed(1)),
              participation: Number(participation.toFixed(1)),
              fundamentals: typeof fundamentalsScore === "number" ? Number(fundamentalsScore.toFixed(1)) : undefined
            },
            fundamentals,
            rationale: buildRationale({
              momentum,
              volatility,
              sentiment,
              participation,
              fundamentals: fundamentalsScore
            })
          } satisfies StockSuggestion;
        } catch {
          return null;
        }
      })
    );

    const validCandidates = candidates.filter((item): item is NonNullable<typeof item> => item !== null);

    const [yahoo, alpha, fmp] = await Promise.all([getYahooSuggestions(), getAlphaVantageSuggestions(), getFmpSuggestions()]);
    const ranked = rankAndLimit(mergeUniqueSuggestions(validCandidates, yahoo ?? [], alpha ?? [], fmp ?? [], fallbackUniverse, fallbackSuggestions));

    if (ranked.length > 0) {
      return ranked;
    }

    if (config.STRICT_LIVE_MODE) {
      throwLiveDataUnavailable("Live best shares unavailable", "Live providers are unavailable");
    }

    return rankAndLimit(mergeUniqueSuggestions(fallbackUniverse, fallbackSuggestions));
  } catch {
    const [yahoo, alpha, fmp] = await Promise.all([getYahooSuggestions(), getAlphaVantageSuggestions(), getFmpSuggestions()]);
    const merged = rankAndLimit(mergeUniqueSuggestions(yahoo ?? [], alpha ?? [], fmp ?? [], fallbackUniverse, fallbackSuggestions));
    if (merged.length > 0) {
      return merged;
    }

    if (config.STRICT_LIVE_MODE) {
      throwLiveDataUnavailable("Live best shares unavailable", "Live providers are unavailable");
    }

    return rankAndLimit(mergeUniqueSuggestions(fallbackUniverse, fallbackSuggestions));
  }
}
