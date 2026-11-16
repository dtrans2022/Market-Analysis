import { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View, Pressable } from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { GlobalUpdatesScreen } from "./src/screens/GlobalUpdatesScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { AgentsScreen } from "./src/screens/AgentsScreen";
import { TrendsScreen } from "./src/screens/TrendsScreen";
import { BestSharesScreen } from "./src/screens/BestSharesScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { fetchMt4Quotes } from "./src/api/client";
import { usePollingData } from "./src/hooks/usePollingData";
import { elevate, theme, withAlpha } from "./src/theme";
import { Mt4Quote } from "./src/types";

type TabKey = "updates" | "trends" | "history" | "agents" | "shares" | "notify";

const tabs: { key: TabKey; label: string; glyph: string }[] = [
  { key: "updates", label: "Updates", glyph: "◎" },
  { key: "trends", label: "Trends", glyph: "📈" },
  { key: "history", label: "History", glyph: "🕑" },
  { key: "agents", label: "Agents", glyph: "⚡" },
  { key: "shares", label: "Best Shares", glyph: "★" },
  { key: "notify", label: "Slack", glyph: "🔔" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("updates");
  const mt4Quotes = usePollingData(fetchMt4Quotes, 15_000);

  const liveQuotes = mt4Quotes.data?.quotes ?? [];
  const feedHealth = mt4Quotes.data?.healthStatus ?? (mt4Quotes.error ? "offline" : "stale");
  const liveQuotesFresh = feedHealth === "fresh" && liveQuotes.length > 0;

  function formatQuote(quote: Mt4Quote) {
    const decimals = quote.symbol.toUpperCase().includes("JPY") ? 3 : 5;
    return `${quote.symbol} ${quote.bid.toFixed(decimals)}/${quote.ask.toFixed(decimals)}`;
  }

  const content = useMemo(() => {
    if (activeTab === "updates") {
      return <GlobalUpdatesScreen />;
    }
    if (activeTab === "trends") {
      return <TrendsScreen />;
    }
    if (activeTab === "history") {
      return <HistoryScreen />;
    }
    if (activeTab === "agents") {
      return <AgentsScreen />;
    }
    if (activeTab === "shares") {
      return <BestSharesScreen />;
    }
    return <SettingsScreen />;
  }, [activeTab]);

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" />

      <View style={styles.ambientTop} pointerEvents="none" />
      <View style={styles.ambientSide} pointerEvents="none" />

      <View style={styles.hero}>
        <View style={[styles.brandBadge, elevate(2, theme.colors.accent)]}>
          <Text style={styles.brandGlyph}>◆</Text>
        </View>
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>MARKET INTELLIGENCE</Text>
          <Text style={styles.title}>Global Market Analysis</Text>
          <Text style={styles.subtitle}>Actionable updates for faster trading decisions</Text>
        </View>
      </View>

      <Pressable
        onPress={() => setActiveTab("notify")}
        style={[
          styles.liveStrip,
          elevate(1),
          feedHealth === "fresh"
            ? styles.liveStripFresh
            : feedHealth === "stale"
              ? styles.liveStripStale
              : styles.liveStripOffline
        ]}
        accessibilityRole="button"
        accessibilityLabel="Open MT4 feed details"
      >
        <View style={styles.liveStripHead}>
          <View
            style={[
              styles.statusDot,
              feedHealth === "fresh"
                ? styles.statusDotFresh
                : feedHealth === "stale"
                  ? styles.statusDotStale
                  : styles.statusDotOffline
            ]}
          />
          <Text style={styles.liveStripLabel}>MT4 Live Feed · {feedHealth.toUpperCase()}</Text>
        </View>
        <Text style={styles.liveStripText}>
          {mt4Quotes.loading
            ? "Loading realtime quotes..."
            : mt4Quotes.error
              ? mt4Quotes.error
              : liveQuotes.length
                ? liveQuotes.slice(0, 3).map(formatQuote).join("    ")
                : "No live quotes yet"}
        </Text>
        <Text style={styles.liveStripHint}>Tap to open the MT4 feed panel →</Text>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabRow}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabButton, active ? [styles.tabButtonActive, elevate(1, theme.colors.accent)] : null]}
            >
              <Text style={[styles.tabGlyph, active ? styles.tabGlyphActive : null]}>{tab.glyph}</Text>
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>

      <View style={styles.disclaimerBar}>
        <Text style={styles.disclaimerText}>
          For informational purposes only — not financial advice. Trading involves risk.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 14,
    paddingTop: 20
  },
  ambientTop: {
    position: "absolute",
    top: -120,
    left: -40,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: withAlpha(theme.colors.accent, 0.1)
  },
  ambientSide: {
    position: "absolute",
    top: 40,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: withAlpha(theme.colors.accentViolet, 0.1)
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14
  },
  brandBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: 1,
    borderColor: withAlpha(theme.colors.accent, 0.5),
    alignItems: "center",
    justifyContent: "center"
  },
  brandGlyph: {
    color: theme.colors.accent,
    fontSize: 22,
    fontWeight: "900"
  },
  heroText: {
    flex: 1
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.2,
    marginTop: 2
  },
  subtitle: {
    color: theme.colors.muted,
    marginTop: 3,
    fontSize: 13
  },
  liveStrip: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: 14,
    paddingVertical: 11,
    paddingHorizontal: 13
  },
  liveStripHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999
  },
  statusDotFresh: {
    backgroundColor: theme.colors.positive
  },
  statusDotStale: {
    backgroundColor: theme.colors.warning
  },
  statusDotOffline: {
    backgroundColor: theme.colors.negative
  },
  liveStripFresh: {
    backgroundColor: "#0b241b",
    borderColor: "#2d7d5b"
  },
  liveStripStale: {
    backgroundColor: "#2e220d",
    borderColor: "#c58b2a"
  },
  liveStripOffline: {
    backgroundColor: "#2e1414",
    borderColor: "#c44a4a"
  },
  liveStripLabel: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  liveStripText: {
    color: theme.colors.text,
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700"
  },
  liveStripHint: {
    color: theme.colors.muted,
    marginTop: 5,
    fontSize: 11,
    fontWeight: "600"
  },
  tabScroll: {
    marginBottom: 14,
    flexGrow: 0
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 6
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14
  },
  tabButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent
  },
  tabGlyph: {
    fontSize: 13,
    color: theme.colors.muted
  },
  tabGlyphActive: {
    color: "#03222f"
  },
  tabText: {
    color: theme.colors.textDim,
    fontSize: 13,
    fontWeight: "700"
  },
  tabTextActive: {
    color: "#03222f"
  },
  content: {
    paddingBottom: 36,
    paddingTop: 2
  },
  disclaimerBar: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline
  },
  disclaimerText: {
    color: theme.colors.faint,
    fontSize: 11,
    textAlign: "center"
  }
});
