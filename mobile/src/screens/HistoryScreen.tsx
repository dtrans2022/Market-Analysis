import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchMarketHistory } from "../api/client";
import { SectionCard } from "../components/SectionCard";
import { theme } from "../theme";
import {
  CandlestickOutcomeDetail,
  CandlestickOutcomeSummary,
  MarketHistoryResponse,
  MarketHistoryTimeframe
} from "../types";

const CURRENCY_PAIRS = [
  "AUD/USD", "AUD/CHF", "AUD/JPY", "AUD/NZD", "CAD/JPY", "EUR/AUD", "EUR/CAD", "EUR/GBP", "EUR/JPY",
  "EUR/NZD", "EUR/USD", "GBP/AUD", "GBP/NZD", "GBP/USD", "NZD/JPY", "USD/CAD", "USD/CHF", "USD/JPY"
];

const REQUESTED_TIMEFRAMES: MarketHistoryTimeframe[] = ["1hour", "4hour", "1Day"];

const TIMEFRAME_LABEL: Record<MarketHistoryTimeframe, string> = {
  "15minute": "15m",
  "30minute": "30m",
  "1hour": "1h",
  "4hour": "4h",
  "12hour": "12h",
  "1Day": "1D",
  "1Week": "1W"
};

type DetailFilter = "occurred" | "successful" | "unsuccessful" | "neutral";

type MergedRow = {
  pair: string;
  pattern: string;
  formations: number;
  successful: number;
  unsuccessful: number;
  neutral: number;
  atSupportCount: number;
  atResistanceCount: number;
  perTimeframe: Partial<Record<MarketHistoryTimeframe, CandlestickOutcomeSummary>>;
  details: Array<CandlestickOutcomeDetail & { timeframe: MarketHistoryTimeframe }>;
};

function labelPattern(pattern: string) {
  return pattern.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function volumeLabel(detail: CandlestickOutcomeDetail) {
  return detail.volumeRatio == null
    ? "Volume unavailable"
    : `${detail.volumeRatio}x of prior 20-bar average`;
}

function formatCandleSession(timestamp: number, timeframe: MarketHistoryTimeframe) {
  const date = new Date(timestamp * 1000);
  const includeTime = timeframe !== "1Day" && timeframe !== "1Week";
  const utcOpts: Intl.DateTimeFormatOptions = includeTime
    ? { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: false }
    : { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" };
  const sydOpts: Intl.DateTimeFormatOptions = includeTime
    ? { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Australia/Sydney", hour12: false }
    : { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Australia/Sydney" };
  const utc = new Intl.DateTimeFormat("en-CA", utcOpts).format(date).replace(",", "");
  const sydney = new Intl.DateTimeFormat("en-CA", sydOpts).format(date).replace(",", "");
  return `Source UTC ${utc} | Sydney ${sydney}`;
}

function outcomeColor(outcome: CandlestickOutcomeDetail["outcome"]) {
  if (outcome === "successful") return theme.colors.positive;
  if (outcome === "unsuccessful") return theme.colors.negative;
  return theme.colors.warning;
}

function movedColor(direction: CandlestickOutcomeDetail["directionMoved"] | undefined) {
  if (direction === "up") return theme.colors.positive;
  if (direction === "down") return theme.colors.negative;
  return theme.colors.muted;
}

function decimalsFor(pair: string) {
  return /JPY$/.test(pair) ? 3 : 5;
}

function inferDirectionMoved(detail: CandlestickOutcomeDetail): "up" | "down" | "flat" {
  if (detail.directionMoved) return detail.directionMoved;
  if (detail.followThroughClose > detail.entryClose) return "up";
  if (detail.followThroughClose < detail.entryClose) return "down";
  return "flat";
}

function mergeRows(history: MarketHistoryResponse | null): MergedRow[] {
  if (!history) return [];
  const map = new Map<string, MergedRow>();
  for (const pair of CURRENCY_PAIRS) {
    const perPair = history.candlestickOutcomes[pair];
    if (!perPair) continue;
    for (const timeframe of REQUESTED_TIMEFRAMES) {
      const summaries = perPair[timeframe];
      if (!summaries) continue;
      for (const summary of summaries) {
        if (summary.formations <= 0) continue;
        const key = `${pair}::${summary.pattern}`;
        let row = map.get(key);
        if (!row) {
          row = {
            pair,
            pattern: summary.pattern,
            formations: 0,
            successful: 0,
            unsuccessful: 0,
            neutral: 0,
            atSupportCount: 0,
            atResistanceCount: 0,
            perTimeframe: {},
            details: []
          };
          map.set(key, row);
        }
        row.formations += summary.formations;
        row.successful += summary.expectedDirectionCount;
        row.unsuccessful += summary.oppositeDirectionCount;
        row.neutral += summary.neutralOutcomeCount;
        row.atSupportCount += summary.atSupportCount;
        row.atResistanceCount += summary.atResistanceCount;
        row.perTimeframe[timeframe] = summary;
        for (const detail of summary.details) {
          row.details.push({ ...detail, timeframe });
        }
      }
    }
  }
  return Array.from(map.values());
}

export function HistoryScreen() {
  const [history, setHistory] = useState<MarketHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<MarketHistoryTimeframe | "all">("all");
  const [detail, setDetail] = useState<{ row: MergedRow; filter: DetailFilter } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await fetchMarketHistory(CURRENCY_PAIRS, REQUESTED_TIMEFRAMES, 5);
        if (!cancelled) setHistory(response);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load candle history");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const merged = mergeRows(history);
    return merged
      .filter((row) => !selectedPair || row.pair === selectedPair)
      .filter((row) => selectedTimeframe === "all" || Boolean(row.perTimeframe[selectedTimeframe]))
      .sort((a, b) => b.formations - a.formations || a.pair.localeCompare(b.pair));
  }, [history, selectedPair, selectedTimeframe]);

  return (
    <View>
      <SectionCard
        title="Forex Candlestick Pattern History"
        subtitle="Five-year outcomes across 1h, 4h and 1Day at swing support/resistance"
      >
        <Text style={styles.intro}>
          Patterns are counted only when they form at a confirmed swing support/resistance level (pivot detected BEFORE
          the candle, tight tolerance). Successful = price moved in the pattern&apos;s expected direction within the
          lookahead window; Unsuccessful = it moved against; Neutral = it stayed flat. Each detail row is tagged with
          the timeframe it fired on (TF) and the actual support/resistance price (Zone) that was touched, so you can
          verify against your chart.
        </Text>

        <Text style={styles.groupLabel}>Timeframe</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setSelectedTimeframe("all")}
              style={[styles.filter, selectedTimeframe === "all" && styles.filterActive]}
            >
              <Text style={styles.filterText}>All</Text>
            </Pressable>
            {REQUESTED_TIMEFRAMES.map((tf) => (
              <Pressable
                key={tf}
                onPress={() => setSelectedTimeframe(tf)}
                style={[styles.filter, selectedTimeframe === tf && styles.filterActive]}
              >
                <Text style={styles.filterText}>{TIMEFRAME_LABEL[tf]}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.groupLabel}>Currency pair</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setSelectedPair(null)}
              style={[styles.filter, !selectedPair && styles.filterActive]}
            >
              <Text style={styles.filterText}>All pairs</Text>
            </Pressable>
            {CURRENCY_PAIRS.map((pair) => (
              <Pressable
                key={pair}
                onPress={() => setSelectedPair(pair)}
                style={[styles.filter, selectedPair === pair && styles.filterActive]}
              >
                <Text style={styles.filterText}>{pair}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {loading ? <Text style={styles.muted}>Loading five-year candle history for all pairs...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.headerBar}>
          <Text style={[styles.cell, styles.pattern, styles.headerText]}>Candle pattern</Text>
          <Text style={[styles.cell, styles.pair, styles.headerText]}>Pair</Text>
          <Text style={[styles.cell, styles.count, styles.headerText]}>Occurred</Text>
          <Text style={[styles.cell, styles.count, styles.headerText]}>Successful</Text>
          <Text style={[styles.cell, styles.count, styles.headerText]}>Unsuccessful</Text>
          <Text style={[styles.cell, styles.count, styles.headerText]}>Neutral</Text>
          <Text style={[styles.cell, styles.tfList, styles.headerText]}>TFs</Text>
        </View>

        {rows.map((row) => {
          const isSelected = detail?.row.pair === row.pair && detail.row.pattern === row.pattern;
          const activeTfs = REQUESTED_TIMEFRAMES.filter((tf) => Boolean(row.perTimeframe[tf]))
            .map((tf) => TIMEFRAME_LABEL[tf])
            .join(" / ");
          return (
            <View key={`${row.pair}-${row.pattern}`}>
              <View style={styles.row}>
                <Pressable onPress={() => setDetail({ row, filter: "occurred" })} style={[styles.cell, styles.pattern]}>
                  <Text style={styles.patternText}>{labelPattern(row.pattern)}</Text>
                </Pressable>
                <Text style={[styles.cell, styles.pair, styles.cellText]}>{row.pair}</Text>
                <Pressable
                  onPress={() => setDetail({ row, filter: "occurred" })}
                  style={[styles.cell, styles.count, styles.countButton]}
                >
                  <Text style={styles.countLink}>{row.formations}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setDetail({ row, filter: "successful" })}
                  style={[styles.cell, styles.count, styles.countButton]}
                >
                  <Text style={[styles.countLink, styles.success]}>{row.successful}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setDetail({ row, filter: "unsuccessful" })}
                  style={[styles.cell, styles.count, styles.countButton]}
                >
                  <Text style={[styles.countLink, styles.failure]}>{row.unsuccessful}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setDetail({ row, filter: "neutral" })}
                  style={[styles.cell, styles.count, styles.countButton]}
                >
                  <Text style={[styles.countLink, styles.neutral]}>{row.neutral}</Text>
                </Pressable>
                <Text style={[styles.cell, styles.tfList, styles.tfText]}>{activeTfs || "-"}</Text>
              </View>

              {isSelected && detail ? (
                <View style={styles.detail}>
                  <View style={styles.detailHead}>
                    <Text style={styles.detailTitle}>
                      {detail.filter.toUpperCase()} | {detail.row.pair} | {labelPattern(detail.row.pattern)}
                    </Text>
                    <Pressable onPress={() => setDetail(null)}>
                      <Text style={styles.close}>Close</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.detailMeta}>
                    Occurred {detail.row.formations} | Successful {detail.row.successful} | Unsuccessful{" "}
                    {detail.row.unsuccessful} | Neutral {detail.row.neutral} | Support {detail.row.atSupportCount} |
                    Resistance {detail.row.atResistanceCount}
                  </Text>
                  <Text style={styles.detailLegend}>
                    TF = timeframe the signal fired on (1h / 4h / 1D). Zone = actual pivot price the candle touched.
                    Moved = direction price ultimately went during the lookahead window.
                  </Text>
                  <ScrollView style={styles.detailList} nestedScrollEnabled>
                    {detail.row.details
                      .filter((item) =>
                        selectedTimeframe === "all" ? true : item.timeframe === selectedTimeframe
                      )
                      .filter((item) => detail.filter === "occurred" || item.outcome === detail.filter)
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .slice(0, 50)
                      .map((item) => {
                        const decimals = decimalsFor(detail.row.pair);
                        const moved = inferDirectionMoved(item);
                        const zoneLabel =
                          typeof item.zonePrice === "number" && item.zonePrice > 0
                            ? item.zonePrice.toFixed(decimals)
                            : "-";
                        return (
                          <View key={`${item.timeframe}-${item.timestamp}-${item.outcome}`} style={styles.detailRow}>
                            <View style={styles.detailHeaderRow}>
                              <Text style={styles.tfBadge}>TF {TIMEFRAME_LABEL[item.timeframe]}</Text>
                              <Text style={styles.detailDate}>{formatCandleSession(item.timestamp, item.timeframe)}</Text>
                              <Text style={[styles.detailOutcome, { color: outcomeColor(item.outcome) }]}>
                                {item.outcome.toUpperCase()}
                              </Text>
                            </View>
                            <Text style={styles.detailText}>{item.note}</Text>
                            <Text style={styles.detailText}>
                              At {item.formedAt}; Zone {zoneLabel}; expected {item.expectedDirection};{" "}
                              <Text style={{ color: movedColor(moved) }}>moved {moved}</Text>; close{" "}
                              {item.entryClose.toFixed(decimals)} to {item.followThroughClose.toFixed(decimals)};{" "}
                              {volumeLabel(item)}.
                            </Text>
                          </View>
                        );
                      })}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          );
        })}

        {!loading && rows.length === 0 ? (
          <Text style={styles.muted}>No patterns matched the current filters.</Text>
        ) : null}
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { color: theme.colors.muted, fontSize: 12, lineHeight: 17, marginBottom: 6 },
  groupLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 6
  },
  filters: { marginVertical: 6 },
  filterRow: { flexDirection: "row", gap: 6 },
  filter: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#102b3b",
    borderWidth: 1,
    borderColor: "#23546e",
    borderRadius: 6
  },
  filterActive: { backgroundColor: "#1d6977", borderColor: theme.colors.accent },
  filterText: { color: theme.colors.text, fontSize: 11, fontWeight: "700" },
  headerBar: {
    flexDirection: "row",
    backgroundColor: "#163f57",
    borderWidth: 1,
    borderColor: "#23546e",
    paddingVertical: 8,
    marginTop: 10
  },
  headerText: { color: theme.colors.text, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#23546e",
    paddingVertical: 9,
    backgroundColor: "#0f2a38"
  },
  cell: { paddingHorizontal: 4 },
  cellText: { color: theme.colors.text, fontSize: 11 },
  pattern: { flex: 1.45, minWidth: 108 },
  pair: { flex: 0.85, minWidth: 62 },
  count: { flex: 0.62, minWidth: 48, textAlign: "center" },
  countButton: { minHeight: 28, justifyContent: "center", backgroundColor: "#123246", borderRadius: 3, marginHorizontal: 1 },
  tfList: { flex: 0.9, minWidth: 64, textAlign: "center" },
  tfText: { color: theme.colors.accent, fontSize: 11, fontWeight: "700", textAlign: "center" },
  patternText: { color: theme.colors.text, fontSize: 11, fontWeight: "600" },
  countLink: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    textDecorationLine: "underline"
  },
  success: { color: theme.colors.positive },
  failure: { color: theme.colors.negative },
  neutral: { color: theme.colors.warning },
  detail: {
    marginTop: 6,
    marginBottom: 8,
    padding: 10,
    backgroundColor: "#102b3b",
    borderWidth: 1,
    borderColor: "#2d7a8b"
  },
  detailHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailTitle: { color: theme.colors.text, fontSize: 13, fontWeight: "800" },
  close: { color: theme.colors.accent, fontSize: 12, fontWeight: "700" },
  detailMeta: { color: theme.colors.muted, fontSize: 11, marginTop: 6 },
  detailLegend: { color: theme.colors.muted, fontSize: 10, marginTop: 4, marginBottom: 8, lineHeight: 14 },
  detailList: { maxHeight: 340 },
  detailRow: { borderTopWidth: 1, borderTopColor: "#23546e", marginTop: 8, paddingTop: 8 },
  detailHeaderRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  tfBadge: {
    color: "#0b2231",
    backgroundColor: theme.colors.accent,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden"
  },
  detailDate: { color: theme.colors.text, fontSize: 11, fontWeight: "700", flex: 1 },
  detailOutcome: { fontSize: 11, fontWeight: "800" },
  detailText: { color: theme.colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  muted: { color: theme.colors.muted, marginVertical: 8 },
  error: { color: theme.colors.negative, marginVertical: 8 }
});
