import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { elevate, theme, withAlpha } from "../theme";

type SectionCardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  accent?: string;
}>;

export function SectionCard({ title, subtitle, accent = theme.colors.accent, children }: SectionCardProps) {
  return (
    <View style={[styles.card, elevate(2)]}>
      <View style={[styles.topEdge, { backgroundColor: accent, shadowColor: accent }]} />
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.header}>
        <View style={[styles.marker, { backgroundColor: accent }]} />
        <View style={styles.headingBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden"
  },
  topEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.9
  },
  glow: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: withAlpha(theme.colors.accentAlt, 0.08)
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  marker: {
    width: 4,
    height: 22,
    borderRadius: 999,
    marginTop: 2
  },
  headingBlock: {
    flex: 1
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.font.heading,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  subtitle: {
    color: theme.colors.muted,
    marginTop: 3,
    fontSize: theme.font.small,
    lineHeight: 16
  },
  content: {
    marginTop: 14
  }
});
