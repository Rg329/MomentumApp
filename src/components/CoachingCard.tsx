import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Spacing } from '../theme';
import { PREMIUM_COLOR } from '../monetization';
import type { CoachingMessage } from '../coaching/types';
import { actionPrefix } from '../coaching/tone';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  coaching: CoachingMessage | null;
  loading?: boolean;
  compact?: boolean;
  accentColor?: string;
  showDataSource?: boolean;
};

function Section({
  icon,
  label,
  text,
  accentColor,
}: {
  icon: IconName;
  label: string;
  text: string;
  accentColor: string;
}) {
  return (
    <View style={sectionStyles.wrap}>
      <View style={sectionStyles.labelRow}>
        <MaterialCommunityIcons name={icon} size={14} color={accentColor} />
        <Text style={[sectionStyles.label, { color: accentColor }]}>{label}</Text>
      </View>
      <Text style={sectionStyles.text}>{text}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: {
    ...Typography.labelSm,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
  },
  text: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
    lineHeight: 22,
  },
});

export function CoachingCard({
  coaching,
  loading = false,
  compact = false,
  accentColor = Colors.primary,
  showDataSource = false,
}: Props) {
  if (loading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator color={accentColor} />
        <Text style={styles.loadingText}>Analyzing your behavior…</Text>
      </View>
    );
  }

  if (!coaching) return null;

  if (compact) {
    return (
      <View style={[styles.card, { borderColor: accentColor + '25' }]}>
        <Text style={styles.compactText}>{coaching.summary}</Text>
      </View>
    );
  }

  const coachStyle = coaching.dataSource === 'behavioral' ? 'Behavioral data' : 'Profile & tasks';

  return (
    <View style={[styles.card, { borderColor: accentColor + '25' }]}>
      <Section icon="eye-outline" label="Observation" text={coaching.observation} accentColor={accentColor} />
      {coaching.pattern ? (
        <>
          <View style={styles.divider} />
          <Section icon="chart-timeline-variant" label="Pattern" text={coaching.pattern} accentColor={accentColor} />
        </>
      ) : null}
      <View style={styles.divider} />
      <Section
        icon="arrow-right-circle-outline"
        label={actionPrefix(null)}
        text={coaching.action}
        accentColor={accentColor}
      />
      {showDataSource && coaching.dataSource === 'behavioral' && (
        <Text style={styles.sourceTag}>Based on your recent activity</Text>
      )}
    </View>
  );
}

export function PremiumCoachingCard(props: Props) {
  return <CoachingCard {...props} accentColor={PREMIUM_COLOR} showDataSource />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.md + 2,
    gap: 14,
    borderWidth: 1,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  loadingText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.outlineVariant + '60',
  },
  compactText: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  sourceTag: {
    ...Typography.labelXs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
});
