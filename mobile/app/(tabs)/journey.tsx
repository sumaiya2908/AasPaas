import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GhostButton, PrimaryButton, Screen, Title } from '@/components/ui';
import { getCity } from '@/data/cities';
import { colors, fonts, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export default function JourneyTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cityId = useAppStore((s) => s.selectedCityId) ?? 'jaipur';
  const customCities = useAppStore((s) => s.customCities);
  const savedExperiences = useAppStore((s) => s.savedExperiences);
  const savedJourneys = useAppStore((s) => s.savedJourneys);
  const city = getCity(cityId, customCities);

  const savedHere = useMemo(
    () => savedExperiences.filter((e) => e.cityId === cityId),
    [savedExperiences, cityId]
  );

  return (
    <Screen mist>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: 24, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>Plan your experience</Text>
        <Title>Journey</Title>
        <Text style={styles.sub}>
          Turn your saved places and local knowledge into a trip — not a generic tourist list.
        </Text>

        {savedJourneys.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Your journeys</Text>
            {savedJourneys.slice(0, 3).map((j) => (
              <GhostButton
                key={j.id}
                label={j.title}
                onPress={() =>
                  router.push({ pathname: '/journey/result', params: { id: j.id } })
                }
                style={{ marginTop: spacing.sm }}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Let&apos;s plan your {city.name}</Text>
          <Text style={styles.panelBody}>
            {savedHere.length > 0
              ? `Using ${savedHere.length} saved experience${savedHere.length > 1 ? 's' : ''} from ${city.name} as context.`
              : `We’ll shape a day-by-day path from how people experience ${city.name}.`}
          </Text>
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />

        <PrimaryButton
          label={savedHere.length >= 2 ? 'Use my saved experiences' : `Plan my ${city.name}`}
          onPress={() =>
            router.push({
              pathname: '/journey/build',
              params: {
                cityId,
                fromSaved: savedHere.length >= 2 ? '1' : '0',
              },
            })
          }
        />
        <GhostButton
          label="Choose another city"
          onPress={() => router.push('/choose-city')}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  kicker: {
    fontFamily: fonts.bodyMedium,
    color: colors.textDim,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  sub: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
  block: {
    marginTop: spacing.xl,
  },
  blockLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  panel: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.cream,
  },
  panelTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.text,
  },
  panelBody: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
});
