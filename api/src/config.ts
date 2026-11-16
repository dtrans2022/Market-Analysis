import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().default(8080),
  MARKETAUX_API_KEY: z.string().optional(),
  FINNHUB_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  FMP_API_KEY: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  SLACK_WEBHOOK_URLS: z.string().optional(),
  SLACK_NOTIFY_USER_IDS: z.string().optional(),
  MT4_SNAPSHOT_API_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_MT5_SNAPSHOT_TABLE: z.string().default("mt5_snapshots"),
  SUPABASE_FOREX_LEDGER_TABLE: z.string().default("forex_trade_ledger"),
  SUPABASE_ALERT_PREFS_TABLE: z.string().default("alert_preferences"),
  AUTO_NEWS_TO_SLACK_ENABLED: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  STRICT_LIVE_MODE: z
    .string()
    .optional()
    .default("false")
    .transform((value) => value !== "false"),
  NEWS_POLL_INTERVAL_MS: z.coerce.number().default(60_000),
  NEWS_SENTIMENT_LLM_ENABLED: z
    .string()
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  NEWS_SENTIMENT_LLM_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  NEWS_SENTIMENT_LLM_API_KEY: z.string().optional(),
  NEWS_SENTIMENT_LLM_MODEL: z.string().default("gpt-4o-mini"),
  ALLOWED_ORIGIN: z.string().default("*"),
  SELF_PUBLIC_URL: z.string().url().optional(),
  SELF_HEAL_ENABLED: z
    .string()
    .optional()
    .default("true")
    .transform((value) => value !== "false"),
  SELF_HEAL_INTERVAL_MS: z.coerce.number().default(1_800_000),
  MAJOR_NEWS_ONLY: z
    .string()
    .optional()
    .default("true")
    .transform((value) => value !== "false"),
  MAJOR_NEWS_MIN_CONFIDENCE: z.coerce.number().default(0.7),
  SIGNAL_ALERTS_ENABLED: z
    .string()
    .optional()
    .default("true")
    .transform((value) => value !== "false"),
  SIGNAL_POLL_INTERVAL_MS: z.coerce.number().default(900_000),
  SIGNAL_MIN_CONFIDENCE: z.coerce.number().default(65)
});

export const config = schema.parse(process.env);
