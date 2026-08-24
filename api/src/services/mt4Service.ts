import { config } from "../config.js";

export type Mt4Position = {
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  openPrice: number;
  profit: number;
  stopLoss?: number;
  takeProfit?: number;
};

export type Mt4PendingOrder = {
  symbol: string;
  type: "BUY_LIMIT" | "BUY_STOP" | "SELL_LIMIT" | "SELL_STOP";
  price: number;
  volume: number;
  stopLoss?: number;
  takeProfit?: number;
};

export type Mt4Quote = {
  symbol: string;
  bid: number;
  ask: number;
  spread?: number;
  timestamp: string;
};

export type Mt4Snapshot = {
  accountId: string;
  terminalId: string;
  server?: string;
  timestamp: string;
  heartbeat?: number;
  balance?: number;
  equity?: number;
  margin?: number;
  freeMargin?: number;
  positions?: Mt4Position[];
  pendingOrders?: Mt4PendingOrder[];
  quotes?: Mt4Quote[];
};

export type Mt4SnapshotResponse = Mt4Snapshot & {
  source: "mt4" | "api-fallback";
  receivedAt: string;
  ageSeconds: number;
  healthStatus: "fresh" | "stale" | "offline";
  healthNote: string;
};

export type Mt4QuoteFeedResponse = {
  source: "mt4" | "api-fallback";
  provider?: string;
  receivedAt: string;
  timestamp: string;
  heartbeat?: number;
  ageSeconds: number;
  healthStatus: "fresh" | "stale" | "offline";
  healthNote: string;
  quotes: Mt4Quote[];
};

function describeSnapshotHealth(ageSeconds: number) {
  if (ageSeconds <= 30) {
    return {
      healthStatus: "fresh" as const,
      healthNote: "Snapshot is live (<= 30s old)"
    };
  }

  if (ageSeconds <= 180) {
    return {
      healthStatus: "stale" as const,
      healthNote: "Snapshot is delayed (> 30s old)"
    };
  }

  return {
    healthStatus: "offline" as const,
    healthNote: "Snapshot feed appears offline (> 3m old)"
  };
}

let latestSnapshot: Mt4SnapshotResponse | null = null;
let persistenceLoadAttempted = false;

function supabaseHeaders() {
  return {
    apikey: config.SUPABASE_SERVICE_ROLE_KEY ?? "",
    Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
    "Content-Type": "application/json"
  };
}

function canPersistSnapshots() {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY);
}

async function loadPersistedSnapshot() {
  if (persistenceLoadAttempted || !canPersistSnapshots()) {
    return;
  }

  persistenceLoadAttempted = true;
  try {
    const url = `${config.SUPABASE_URL}/rest/v1/${config.SUPABASE_MT5_SNAPSHOT_TABLE}?snapshot_key=eq.latest&select=payload&limit=1`;
    const response = await fetch(url, { headers: supabaseHeaders() });
    if (!response.ok) {
      return;
    }

    const rows = await response.json() as Array<{ payload?: Mt4Snapshot }>;
    const snapshot = rows[0]?.payload;
    if (snapshot) {
      materializeSnapshot(snapshot);
    }
  } catch {
    // Render remains available with in-memory state if Supabase is unavailable.
  }
}

function persistSnapshot(snapshot: Mt4Snapshot) {
  if (!canPersistSnapshots()) {
    return;
  }

  const url = `${config.SUPABASE_URL}/rest/v1/${config.SUPABASE_MT5_SNAPSHOT_TABLE}`;
  void fetch(url, {
    method: "POST",
    headers: { ...supabaseHeaders(), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ snapshot_key: "latest", payload: snapshot, updated_at: new Date().toISOString() })
  }).catch(() => {
    // Keep the live process usable during a temporary database outage.
  });
}

function materializeSnapshot(snapshot: Mt4Snapshot) {
  const receivedAt = new Date().toISOString();
  const parsedTimestamp = Date.parse(snapshot.timestamp);
  const timestamp = Number.isFinite(parsedTimestamp) ? snapshot.timestamp : receivedAt;
  const ageSeconds = Math.max(0, Math.round((Date.now() - Date.parse(timestamp)) / 1000));
  const health = describeSnapshotHealth(ageSeconds);

  latestSnapshot = {
    ...snapshot,
    timestamp,
    source: "mt4",
    receivedAt,
    ageSeconds,
    ...health
  };
  return latestSnapshot;
}

export async function storeMt4Snapshot(snapshot: Mt4Snapshot): Promise<Mt4SnapshotResponse> {
  const materialized = materializeSnapshot(snapshot);
  persistSnapshot(snapshot);
  return materialized;
}

export async function getLatestMt4Snapshot(): Promise<Mt4SnapshotResponse | null> {
  await loadPersistedSnapshot();
  if (!latestSnapshot) {
    return null;
  }

  const ageSeconds = Math.max(0, Math.round((Date.now() - Date.parse(latestSnapshot.timestamp)) / 1000));
  const health = describeSnapshotHealth(ageSeconds);
  return {
    ...latestSnapshot,
    ageSeconds,
    ...health
  };
}