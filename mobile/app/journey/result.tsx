import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, GhostButton, Muted, PrimaryButton, Screen, SectionLabel, Title } from '@/components/ui';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export default function JourneyResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const journey = useAppStore((s) => s.savedJourneys.find((j) => j.id === id));
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fade]);

  if (!journey) {
    return (
      <Screen>
        <View style={[styles.content, { paddingTop: 40 }]}>
          <Title>Journey not found</Title>
          <GhostButton
            label="Build another"
            onPress={() => router.replace('/journey/build')}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 12, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <Pressable onPress={() => router.replace('/(tabs)/journey')}>
          <Text style={styles.back}>← Journey</Text>
        </Pressable>

        <Animated.View style={{ opacity: fade }}>
          <Text style={styles.savedBadge}>Your trip</Text>
          <Title>{journey.title}</Title>
          <Muted style={{ marginTop: 8 }}>
            {journey.days} days · {journey.style}
          </Muted>
          <Text style={styles.estimate}>{journey.estimate}</Text>

          {journey.daysPlan.map((day) => (
            <View key={day.day} style={styles.dayBlock}>
              <SectionLabel>{`Day ${day.day}`}</SectionLabel>
              {day.stops.map((stop, idx) => (
                <View key={`${day.day}-${idx}`} style={styles.stop}>
                  <View style={styles.timeline}>
                    <View style={styles.dot} />
                    {idx < day.stops.length - 1 && <View style={styles.line} />}
                  </View>
                  <View style={styles.stopBody}>
                    <Text style={styles.time}>{stop.time}</Text>
                    <Text style={styles.stopTitle}>{stop.title}</Text>
                    <Body style={{ marginTop: 4 }}>{stop.reason}</Body>
                    {stop.why ? (
                      <View style={styles.whyBox}>
                        <Text style={styles.whyLabel}>Why this</Text>
                        <Muted style={{ marginTop: 4 }}>{stop.why.summary}</Muted>
                        {stop.why.communitySignals && stop.why.communitySignals.length > 0 ? (
                          <Text style={styles.whySignals}>
                            {stop.why.communitySignals
                              .map((s) => `${s.count} ${s.label.toLowerCase()}`)
                              .join(' · ')}
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <Muted style={{ marginTop: 6 }}>
                        Drawn from how people experience {journey.cityName}
                      </Muted>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}

          <PrimaryButton
            label="Regenerate"
            onPress={() =>
              router.replace({
                pathname: '/journey/build',
                params: { cityId: journey.cityId },
              })
            }
            style={{ marginTop: spacing.md }}
          />
          <GhostButton
            label="Back to Explore"
            onPress={() => router.replace('/(tabs)')}
            style={{ marginTop: spacing.sm }}
          />
          <GhostButton
            label="Adjust preferences"
            onPress={() =>
              router.replace({
                pathname: '/journey/build',
                params: { cityId: journey.cityId },
              })
            }
            style={{ marginTop: spacing.sm }}
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  back: {
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  savedBadge: {
    fontFamily: fonts.bodyBold,
    color: colors.mint,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  estimate: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    fontFamily: fonts.displayMedium,
    fontSize: 20,
    color: colors.gold,
  },
  dayBlock: {
    marginBottom: spacing.lg,
  },
  stop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  timeline: {
    width: 16,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.accentSoft,
    marginTop: 4,
    minHeight: 36,
  },
  stopBody: {
    flex: 1,
    marginBottom: 16,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  time: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  stopTitle: {
    marginTop: 4,
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.text,
  },
  whyBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  whyLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.mint,
  },
  whySignals: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
});
