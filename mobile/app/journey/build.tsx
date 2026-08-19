import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BackLink, Chip, PrimaryButton, Screen, Title } from '@/components/ui';
import { buildJourney } from '@/data/journey';
import { getCity } from '@/data/cities';
import { generateJourneyPlan } from '@/services/journeyAi';
import { colors, fonts, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

const DAYS = [1, 2, 3, 4];
const VIBES = ['Offbeat', 'Relaxed', 'Adventurous', 'Social'];
const INTERESTS = ['Food', 'Walking', 'Culture', 'Nature', 'Nightlife'];

/**
 * Minimal contextual planner — city already known.
 * Days · vibe · interests · skip allowed.
 */
export default function BuildJourneyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cityId: paramCity, fromSaved } = useLocalSearchParams<{
    cityId?: string;
    fromSaved?: string;
  }>();
  const storeCityId = useAppStore((s) => s.selectedCityId) ?? 'jaipur';
  const cityId = paramCity || storeCityId;
  const customCities = useAppStore((s) => s.customCities);
  const savedExperiences = useAppStore((s) => s.savedExperiences);
  const setSelectedCityId = useAppStore((s) => s.setSelectedCityId);
  const saveJourney = useAppStore((s) => s.saveJourney);
  const city = getCity(cityId, customCities);

  const savedHere = useMemo(
    () => savedExperiences.filter((e) => e.cityId === cityId),
    [savedExperiences, cityId]
  );

  const [days, setDays] = useState(2);
  const [vibe, setVibe] = useState(VIBES[0]);
  const [interests, setInterests] = useState<string[]>(['Food', 'Walking']);
  const [loading, setLoading] = useState(false);

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const generate = async () => {
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCityId(cityId);

    const food =
      interests.includes('Food') ? 'Street Food' : interests.includes('Culture') ? 'Local thalis' : 'Café hopping';
    const style = vibe === 'Adventurous' ? 'Photography' : vibe === 'Social' ? 'Foodie' : vibe;

    const generated = await generateJourneyPlan(
      {
        cityId,
        days: Math.min(days, 3),
        budget: '₹2–4k',
        style,
        food,
        vibe,
        interests,
        pace: vibe === 'Relaxed' ? 'slow' : vibe === 'Adventurous' ? 'packed' : 'balanced',
        avoidTouristy: vibe === 'Offbeat',
      },
      (prefs) =>
        buildJourney({
          cityId: prefs.cityId,
          days: prefs.days,
          budget: prefs.budget,
          style: prefs.style,
          food: prefs.food,
        }),
      { cityName: city.name, citySlug: city.slug || city.id, savedExperiences: savedHere }
    );

    const saved = saveJourney({
      cityId,
      cityName: city.name,
      title: `Your ${city.name}`,
      days: Math.min(days, 3),
      budget: 'Flexible',
      style: `${vibe}${interests.length ? ` · ${interests.join(', ')}` : ''}`,
      food,
      estimate: generated.estimate,
      daysPlan: generated.daysPlan,
    });

    setLoading(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({ pathname: '/journey/result', params: { id: saved.id } });
  };

  return (
    <Screen mist>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 8, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <BackLink label="Back" onPress={() => router.back()} />
        <Title style={{ marginTop: spacing.md }}>Let&apos;s plan your {city.name}</Title>
        <Text style={styles.sub}>
          {fromSaved === '1' || savedHere.length >= 2
            ? `Using ${savedHere.length} saved experience${savedHere.length === 1 ? '' : 's'} as starting points.`
            : 'A few quick choices — skip anything you like.'}
        </Text>

        {savedHere.length > 0 ? (
          <View style={styles.savedBox}>
            {savedHere.slice(0, 4).map((e) => (
              <Text key={e.id} style={styles.savedItem}>
                · {e.title}
              </Text>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>How many days?</Text>
        <View style={styles.row}>
          {DAYS.map((d) => (
            <Chip
              key={d}
              label={d === 4 ? '4+' : String(d)}
              selected={days === d}
              onPress={() => setDays(d)}
            />
          ))}
        </View>

        <Text style={styles.label}>What&apos;s your vibe?</Text>
        <View style={styles.row}>
          {VIBES.map((v) => (
            <Chip key={v} label={v} selected={vibe === v} onPress={() => setVibe(v)} />
          ))}
        </View>

        <Text style={styles.label}>What are you interested in?</Text>
        <View style={styles.row}>
          {INTERESTS.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={interests.includes(item)}
              onPress={() => toggleInterest(item)}
            />
          ))}
        </View>

        <PrimaryButton
          label={`Create my ${city.name} journey`}
          onPress={generate}
          loading={loading}
          style={{ marginTop: spacing.xl }}
        />
        <Text style={styles.skipHint}>Interests are optional — generate anytime.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  sub: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  savedBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.cream,
    gap: 4,
  },
  savedItem: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
  },
  label: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skipHint: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
  },
});
