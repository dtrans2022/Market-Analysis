import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { fetchAlertPreferences, fetchMt4Quotes, fetchMt4Snapshot, fetchNotifierStatus, postSlackAlert, updateAlertPreferences } from "../api/client";
import { REFRESH_INTERVAL_MS } from "../constants";
import { usePollingData } from "../hooks/usePollingData";
import { theme } from "../theme";
import { SectionCard } from "../components/SectionCard";
import { AlertAsset, Mt4Quote } from "../types";

function getHealthColor(status: "fresh" | "stale" | "offline") {
  if (status === "fresh") {
    return "#36d28f";
  }

  if (status === "stale") {
    return "#ffb84d";
  }

  return theme.colors.negative;
}

export function SettingsScreen() {
  const [message, setMessage] = useState("Alert: Review USD volatility and energy exposure before next session.");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const notifier = usePollingData(fetchNotifierStatus, REFRESH_INTERVAL_MS);
  const mt4Quotes = usePollingData(fetchMt4Quotes, 60_000);
  const mt4Snapshot = usePollingData(fetchMt4Snapshot, 60_000);
  const syncNotice = notifier.notice ?? mt4Snapshot.notice;
  const syncHealthy = !syncNotice;
  const syncStatusLabel = syncHealthy ? "Live data synced" : "Live data delayed, using cached data";

  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [enabledAssets, setEnabledAssets] = useState<AlertAsset[]>(["forex", "commodities", "oil", "shares"]);
  const [minConfidence, setMinConfidence] = useState("60");
  const [watchKeywords, setWatchKeywords] = useState("");
  const [mutedKeywords, setMutedKeywords] = useState("");
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsSaving, setAlertsSaving] = useState(false);
  const [alertsStatus, setAlertsStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const prefs = await fetchAlertPreferences();
        if (!active) {
          return;
        }
        setAlertsEnabled(prefs.enabled);
        setEnabledAssets(prefs.enabledAssets);
        setMinConfidence(String(prefs.minConfidence));
        setWatchKeywords(prefs.watchKeywords.join(", "));
        setMutedKeywords(prefs.mutedKeywords.join(", "));
        setQuietStart(prefs.quietHours ? String(prefs.quietHours.startHour) : "");
        setQuietEnd(prefs.quietHours ? String(prefs.quietHours.endHour) : "");
      } catch (error) {
        if (active) {
          setAlertsStatus(error instanceof Error ? error.message : "Failed to load alert preferences");
        }
      } finally {
        if (active) {
          setAlertsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function toggleAsset(asset: AlertAsset) {
    setEnabledAssets((current) =>
      current.includes(asset) ? current.filter((item) => item !== asset) : [...current, asset]
    );
  }

  function parseKeywords(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  async function saveAlertPreferences() {
    setAlertsSaving(true);
    setAlertsStatus(null);
    try {
      const start = Number(quietStart);
      const end = Number(quietEnd);
      const quietHours =
        quietStart.trim() !== "" && quietEnd.trim() !== "" && Number.isFinite(start) && Number.isFinite(end)
          ? { startHour: Math.max(0, Math.min(23, Math.round(start))), endHour: Math.max(0, Math.min(23, Math.round(end))) }
          : null;
      const confidence = Number(minConfidence);
      const saved = await updateAlertPreferences({
        enabled: alertsEnabled,
        enabledAssets,
        minConfidence: Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence))) : 60,
        watchKeywords: parseKeywords(watchKeywords),
        mutedKeywords: parseKeywords(mutedKeywords),
        quietHours
      });
      setAlertsEnabled(saved.enabled);
      setEnabledAssets(saved.enabledAssets);
      setMinConfidence(String(saved.minConfidence));
      setWatchKeywords(saved.watchKeywords.join(", "));
      setMutedKeywords(saved.mutedKeywords.join(", "));
      setQuietStart(saved.quietHours ? String(saved.quietHours.startHour) : "");
      setQuietEnd(saved.quietHours ? String(saved.quietHours.endHour) : "");
      setAlertsStatus("Alert preferences saved.");
    } catch (error) {
      setAlertsStatus(error instanceof Error ? error.message : "Failed to save alert preferences");
    } finally {
      setAlertsSaving(false);
    }
  }

  const liveQuotes = mt4Quotes.data?.quotes ?? [];
  const liveQuotesFresh = mt4Quotes.data?.healthStatus === "fresh" && liveQuotes.length > 0;

  function renderQuoteRow(quote: Mt4Quote) {
    return `${quote.symbol}: Bid ${quote.bid.toFixed(5)} | Ask ${quote.ask.toFixed(5)}`;
  }

  async function sendAlert() {
    setSending(true);
    setStatus(null);
    try {
      await postSlackAlert(message);
      setStatus("Notification sent to Slack.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Slack notification failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <View>
      <SectionCard title="Data Sync" subtitle="Background data status">
        <View style={[styles.syncBadge, syncHealthy ? styles.syncBadgeHealthy : styles.syncBadgeDelayed]}>
          <Text style={styles.syncBadgeText}>{syncStatusLabel}</Text>
        </View>
      </SectionCard>

      <SectionCard title="MT4 Realtime Feed" subtitle="Live bid/ask quotes streamed from the EA/WebRequest bridge">
        {mt4Quotes.loading ? <Text style={styles.neutral}>Loading MT4 realtime feed...</Text> : null}
        {mt4Quotes.error ? <Text style={styles.error}>{mt4Quotes.error}</Text> : null}

        {mt4Quotes.data ? (
          <>
            <Text style={[styles.healthBadge, { color: getHealthColor(mt4Quotes.data.healthStatus) }]}>
              Feed Health: {mt4Quotes.data.healthStatus.toUpperCase()}
            </Text>
            <Text style={styles.healthNote}>
              Source: {mt4Quotes.data.source === "api-fallback" ? `Live API fallback${mt4Quotes.data.provider ? ` (${mt4Quotes.data.provider})` : ""}` : "MT5 bridge"}
            </Text>
            <Text style={styles.healthNote}>{mt4Quotes.data.healthNote}</Text>
            <Text style={styles.statusLine}>Heartbeat: {mt4Quotes.data.heartbeat ?? "-"}</Text>
            <Text style={styles.statusLine}>Quotes: {liveQuotes.length}</Text>
            <Text style={styles.statusLine}>Last Update: {new Date(mt4Quotes.data.timestamp).toLocaleString()}</Text>
            <Text style={styles.statusLine}>Age: {mt4Quotes.data.ageSeconds}s</Text>

            <Pressable style={styles.secondaryButton} onPress={() => void mt4Quotes.reload()}>
              <Text style={styles.secondaryButtonText}>Refresh Realtime Feed</Text>
            </Pressable>

            {liveQuotes.length ? (
              <View style={styles.listBlock}>
                <Text style={styles.listTitle}>{liveQuotesFresh ? "Live Quotes" : "Latest Quotes"}</Text>
                {liveQuotes.slice(0, 5).map((quote) => (
                  <Text key={`${quote.symbol}-${quote.timestamp}`} style={styles.listItem}>
                    {renderQuoteRow(quote)}
                  </Text>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.neutral}>The realtime feed will appear here once the EA starts publishing quotes.</Text>
        )}
      </SectionCard>

      <SectionCard title="Slack Notifications" subtitle="Push market updates directly to your trading channel">
        <Text style={styles.label}>Alert message</Text>
        <TextInput
          multiline
          value={message}
          onChangeText={setMessage}
          style={styles.input}
          placeholder="Write a market alert"
          placeholderTextColor="#7ea3b5"
        />
        <Pressable style={styles.button} onPress={() => void sendAlert()} disabled={sending}>
          {sending ? <ActivityIndicator color="#06222e" /> : <Text style={styles.buttonText}>Send to Slack</Text>}
        </Pressable>
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </SectionCard>

      <SectionCard title="Alert Preferences" subtitle="Control which market news alerts get pushed to Slack">
        {alertsLoading ? <Text style={styles.neutral}>Loading alert preferences...</Text> : null}

        <View style={styles.rowBetween}>
          <Text style={styles.label}>Alerts enabled</Text>
          <Pressable
            style={[styles.toggle, alertsEnabled ? styles.toggleOn : styles.toggleOff]}
            onPress={() => setAlertsEnabled((value) => !value)}
          >
            <Text style={styles.toggleText}>{alertsEnabled ? "ON" : "OFF"}</Text>
          </Pressable>
        </View>

        <Text style={[styles.label, styles.spacedLabel]}>Asset classes</Text>
        <View style={styles.chipRow}>
          {(["forex", "commodities", "oil", "shares"] as AlertAsset[]).map((asset) => {
            const active = enabledAssets.includes(asset);
            return (
              <Pressable
                key={asset}
                style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                onPress={() => toggleAsset(asset)}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                  {asset.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, styles.spacedLabel]}>Minimum confidence (%)</Text>
        <TextInput
          value={minConfidence}
          onChangeText={setMinConfidence}
          keyboardType="numeric"
          style={styles.inlineInput}
          placeholder="60"
          placeholderTextColor="#7ea3b5"
        />

        <Text style={[styles.label, styles.spacedLabel]}>Watch keywords (comma separated, empty = all)</Text>
        <TextInput
          value={watchKeywords}
          onChangeText={setWatchKeywords}
          style={styles.inlineInput}
          placeholder="fed, cpi, oil"
          placeholderTextColor="#7ea3b5"
        />

        <Text style={[styles.label, styles.spacedLabel]}>Muted keywords (comma separated)</Text>
        <TextInput
          value={mutedKeywords}
          onChangeText={setMutedKeywords}
          style={styles.inlineInput}
          placeholder="crypto, celebrity"
          placeholderTextColor="#7ea3b5"
        />

        <Text style={[styles.label, styles.spacedLabel]}>Quiet hours (server local, 0-23; leave empty to disable)</Text>
        <View style={styles.chipRow}>
          <TextInput
            value={quietStart}
            onChangeText={setQuietStart}
            keyboardType="numeric"
            style={[styles.inlineInput, styles.halfInput]}
            placeholder="Start e.g. 22"
            placeholderTextColor="#7ea3b5"
          />
          <TextInput
            value={quietEnd}
            onChangeText={setQuietEnd}
            keyboardType="numeric"
            style={[styles.inlineInput, styles.halfInput]}
            placeholder="End e.g. 6"
            placeholderTextColor="#7ea3b5"
          />
        </View>

        <Pressable style={styles.button} onPress={() => void saveAlertPreferences()} disabled={alertsSaving}>
          {alertsSaving ? <ActivityIndicator color="#06222e" /> : <Text style={styles.buttonText}>Save Preferences</Text>}
        </Pressable>
        {alertsStatus ? <Text style={styles.status}>{alertsStatus}</Text> : null}
      </SectionCard>

      <SectionCard title="Notifier Health" subtitle="Auto news-to-Slack runtime status">
        {notifier.loading ? <Text style={styles.neutral}>Loading notifier status...</Text> : null}
        {notifier.error ? <Text style={styles.error}>{notifier.error}</Text> : null}

        {notifier.data ? (
          <>
            <Text style={styles.statusLine}>Enabled: {notifier.data.enabled ? "Yes" : "No"}</Text>
            <Text style={styles.statusLine}>Running: {notifier.data.running ? "Yes" : "No"}</Text>
            <Text style={styles.statusLine}>Targets: {notifier.data.targets}</Text>
            <Text style={styles.statusLine}>Poll Interval: {notifier.data.intervalMs ?? 0} ms</Text>
            <Text style={styles.statusLine}>Last Source: {notifier.data.lastSource ?? "-"}</Text>
            <Text style={styles.statusLine}>Last Sent Batch: {notifier.data.lastSentCount}</Text>
            <Text style={styles.statusLine}>Total Sent: {notifier.data.totalSentCount}</Text>
            <Text style={styles.statusLine}>
              Last Success: {notifier.data.lastSuccessAt ? new Date(notifier.data.lastSuccessAt).toLocaleString() : "-"}
            </Text>
            <Text style={styles.statusLine}>
              Last Error: {notifier.data.lastError ? notifier.data.lastError : "None"}
            </Text>

            <Pressable style={styles.secondaryButton} onPress={() => void notifier.reload()}>
              <Text style={styles.secondaryButtonText}>Refresh Status</Text>
            </Pressable>
          </>
        ) : null}
      </SectionCard>

      <SectionCard title="MT4 Broker Snapshot" subtitle="Latest account snapshot pushed from the same realtime bridge">
        {mt4Snapshot.loading ? <Text style={styles.neutral}>Loading MT4 broker snapshot...</Text> : null}
        {mt4Snapshot.error ? <Text style={styles.error}>{mt4Snapshot.error}</Text> : null}

        {mt4Snapshot.data ? (
          <>
            <Text style={[styles.healthBadge, { color: getHealthColor(mt4Snapshot.data.healthStatus) }]}>
              Feed Health: {mt4Snapshot.data.healthStatus.toUpperCase()}
            </Text>
            <Text style={styles.healthNote}>{mt4Snapshot.data.healthNote}</Text>
            <Text style={styles.statusLine}>Account: {mt4Snapshot.data.accountId}</Text>
            <Text style={styles.statusLine}>Terminal: {mt4Snapshot.data.terminalId}</Text>
            <Text style={styles.statusLine}>Heartbeat: {mt4Snapshot.data.heartbeat ?? "-"}</Text>
            <Text style={styles.statusLine}>Server: {mt4Snapshot.data.server ?? "-"}</Text>
            <Text style={styles.statusLine}>Balance: {mt4Snapshot.data.balance?.toFixed(2) ?? "-"}</Text>
            <Text style={styles.statusLine}>Equity: {mt4Snapshot.data.equity?.toFixed(2) ?? "-"}</Text>
            <Text style={styles.statusLine}>Free Margin: {mt4Snapshot.data.freeMargin?.toFixed(2) ?? "-"}</Text>
            <Text style={styles.statusLine}>Positions: {mt4Snapshot.data.positions?.length ?? 0}</Text>
            <Text style={styles.statusLine}>Pending Orders: {mt4Snapshot.data.pendingOrders?.length ?? 0}</Text>
            <Text style={styles.statusLine}>Quotes: {mt4Snapshot.data.quotes?.length ?? 0}</Text>
            <Text style={styles.statusLine}>Last Update: {new Date(mt4Snapshot.data.timestamp).toLocaleString()}</Text>
            <Text style={styles.statusLine}>Age: {mt4Snapshot.data.ageSeconds}s</Text>

            <Pressable style={styles.secondaryButton} onPress={() => void mt4Snapshot.reload()}>
              <Text style={styles.secondaryButtonText}>Refresh Broker Snapshot</Text>
            </Pressable>

            {mt4Snapshot.data.quotes?.length ? (
              <View style={styles.listBlock}>
                <Text style={styles.listTitle}>Quotes</Text>
                {mt4Snapshot.data.quotes.slice(0, 5).map((quote) => (
                  <Text key={`${quote.symbol}-${quote.timestamp}`} style={styles.listItem}>
                    {quote.symbol}: Bid {quote.bid.toFixed(5)} | Ask {quote.ask.toFixed(5)}
                  </Text>
                ))}
              </View>
            ) : null}

            {mt4Snapshot.data.positions?.length ? (
              <View style={styles.listBlock}>
                <Text style={styles.listTitle}>Open Positions</Text>
                {mt4Snapshot.data.positions.slice(0, 5).map((position) => (
                  <Text key={`${position.symbol}-${position.side}-${position.openPrice}`} style={styles.listItem}>
                    {position.symbol}: {position.side} {position.volume} @ {position.openPrice.toFixed(5)} | P/L {position.profit.toFixed(2)}
                  </Text>
                ))}
              </View>
            ) : null}

            {mt4Snapshot.data.pendingOrders?.length ? (
              <View style={styles.listBlock}>
                <Text style={styles.listTitle}>Pending Orders</Text>
                {mt4Snapshot.data.pendingOrders.slice(0, 5).map((order) => (
                  <Text key={`${order.symbol}-${order.type}-${order.price}`} style={styles.listItem}>
                    {order.symbol}: {order.type} {order.volume} @ {order.price.toFixed(5)}
                  </Text>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.neutral}>Attach the EA and start the feed to see broker data here.</Text>
        )}
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: theme.colors.text,
    marginBottom: 6,
    fontWeight: "600"
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#275269",
    color: theme.colors.text,
    backgroundColor: theme.colors.panelAlt,
    padding: 10,
    minHeight: 100,
    textAlignVertical: "top"
  },
  button: {
    marginTop: 12,
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonText: {
    color: "#06222e",
    fontWeight: "700"
  },
  status: {
    marginTop: 10,
    color: theme.colors.muted
  },
  neutral: {
    color: theme.colors.muted
  },
  error: {
    color: theme.colors.negative,
    marginBottom: 8
  },
  statusLine: {
    color: theme.colors.text,
    marginBottom: 4,
    fontSize: 12
  },
  healthBadge: {
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: 0.2
  },
  healthNote: {
    color: theme.colors.muted,
    marginBottom: 8,
    fontSize: 12
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: "#1d4f66",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: "700"
  },
  listBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#275269"
  },
  listTitle: {
    color: theme.colors.accent,
    fontWeight: "800",
    marginBottom: 6
  },
  listItem: {
    color: theme.colors.text,
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16
  },
  syncBadge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  syncBadgeHealthy: {
    borderColor: "#2d7f5a",
    backgroundColor: "#14392c"
  },
  syncBadgeDelayed: {
    borderColor: "#8a6f2d",
    backgroundColor: "#3a3116"
  },
  syncBadgeText: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 12
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  spacedLabel: {
    marginTop: 14
  },
  toggle: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 58,
    alignItems: "center"
  },
  toggleOn: {
    backgroundColor: "#14392c",
    borderWidth: 1,
    borderColor: "#2d7f5a"
  },
  toggleOff: {
    backgroundColor: "#3a1616",
    borderWidth: 1,
    borderColor: "#7f2d2d"
  },
  toggleText: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 12
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1
  },
  chipActive: {
    backgroundColor: "#14392c",
    borderColor: "#2d7f5a"
  },
  chipInactive: {
    backgroundColor: theme.colors.panelAlt,
    borderColor: "#275269"
  },
  chipText: {
    fontWeight: "700",
    fontSize: 12
  },
  chipTextActive: {
    color: "#6fe3ad"
  },
  chipTextInactive: {
    color: theme.colors.muted
  },
  inlineInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#275269",
    color: theme.colors.text,
    backgroundColor: theme.colors.panelAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4
  },
  halfInput: {
    flex: 1
  }
});
