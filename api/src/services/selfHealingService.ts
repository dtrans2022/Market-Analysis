import { config } from "../config.js";
import { getMarketTrends } from "./marketService.js";
import { getSlackWebhookUrls, sendSlackNotification } from "./slackService.js";

type HealthIssue = { area: "live-data" | "connectivity"; detail: string };

let timer: NodeJS.Timeout | null = null;
let lastHealthy = true;
let running = false;

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/** Probe live market data; retry once (self-heal) before declaring it degraded. */
async function checkLiveData(): Promise<HealthIssue | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const trends = await getMarketTrends();
      if (trends.source === "live") {
        return null;
      }
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        continue;
      }
      return { area: "live-data", detail: `Live source unavailable, serving fallback: ${trends.reason ?? "unknown"}` };
    } catch (error) {
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        continue;
      }
      return { area: "live-data", detail: error instanceof Error ? error.message : "Unknown live-data error" };
    }
  }
  return null;
}

/** Probe external reachability (port/connectivity) via the public /health endpoint. */
async function checkConnectivity(): Promise<HealthIssue | null> {
  if (!config.SELF_PUBLIC_URL) {
    return null;
  }
  const url = `${config.SELF_PUBLIC_URL.replace(/\/+$/, "")}/health`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetchWithTimeout(url, 15_000);
      if (response.ok) {
        return null;
      }
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        continue;
      }
      return { area: "connectivity", detail: `Service /health returned HTTP ${response.status}` };
    } catch (error) {
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        continue;
      }
      return { area: "connectivity", detail: error instanceof Error ? error.message : "Service unreachable" };
    }
  }
  return null;
}

async function notify(message: string) {
  if (getSlackWebhookUrls().length === 0) {
    return;
  }
  try {
    await sendSlackNotification(message);
  } catch (error) {
    console.error("[self-healing] Slack notification failed:", error);
  }
}

export async function runHealthCheck() {
  if (running) {
    return;
  }
  running = true;
  try {
    const issues = (await Promise.all([checkLiveData(), checkConnectivity()])).filter(
      (issue): issue is HealthIssue => issue !== null
    );

    if (issues.length > 0) {
      lastHealthy = false;
      const lines = issues.map((issue) => `• *${issue.area}*: ${issue.detail}`).join("\n");
      await notify(`:rotating_light: *Market Analysis health check failed* (auto-recovery attempted)\n${lines}`);
      console.warn("[self-healing] Unhealthy:", issues);
      return;
    }

    if (!lastHealthy) {
      await notify(":white_check_mark: *Market Analysis service recovered* — live data and connectivity are back to normal.");
    }
    lastHealthy = true;
  } finally {
    running = false;
  }
}

export function startSelfHealingMonitor() {
  if (!config.SELF_HEAL_ENABLED || timer) {
    return;
  }
  const intervalMs = config.SELF_HEAL_INTERVAL_MS;
  console.log(`[self-healing] Monitor enabled, checking every ${Math.round(intervalMs / 60_000)} min`);
  void runHealthCheck();
  timer = setInterval(() => void runHealthCheck(), intervalMs);
}
