import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GhostButton, PrimaryButton } from '@/components/ui';
import type { ApiDayDigest } from '@/services/aaspaasApi';
import { colors, fonts, radii, spacing } from '@/constants/theme';

type Props = {
  digest: ApiDayDigest;
  onOpenCity: () => void;
  onShare: () => void;
};

function Metric({
  value,
  label,
  icon,
  tone = 'default',
}: {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'warn' | 'muted';
}) {
  const active = value > 0;
  return (
    <View style={[styles.metric, !active && styles.metricMuted]}>
      <View style={styles.metricTop}>
        <Ionicons
          name={icon}
          size={14}
          color={
            tone === 'warn' && active
              ? colors.warning
              : active
                ? colors.primary
                : colors.textDim
          }
        />
        <Text
          style={[
            styles.metricValue,
            !active && styles.metricValueMuted,
            tone === 'warn' && active && styles.metricWarn,
          ]}
        >
          {value}
        </Text>
      </View>
      <Text style={[styles.metricLabel, !active && styles.metricLabelMuted]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Day dashboard — carefully composed daily snapshot for one city.
 * Real counts only; empty states stay quiet, never fabricated.
 */
export function DayDashboard({ digest, onOpenCity, onShare }: Props) {
  const lead = digest.updates[0] ?? null;
  const rest = digest.updates.slice(1, 3);
  const distance =
    digest.distanceKm != null
      ? `~${Math.max(1, Math.round(digest.distanceKm))} km`
      : null;

  const contextBits = [
    digest.source === 'nearby' ? 'Near you' : null,
    distance,
  ].filter(Boolean);

  return (
    <View style={styles.shell}>
      {/* Header band */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.overline}>{digest.dayLabel}</Text>
          <Pressable onPress={onOpenCity} accessibilityRole="button">
            <Text style={styles.city}>{digest.city.name}</Text>
          </Pressable>
        </View>
        {contextBits.length > 0 ? (
          <View style={styles.badge}>
            <Ionicons name="navigate-outline" size={12} color={colors.primary} />
            <Text style={styles.badgeText}>{contextBits.join(' · ')}</Text>
          </View>
        ) : (
          <View style={styles.badgeQuiet}>
            <Text style={styles.badgeQuietText}>Your day</Text>
          </View>
        )}
      </View>

      <Text style={styles.summary}>{digest.summary}</Text>

      {/* Metric strip — scan in one glance */}
      <View style={styles.metrics}>
        <Metric
          value={digest.counts.updates}
          label="Updates"
          icon="pulse-outline"
        />
        <View style={styles.metricDivider} />
        <Metric
          value={digest.counts.experiences}
          label="To try"
          icon="sparkles-outline"
        />
        <View style={styles.metricDivider} />
        <Metric
          value={digest.counts.questions}
          label="Asked"
          icon="chatbubble-ellipses-outline"
        />
        {digest.counts.avoids > 0 ? (
          <>
            <View style={styles.metricDivider} />
            <Metric
              value={digest.counts.avoids}
              label="Heads-up"
              icon="warning-outline"
              tone="warn"
            />
          </>
        ) : null}
      </View>

      {/* Happening — featured + denser list */}
      <View style={styles.block}>
        <Text style={styles.blockLabel}>Happening now</Text>
        {lead ? (
          <Pressable
            onPress={onOpenCity}
            style={({ pressed }) => [styles.leadCard, pressed && { opacity: 0.92 }]}
          >
            <View style={styles.leadTop}>
              <Text style={styles.leadKind}>
                {lead.warn ? 'Heads-up' : lead.type === 'experience' ? 'Experience' : 'Update'}
              </Text>
              {lead.ago ? <Text style={styles.leadAgo}>{lead.ago}</Text> : null}
            </View>
            <Text style={styles.leadText} numberOfLines={3}>
              {lead.text}
            </Text>
            {lead.neighborhood ? (
              <Text style={styles.leadMeta}>{lead.neighborhood}</Text>
            ) : null}
          </Pressable>
        ) : (
          <View style={styles.emptyQuiet}>
            <Text style={styles.emptyTitle}>No major updates today</Text>
            <Text style={styles.emptyBody}>
              The city is quiet — explore vibes below, or be the first to share.
            </Text>
          </View>
        )}

        {rest.length > 0 ? (
          <View style={styles.restList}>
            {rest.map((item) => (
              <View key={item.id} style={styles.restRow}>
                <View
                  style={[
                    styles.restDot,
                    item.warn && styles.restDotWarn,
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.restText, item.warn && styles.restWarn]}
                    numberOfLines={2}
                  >
                    {item.text}
                  </Text>
                  <Text style={styles.restMeta}>
                    {[item.neighborhood, item.ago].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Do today — actionable experiences */}
      {digest.tryToday.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Do today</Text>
          {digest.tryToday.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={onOpenCity}
              style={({ pressed }) => [
                styles.doRow,
                index === digest.tryToday.length - 1 && styles.doRowLast,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.doIndex}>
                <Text style={styles.doIndexText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.doTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.doBody} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Actions — one primary path */}
      <View style={styles.actions}>
        <PrimaryButton
          label={`Open ${digest.city.name}`}
          onPress={onOpenCity}
          style={{ flex: 1 }}
        />
      </View>
      <GhostButton
        label="Share an update"
        onPress={onShare}
        style={{ marginTop: spacing.sm }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 28,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#042F2A',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  overline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  city: {
    marginTop: 4,
    fontFamily: fonts.serifBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.7,
    color: colors.text,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.primary,
  },
  badgeQuiet: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSoft,
  },
  badgeQuietText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  summary: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  metrics: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.dusk,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricMuted: {
    opacity: 0.55,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.text,
  },
  metricValueMuted: {
    color: colors.textDim,
  },
  metricWarn: {
    color: colors.warning,
  },
  metricLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  metricLabelMuted: {
    color: colors.textDim,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginVertical: 4,
  },
  block: {
    marginTop: spacing.lg,
  },
  blockLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textDim,
    marginBottom: spacing.sm,
  },
  leadCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.dusk,
  },
  leadTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leadKind: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  leadAgo: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textDim,
  },
  leadText: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.text,
  },
  leadMeta: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyQuiet: {
    paddingVertical: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 15,
    color: colors.text,
  },
  emptyBody: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  restList: {
    marginTop: spacing.md,
    gap: 12,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  restDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    backgroundColor: colors.primary,
  },
  restDotWarn: {
    backgroundColor: colors.warning,
  },
  restText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  restWarn: {
    color: colors.warning,
  },
  restMeta: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textDim,
  },
  doRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  doRowLast: {
    borderBottomWidth: 0,
  },
  doIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  doIndexText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
  doTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 15,
    color: colors.text,
  },
  doBody: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  actions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
  },
});
