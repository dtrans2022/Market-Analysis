import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchMarketHistory } from "../api/client";
import { SectionCard } from "../components/SectionCard";
import { theme } from "../theme";
import { CandlestickOutcomeDetail, CandlestickOutcomeSummary, MarketHistoryResponse } from "../types";

const CURRENCY_PAIRS = [
  "AUD/USD", "AUD/CHF", "AUD/JPY", "AUD/NZD", "CAD/JPY", "EUR/AUD", "EUR/CAD", "EUR/GBP", "EUR/JPY",
  "EUR/NZD", "EUR/USD", "GBP/AUD", "GBP/NZD", "GBP/USD", "NZD/JPY", "USD/CAD", "USD/CHF", "USD/JPY"
];

type ReportRow = { pair: string; summary: CandlestickOutcomeSummary };
type DetailFilter = "occurred" | "successful" | "unsuccessful" | "neutral";

function labelPattern(pattern: string) {
  return pattern.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function volumeLabel(detail: CandlestickOutcomeDetail) {
  return detail.volumeRatio == null ? "Volume unavailable" : `${detail.volumeRatio}x of prior 20-day average`;
}

function formatCandleSession(timestamp: number) {
  const date = new Date(timestamp * 1000);
  const utcDate = date.toISOString().slice(0, 10);
  const sydneyDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
  return `Source UTC ${utcDate} | Sydney ${sydneyDate}`;
}

export function HistoryScreen() {
  const [history, setHistory] = useState<MarketHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ row: ReportRow; filter: DetailFilter } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await fetchMarketHistory(CURRENCY_PAIRS, ["1Day"], 5);
        if (!cancelled) setHistory(response);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load daily pattern history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const rows: ReportRow[] = CURRENCY_PAIRS.flatMap((pair) => (history?.candlestickOutcomes[pair]?.["1Day"] ?? [])
    .filter((summary) => summary.formations > 0)
    .map((summary) => ({ pair, summary })))
    .filter((row) => !selectedPair || row.pair === selectedPair)
    .sort((left, right) => right.summary.formations - left.summary.formations || left.pair.localeCompare(right.pair));

  return (
    <View>
      <SectionCard title="Daily Candlestick Pattern Report" subtitle="Five-year daily analysis across all forex pairs">
        <Text style={styles.intro}>Patterns are counted only when formed at rolling support or resistance. Success means the close five daily bars later moved in the pattern's expected direction.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          <View style={styles.filterRow}>
            <Pressable onPress={() => setSelectedPair(null)} style={[styles.filter, !selectedPair && styles.filterActive]}><Text style={styles.filterText}>All pairs</Text></Pressable>
            {CURRENCY_PAIRS.map((pair) => <Pressable key={pair} onPress={() => setSelectedPair(pair)} style={[styles.filter, selectedPair === pair && styles.filterActive]}><Text style={styles.filterText}>{pair}</Text></Pressable>)}
          </View>
        </ScrollView>
        {loading ? <Text style={styles.muted}>Loading five-year daily candle history for all pairs...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.header}><Text style={[styles.cell, styles.pattern]}>Candle stick pattern</Text><Text style={[styles.cell, styles.pair]}>Currency pair</Text><Text style={[styles.cell, styles.count]}>Occurred</Text><Text style={[styles.cell, styles.count]}>Successful</Text><Text style={[styles.cell, styles.count]}>Unsuccessful</Text><Text style={[styles.cell, styles.count]}>Neutral</Text><Text style={[styles.cell, styles.reason]}>Reason / volume</Text></View>
        {rows.map((row) => {
          const sample = row.summary.details[0];
          const isSelected = detail?.row.pair === row.pair && detail.row.summary.pattern === row.summary.pattern;
          return <View key={`${row.pair}-${row.summary.pattern}`}>
            <View style={styles.row}>
              <Pressable onPress={() => setDetail({ row, filter: "occurred" })} style={[styles.cell, styles.pattern]}><Text style={styles.patternText}>{labelPattern(row.summary.pattern)}</Text></Pressable><Text style={[styles.cell, styles.pair]}>{row.pair}</Text><Pressable onPress={() => setDetail({ row, filter: "occurred" })} style={[styles.cell, styles.count, styles.countButton]}><Text style={styles.countLink}>{row.summary.formations}</Text></Pressable><Pressable onPress={() => setDetail({ row, filter: "successful" })} style={[styles.cell, styles.count, styles.countButton]}><Text style={[styles.countLink, styles.success]}>{row.summary.expectedDirectionCount}</Text></Pressable><Pressable onPress={() => setDetail({ row, filter: "unsuccessful" })} style={[styles.cell, styles.count, styles.countButton]}><Text style={[styles.countLink, styles.failure]}>{row.summary.oppositeDirectionCount}</Text></Pressable><Pressable onPress={() => setDetail({ row, filter: "neutral" })} style={[styles.cell, styles.count, styles.countButton]}><Text style={[styles.countLink, styles.neutral]}>{row.summary.neutralOutcomeCount}</Text></Pressable><Pressable onPress={() => setDetail({ row, filter: "occurred" })} style={[styles.cell, styles.reason]}><Text numberOfLines={2} style={styles.reasonText}>{sample ? `${sample.note} ${volumeLabel(sample)}` : "-"}</Text></Pressable>
            </View>
            {isSelected && detail ? <View style={styles.detail}><View style={styles.detailHead}><Text style={styles.detailTitle}>{detail.filter.toUpperCase()} | {detail.row.pair} | {labelPattern(detail.row.summary.pattern)}</Text><Pressable onPress={() => setDetail(null)}><Text style={styles.close}>Close</Text></Pressable></View><Text style={styles.detailMeta}>Occurred {detail.row.summary.formations} | Successful {detail.row.summary.expectedDirectionCount} | Unsuccessful {detail.row.summary.oppositeDirectionCount} | Neutral {detail.row.summary.neutralOutcomeCount} | Support {detail.row.summary.atSupportCount} | Resistance {detail.row.summary.atResistanceCount}</Text><ScrollView style={styles.detailList} nestedScrollEnabled>{detail.row.summary.details.filter((item) => detail.filter === "occurred" || item.outcome === detail.filter).map((item) => <View key={`${item.timestamp}-${item.outcome}`} style={styles.detailRow}><Text style={styles.detailDate}>{formatCandleSession(item.timestamp)} | {item.outcome.toUpperCase()}</Text><Text style={styles.detailText}>{item.note}</Text><Text style={styles.detailText}>At {item.formedAt}; expected {item.expectedDirection}; close {item.entryClose.toFixed(5)} to {item.followThroughClose.toFixed(5)}; {volumeLabel(item)}.</Text></View>)}</ScrollView></View> : null}
          </View>;
        })}
        {!loading && rows.length === 0 ? <Text style={styles.muted}>No daily patterns were found with five-year coverage.</Text> : null}
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { color: theme.colors.muted, fontSize: 12, lineHeight: 17 },
  filters: { marginVertical: 12 }, filterRow: { flexDirection: "row", gap: 6 }, filter: { paddingVertical: 6, paddingHorizontal: 9, backgroundColor: "#102b3b", borderWidth: 1, borderColor: "#23546e", borderRadius: 5 }, filterActive: { backgroundColor: "#1d6977", borderColor: theme.colors.accent }, filterText: { color: theme.colors.text, fontSize: 11, fontWeight: "700" },
  header: { flexDirection: "row", backgroundColor: "#163f57", borderWidth: 1, borderColor: "#23546e", paddingVertical: 8 }, row: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#23546e", paddingVertical: 9 }, cell: { color: theme.colors.text, fontSize: 10, paddingHorizontal: 4 }, pattern: { flex: 1.45, minWidth: 108 }, pair: { flex: 0.85, minWidth: 62 }, count: { flex: 0.62, minWidth: 48, textAlign: "center" }, countButton: { minHeight: 28, justifyContent: "center", backgroundColor: "#123246", borderRadius: 3, marginHorizontal: 1 }, reason: { flex: 2.25, minWidth: 160 }, patternText: { color: theme.colors.text, fontSize: 10 }, reasonText: { color: theme.colors.muted, fontSize: 10 }, countLink: { color: theme.colors.accent, fontSize: 12, fontWeight: "800", textAlign: "center", textDecorationLine: "underline" }, success: { color: theme.colors.positive }, failure: { color: theme.colors.negative }, neutral: { color: theme.colors.warning },
  detail: { marginTop: 12, padding: 10, backgroundColor: "#102b3b", borderWidth: 1, borderColor: "#2d7a8b" }, detailHead: { flexDirection: "row", justifyContent: "space-between" }, detailTitle: { color: theme.colors.text, fontSize: 13, fontWeight: "800" }, close: { color: theme.colors.accent, fontSize: 12, fontWeight: "700" }, detailMeta: { color: theme.colors.muted, fontSize: 11, marginTop: 6 }, detailList: { maxHeight: 310 }, detailRow: { borderTopWidth: 1, borderTopColor: "#23546e", marginTop: 8, paddingTop: 8 }, detailDate: { color: theme.colors.text, fontSize: 11, fontWeight: "800" }, detailText: { color: theme.colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  muted: { color: theme.colors.muted, marginVertical: 8 }, error: { color: theme.colors.negative, marginVertical: 8 }
});
