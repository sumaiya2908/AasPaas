import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GhostButton, PrimaryButton, Screen, Title } from '@/components/ui';
import { getCity } from '@/data/cities';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export default function SavedTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const customCities = useAppStore((s) => s.customCities);
  const savedCities = useAppStore((s) => s.savedCities);
  const savedExperiences = useAppStore((s) => s.savedExperiences);
  const savedJourneys = useAppStore((s) => s.savedJourneys);
  const toggleSaveCity = useAppStore((s) => s.toggleSaveCity);
  const removeSavedExperience = useAppStore((s) => s.removeSavedExperience);
  const setSelectedCityId = useAppStore((s) => s.setSelectedCityId);

  const cityCards = useMemo(
    () => savedCities.map((id) => getCity(id, customCities)),
    [savedCities, customCities]
  );

  const experiencesByCity = useMemo(() => {
    const map = new Map<string, typeof savedExperiences>();
    savedExperiences.forEach((e) => {
      const list = map.get(e.cityId) ?? [];
      list.push(e);
      map.set(e.cityId, list);
    });
    return map;
  }, [savedExperiences]);

  const openCity = (cityId: string) => {
    setSelectedCityId(cityId);
    router.push({ pathname: '/city/[id]', params: { id: cityId } });
  };

  const buildFromSaved = (cityId: string) => {
    setSelectedCityId(cityId);
    router.push({
      pathname: '/journey/build',
      params: { cityId, fromSaved: '1' },
    });
  };

  const empty =
    cityCards.length === 0 && savedExperiences.length === 0 && savedJourneys.length === 0;

  return (
    <Screen mist>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 24, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Title>Saved</Title>
        <Text style={styles.sub}>Cities and experiences you want to remember.</Text>

        {empty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Save something you want to experience later.</Text>
            <Text style={styles.emptyBody}>
              Explore a city, tap ♡ on a moment that stays with you, then turn it into a journey.
            </Text>
            <PrimaryButton
              label="Explore cities"
              onPress={() => router.push('/(tabs)')}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        ) : null}

        {cityCards.length > 0 ? (
          <>
            <Text style={styles.section}>Cities</Text>
            <View style={styles.cityRow}>
              {cityCards.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => openCity(c.id)}
                  onLongPress={() => toggleSaveCity(c.id)}
                  style={styles.cityChip}
                >
                  <Text style={styles.cityChipText}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {savedExperiences.length > 0 ? (
          <>
            <Text style={styles.section}>Experiences</Text>
            {Array.from(experiencesByCity.entries()).map(([cityId, items]) => {
              const city = getCity(cityId, customCities);
              return (
                <View key={cityId} style={styles.group}>
                  <View style={styles.groupHead}>
                    <Text style={styles.groupTitle}>{city.name}</Text>
                    {items.length >= 2 ? (
                      <Pressable onPress={() => buildFromSaved(cityId)}>
                        <Text style={styles.buildLink}>Build my journey</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {items.length >= 2 ? (
                    <Text style={styles.ready}>Ready to turn these into a trip?</Text>
                  ) : null}
                  {items.map((e) => (
                    <View key={e.id} style={styles.expCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.expTitle}>{e.title}</Text>
                        {e.body ? (
                          <Text style={styles.expBody} numberOfLines={2}>
                            {e.body}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable onPress={() => removeSavedExperience(e.id)} hitSlop={8}>
                        <Text style={styles.remove}>Remove</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        ) : null}

        {savedJourneys.length > 0 ? (
          <>
            <Text style={styles.section}>Journeys</Text>
            {savedJourneys.map((j) => (
              <Pressable
                key={j.id}
                onPress={() =>
                  router.push({ pathname: '/journey/result', params: { id: j.id } })
                }
                style={styles.journeyCard}
              >
                <Text style={styles.expTitle}>{j.title}</Text>
                <Text style={styles.expBody}>
                  {j.cityName} · {j.days} day{j.days > 1 ? 's' : ''}
                </Text>
              </Pressable>
            ))}
          </>
        ) : null}

        {!empty && savedExperiences.length === 0 && cityCards.length > 0 ? (
          <GhostButton
            label="Explore more experiences"
            onPress={() => router.push('/(tabs)')}
            style={{ marginTop: spacing.xl }}
          />
        ) : null}
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
    marginBottom: spacing.lg,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  cityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cityChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.cream,
  },
  cityChipText: {
    fontFamily: fonts.displayMedium,
    fontSize: 15,
    color: colors.text,
  },
  group: {
    marginBottom: spacing.md,
  },
  groupHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  groupTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.text,
  },
  buildLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.accent,
  },
  ready: {
    marginBottom: 10,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  expCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: spacing.md,
    marginBottom: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  expTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  expBody: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  remove: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textDim,
  },
  journeyCard: {
    padding: spacing.md,
    marginBottom: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.dusk,
  },
  empty: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.cream,
  },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 30,
    color: colors.text,
  },
  emptyBody: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
});
