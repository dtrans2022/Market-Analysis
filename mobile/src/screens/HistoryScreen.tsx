import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../components/SectionCard";
import { theme } from "../theme";
import dataset from "../data/commodity-pattern-history.json";

type Detail = {
  date: string;
  timestamp: number;
  direction: "bullish" | "bearish";
  entry: number;
  reward: number;
  risk: number;
  riskReward: number;
  success: boolean;
};

type PatternRecord = {
  commodity: string;
  symbol: string;
  timeframe: string;
  pattern: string;
  zone: "support" | "resistance";
  occurrences: number;
  successes: number;
  failures: number;
  successRate: number;
  avgRiskReward: number;
  avgReward: number;
  avgRisk: number;
  details: Detail[];
};

type Dataset = {
  generatedAt: string;
  source: string;
  timeframes: string[];
  commodities: string[];
  records: PatternRecord[];
};

const typed = dataset as Dataset;

function labelPattern(pattern: string) {
  return pattern.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function successTone(rate: number) {
  if (rate >= 0.7) return theme.colors.positive;
  if (rate >= 0.5) return theme.colors.warning;
  return theme.colors.negative;
}

export function HistoryScreen() {
  const [timeframe, setTimeframe] = useState<string>("1D");
  const [commodity, setCommodity] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    return typed.records
      .filter((row) => row.timeframe === timeframe)
      .filter((row) => !commodity || row.commodity === commodity)
      .sort((a, b) => {
        if (b.successRate !== a.successRate) return b.successRate - a.successRate;
        return b.occurrences - a.occurrences;
      });
  }, [timeframe, commodity]);

  return (
    <View>
      <SectionCard
        title="Commodity Candle Pattern History"
        subtitle="Live Yahoo data | last 3 years (1D) and 730 days (1h/4h) | evaluated at swing support/resistance zones"
      >
        <Text style={styles.intro}>
          Success = price closed in the expected direction within the lookahead window. R:R = average reward / adverse
          excursion, capped at 10.0. Only patterns with 3+ occurrences are shown.
        </Text>

        <Text style={styles.groupLabel}>Timeframe</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          <View style={styles.filterRow}>
            {typed.timeframes.map((tf) => (
              <Pressable
                key={tf}
                onPress={() => setTimeframe(tf)}
                style={[styles.filter, timeframe === tf && styles.filterActive]}
              >
                <Text style={styles.filterText}>{tf}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.groupLabel}>Commodity</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setCommodity(null)}
              style={[styles.filter, commodity === null && styles.filterActive]}
            >
              <Text style={styles.filterText}>All</Text>
            </Pressable>
            {typed.commodities.map((name) => (
              <Pressable
                key={name}
                onPress={() => setCommodity(name)}
                style={[styles.filter, commodity === name && styles.filterActive]}
              >
                <Text style={styles.filterText}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.headerRow}>
          <Text style={[styles.cell, styles.cellCommodity, styles.headerText]}>Commodity</Text>
          <Text style={[styles.cell, styles.cellPattern, styles.headerText]}>Candle Pattern</Text>
          <Text style={[styles.cell, styles.cellCount, styles.headerText]}>Occurred (S/R)</Text>
          <Text style={[styles.cell, styles.cellRate, styles.headerText]}>Success %</Text>
          <Text style={[styles.cell, styles.cellRR, styles.headerText]}>R:R</Text>
        </View>

        {rows.length === 0 ? (
          <Text style={styles.muted}>No patterns matched the current filters.</Text>
        ) : null}

        {rows.map((row) => {
          const rowKey = `${row.commodity}-${row.pattern}-${row.zone}-${row.timeframe}`;
          const isOpen = expanded === rowKey;
          const successPct = (row.successRate * 100).toFixed(1);
          const failurePct = (100 - row.successRate * 100).toFixed(1);
          return (
            <View key={rowKey}>
              <Pressable
                onPress={() => setExpanded(isOpen ? null : rowKey)}
                style={[styles.dataRow, isOpen && styles.dataRowOpen]}
              >
                <Text style={[styles.cell, styles.cellCommodity, styles.cellText]} numberOfLines={2}>
                  {row.commodity}
                </Text>
                <Text style={[styles.cell, styles.cellPattern, styles.cellText]} numberOfLines={2}>
                  {labelPattern(row.pattern)}
                </Text>
                <Text style={[styles.cell, styles.cellCount, styles.cellText]}>
                  {row.occurrences} ({row.zone === "support" ? "S" : "R"})
                </Text>
                <Text style={[styles.cell, styles.cellRate, styles.cellText, { color: successTone(row.successRate) }]}>
                  {successPct}% / {failurePct}%
                </Text>
                <Text style={[styles.cell, styles.cellRR, styles.cellText]}>{row.avgRiskReward.toFixed(2)}</Text>
              </Pressable>
              {isOpen ? (
                <View style={styles.detailBox}>
                  <Text style={styles.detailHeader}>
                    {row.commodity} | {labelPattern(row.pattern)} @ {row.zone.toUpperCase()} | {row.timeframe}
                  </Text>
                  <Text style={styles.detailMeta}>
                    Successes {row.successes} / Failures {row.failures} | Avg reward {row.avgReward} | Avg risk {row.avgRisk}
                  </Text>
                  <View style={styles.detailTableHeader}>
                    <Text style={[styles.detailCell, styles.detailDate, styles.detailHeaderText]}>Date (UTC)</Text>
                    <Text style={[styles.detailCell, styles.detailDir, styles.detailHeaderText]}>Direction</Text>
                    <Text style={[styles.detailCell, styles.detailEntry, styles.detailHeaderText]}>Entry</Text>
                    <Text style={[styles.detailCell, styles.detailRR, styles.detailHeaderText]}>R:R</Text>
                    <Text style={[styles.detailCell, styles.detailOutcome, styles.detailHeaderText]}>Outcome</Text>
                  </View>
                  {row.details.map((detail) => (
                    <View key={`${detail.timestamp}-${detail.direction}`} style={styles.detailRow}>
                      <Text style={[styles.detailCell, styles.detailDate, styles.detailText]}>{detail.date}</Text>
                      <Text style={[styles.detailCell, styles.detailDir, styles.detailText]}>{detail.direction}</Text>
                      <Text style={[styles.detailCell, styles.detailEntry, styles.detailText]}>
                        {detail.entry.toFixed(2)}
                      </Text>
                      <Text style={[styles.detailCell, styles.detailRR, styles.detailText]}>
                        {detail.riskReward.toFixed(2)}
                      </Text>
                      <Text
                        style={[
                          styles.detailCell,
                          styles.detailOutcome,
                          styles.detailText,
                          { color: detail.success ? theme.colors.positive : theme.colors.negative }
                        ]}
                      >
                        {detail.success ? "Success" : "Fail"}
                      </Text>
                    </View>
                  ))}
                  <Text style={styles.detailFootnote}>
                    Showing latest {row.details.length} of {row.occurrences} occurrences.
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}

        <Text style={styles.source}>
          {typed.source} | Data generated {new Date(typed.generatedAt).toLocaleString()}
        </Text>
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10
  },
  groupLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 6
  },
  filters: {
    marginVertical: 6
  },
  filterRow: {
    flexDirection: "row",
    gap: 6
  },
  filter: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#102b3b",
    borderWidth: 1,
    borderColor: "#23546e",
    borderRadius: 6
  },
  filterActive: {
    backgroundColor: "#1d6977",
    borderColor: theme.colors.accent
  },
  filterText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "700"
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#163f57",
    borderWidth: 1,
    borderColor: "#23546e",
    paddingVertical: 8,
    marginTop: 10
  },
  headerText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  dataRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#23546e",
    paddingVertical: 10,
    backgroundColor: "#0f2a38"
  },
  dataRowOpen: {
    backgroundColor: "#123246"
  },
  cell: {
    paddingHorizontal: 6
  },
  cellText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "600"
  },
  cellCommodity: {
    flex: 1.4,
    minWidth: 90
  },
  cellPattern: {
    flex: 1.5,
    minWidth: 110
  },
  cellCount: {
    flex: 1,
    minWidth: 82,
    textAlign: "center"
  },
  cellRate: {
    flex: 1.1,
    minWidth: 92,
    textAlign: "center"
  },
  cellRR: {
    flex: 0.7,
    minWidth: 46,
    textAlign: "right"
  },
  detailBox: {
    padding: 12,
    backgroundColor: "#0b2231",
    borderWidth: 1,
    borderColor: "#2d7a8b",
    marginBottom: 8
  },
  detailHeader: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "800"
  },
  detailMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    marginTop: 4,
    marginBottom: 10
  },
  detailTableHeader: {
    flexDirection: "row",
    backgroundColor: "#163f57",
    paddingVertical: 6
  },
  detailHeaderText: {
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  detailRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1f4358",
    paddingVertical: 6
  },
  detailCell: {
    paddingHorizontal: 4
  },
  detailText: {
    color: theme.colors.text,
    fontSize: 11
  },
  detailDate: {
    flex: 1.8,
    minWidth: 110
  },
  detailDir: {
    flex: 0.9,
    minWidth: 60
  },
  detailEntry: {
    flex: 0.9,
    minWidth: 56,
    textAlign: "right"
  },
  detailRR: {
    flex: 0.6,
    minWidth: 44,
    textAlign: "right"
  },
  detailOutcome: {
    flex: 0.9,
    minWidth: 60,
    textAlign: "right",
    fontWeight: "700"
  },
  detailFootnote: {
    color: theme.colors.muted,
    fontSize: 10,
    marginTop: 8
  },
  muted: {
    color: theme.colors.muted,
    marginTop: 12
  },
  source: {
    color: theme.colors.muted,
    fontSize: 10,
    marginTop: 12
  }
});
