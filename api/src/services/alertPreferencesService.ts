import { config } from "../config.js";

export type AlertAsset = "forex" | "commodities" | "oil" | "shares";

export type AlertPreferences = {
  enabled: boolean;
  enabledAssets: AlertAsset[];
  minConfidence: number; // 0-100, minimum impact confidence to notify
  watchKeywords: string[]; // allowlist; empty means allow all
  mutedKeywords: string[]; // blocklist
  quietHours: { startHour: number; endHour: number } | null; // server-local hours 0-23
  updatedAt: string;
};

const ALL_ASSETS: AlertAsset[] = ["forex", "commodities", "oil", "shares"];

const DEFAULT_PREFERENCES: AlertPreferences = {
  enabled: true,
  enabledAssets: [...ALL_ASSETS],
  minConfidence: 60,
  watchKeywords: [],
  mutedKeywords: [],
  quietHours: null,
  updatedAt: new Date(0).toISOString()
};

const PREFERENCES_KEY = "default";

let preferences: AlertPreferences = { ...DEFAULT_PREFERENCES };
let loadAttempted = false;

function canPersist(): boolean {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders(): Record<string, string> {
  return {
    apikey: config.SUPABASE_SERVICE_ROLE_KEY as string,
    Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
  };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(num)));
}

function sanitizeAssets(value: unknown): AlertAsset[] {
  if (!Array.isArray(value)) {
    return [...ALL_ASSETS];
  }
  const filtered = value.filter((item): item is AlertAsset => ALL_ASSETS.includes(item as AlertAsset));
  return filtered.length ? Array.from(new Set(filtered)) : [...ALL_ASSETS];
}

function sanitizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0)
    )
  ).slice(0, 50);
}

function sanitizeQuietHours(value: unknown): AlertPreferences["quietHours"] {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as { startHour?: unknown; endHour?: unknown };
  if (record.startHour === undefined || record.endHour === undefined) {
    return null;
  }
  return {
    startHour: clampInt(record.startHour, 0, 23, 0),
    endHour: clampInt(record.endHour, 0, 23, 0)
  };
}

export function sanitizePreferences(input: Partial<AlertPreferences>): AlertPreferences {
  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULT_PREFERENCES.enabled,
    enabledAssets: sanitizeAssets(input.enabledAssets),
    minConfidence: clampInt(input.minConfidence, 0, 100, DEFAULT_PREFERENCES.minConfidence),
    watchKeywords: sanitizeKeywords(input.watchKeywords),
    mutedKeywords: sanitizeKeywords(input.mutedKeywords),
    quietHours: sanitizeQuietHours(input.quietHours),
    updatedAt: new Date().toISOString()
  };
}

async function loadPersistedPreferences(): Promise<void> {
  if (loadAttempted || !canPersist()) {
    loadAttempted = true;
    return;
  }
  loadAttempted = true;

  try {
    const url = `${config.SUPABASE_URL}/rest/v1/${config.SUPABASE_ALERT_PREFS_TABLE}?prefs_key=eq.${PREFERENCES_KEY}&select=payload`;
    const response = await fetch(url, { headers: supabaseHeaders() });
    if (!response.ok) {
      return;
    }
    const rows = await response.json() as { payload?: Partial<AlertPreferences> }[];
    const payload = rows?.[0]?.payload;
    if (payload) {
      preferences = sanitizePreferences(payload);
    }
  } catch {
    // Best-effort: keep in-memory defaults.
  }
}

async function persistPreferences(): Promise<void> {
  if (!canPersist()) {
    return;
  }
  try {
    const url = `${config.SUPABASE_URL}/rest/v1/${config.SUPABASE_ALERT_PREFS_TABLE}`;
    await fetch(url, {
      method: "POST",
      headers: {
        ...supabaseHeaders(),
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify({ prefs_key: PREFERENCES_KEY, payload: preferences, updated_at: preferences.updatedAt })
    });
  } catch {
    // Best-effort persistence.
  }
}

export async function getAlertPreferences(): Promise<AlertPreferences> {
  await loadPersistedPreferences();
  return preferences;
}

export async function updateAlertPreferences(input: Partial<AlertPreferences>): Promise<AlertPreferences> {
  await loadPersistedPreferences();
  preferences = sanitizePreferences({ ...preferences, ...input });
  await persistPreferences();
  return preferences;
}

function withinQuietHours(quietHours: AlertPreferences["quietHours"], now = new Date()): boolean {
  if (!quietHours) {
    return false;
  }
  const hour = now.getHours();
  const { startHour, endHour } = quietHours;
  if (startHour === endHour) {
    return false;
  }
  if (startHour < endHour) {
    return hour >= startHour && hour < endHour;
  }
  // Overnight window (e.g. 22 -> 6).
  return hour >= startHour || hour < endHour;
}

type AlertNewsImpact = {
  asset: AlertAsset | string;
  direction: "Up" | "Down" | "Neutral";
  confidence: number;
};

type AlertNewsItem = {
  title: string;
  summary: string;
  impacts: AlertNewsImpact[];
};

// Decide whether a news item should trigger a notification under the active preferences.
export function shouldNotifyForNews(item: AlertNewsItem, prefs: AlertPreferences, now = new Date()): boolean {
  if (!prefs.enabled) {
    return false;
  }
  if (withinQuietHours(prefs.quietHours, now)) {
    return false;
  }

  const haystack = `${item.title} ${item.summary}`.toLowerCase();

  if (prefs.mutedKeywords.some((keyword) => haystack.includes(keyword))) {
    return false;
  }

  if (prefs.watchKeywords.length > 0 && !prefs.watchKeywords.some((keyword) => haystack.includes(keyword))) {
    return false;
  }

  const relevantImpacts = item.impacts.filter(
    (impact) => prefs.enabledAssets.includes(impact.asset as AlertAsset) && impact.direction !== "Neutral"
  );

  if (relevantImpacts.length === 0) {
    return false;
  }

  const maxConfidence = relevantImpacts.reduce((max, impact) => Math.max(max, impact.confidence), 0);
  return maxConfidence >= prefs.minConfidence;
}
