import { config } from "../config.js";
import { getMarketAgentsAnalysis, type MarketAgentTimeframeSignal } from "./marketAgentService.js";
import { getGlobalMarketNews, type NewsItem } from "./newsService.js";
import { getSlackWebhookUrls, sendSlackNotification } from "./slackService.js";

const lastSignature = new Map<string, string>();
let seeded = false;
let timer: NodeJS.Timeout | null = null;

const CATEGORY_LABEL: Record<string, string> = { forex: "Forex", commodity: "Commodities", oil: "Oil" };
const NEWS_ASSET_KEY: Record<string, NewsItem["impacts"][number]["asset"]> = {
  forex: "forex",
  commodity: "commodities",
  oil: "oil"
};

function prettyPattern(pattern?: string) {
  if (!pattern || pattern === "none") {
    return "No distinct candlestick pattern";
  }
  return pattern.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Net news direction for a category from recent impacts. */
function newsBias(news: NewsItem[], category: string): "up" | "down" | "neutral" {
  const key = NEWS_ASSET_KEY[category];
  let score = 0;
  for (const item of news) {
    const impact = item.impacts.find((i) => i.asset === key);
    if (!impact || impact.direction === "Neutral") {
      continue;
    }
    score += (impact.direction === "Up" ? 1 : -1) * (impact.confidence || 0.5);
  }
  if (score > 0.3) return "up";
  if (score < -0.3) return "down";
  return "neutral";
}

function buildSignalMessage(
  category: string,
  name: string,
  signal: MarketAgentTimeframeSignal,
  news: NewsItem[]
) {
  const isBuy = signal.direction === "up";
  const emaAbove = signal.currentPrice >= signal.technicals.ema50;
  const location = signal.isAtSupport ? " at support line" : signal.isAtResistance ? " at resistance line" : "";
  const volume =
    signal.volumeConfirmation === "strong"
      ? "Supporting"
      : signal.volumeConfirmation === "weak"
        ? "Not supporting"
        : signal.volumeConfirmation === "neutral"
          ? "Neutral"
          : "Unavailable";
  const bias = newsBias(news, category);
  const newsLine = bias === "neutral" ? "Neutral" : bias === signal.direction ? "Supporting" : "Against";

  return [
    `:bell: *Trade signal* — ${CATEGORY_LABEL[category] ?? category}`,
    `Pair: ${name}`,
    `Signal: *${isBuy ? "Buy" : "Sell"}*`,
    `Candlestick pattern: ${prettyPattern(signal.candlestickPattern)}${location}`,
    `50 EMA: ${emaAbove ? "Above" : "Below"}`,
    `Volumes: ${volume}`,
    `News: ${newsLine}`,
    `Timeframe: ${signal.timeframe} | Confidence: ${Math.round(signal.calibratedConfidence ?? signal.confidence)}%`
  ].join("\n");
}

async function pollSignals() {
  if (getSlackWebhookUrls().length === 0) {
    return;
  }

  const [agents, newsFeed] = await Promise.all([getMarketAgentsAnalysis(), getGlobalMarketNews()]);
  const news = newsFeed.data;

  for (const report of agents.data) {
    for (const symbol of report.symbols) {
      const signal = symbol.bestSignal;
      if (signal.direction === "neutral") {
        continue;
      }
      const confidence = signal.calibratedConfidence ?? signal.confidence;
      if (confidence < config.SIGNAL_MIN_CONFIDENCE) {
        continue;
      }

      const signature = `${signal.direction}|${signal.candlestickPattern ?? "none"}|${signal.timeframe}`;
      if (lastSignature.get(symbol.symbol) === signature) {
        continue;
      }
      lastSignature.set(symbol.symbol, signature);

      // Seed on first run so we don't blast every existing signal at startup.
      if (seeded) {
        const message = buildSignalMessage(report.category, symbol.name, signal, news);
        await sendSlackNotification(message);
        console.log(`[signal-notifier] Sent ${signal.direction} signal for ${symbol.symbol}`);
      }
    }
  }

  seeded = true;
}

export function startSignalNotifier() {
  if (!config.SIGNAL_ALERTS_ENABLED || timer) {
    return;
  }
  const intervalMs = config.SIGNAL_POLL_INTERVAL_MS;
  console.log(`[signal-notifier] Enabled, polling every ${Math.round(intervalMs / 60_000)} min`);

  const run = async () => {
    try {
      await pollSignals();
    } catch (error) {
      console.error("[signal-notifier] error:", error);
    }
  };

  void run();
  timer = setInterval(() => void run(), intervalMs);
}
