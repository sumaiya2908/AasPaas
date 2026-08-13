import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BackLink, Screen, StepDots } from '@/components/ui';
import { CitySearchField } from '@/components/CitySearchField';
import { createCityShell, CITIES, type City } from '@/data/cities';
import { getMomentsByCity } from '@/data/moments';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useGoToWelcome } from '@/hooks/useGoToWelcome';
import { listCities, type ApiCity } from '@/services/aaspaasApi';
import { useAppStore } from '@/store/useAppStore';

const TILE_TINTS = [colors.cream, colors.dusk, colors.sun, colors.goldSoft];
const TILE_ACCENTS = [colors.accent, colors.primary, colors.mint, colors.gold];

function cityHook(city: City) {
  const moment = getMomentsByCity(city.slug || city.id)[0];
  if (moment) return moment.feeling;
  return city.mood.slice(0, 2).join(' · ') || 'Ready to explore';
}

function mapApiCity(r: ApiCity): City {
  const shell = createCityShell({
    id: r.id,
    slug: r.slug,
    name: r.name,
    state: r.stateObj?.name || r.state,
    country: r.countryObj?.name || r.country,
  });
  return {
    ...shell,
    weather: r.weather || shell.weather,
    tempC: r.tempC ?? shell.tempC,
    mood: r.mood?.length ? r.mood : shell.mood,
    briefing: r.briefing || shell.briefing,
  };
}

export default function ChooseCityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selectedCityId = useAppStore((s) => s.selectedCityId);
  const isGuest = useAppStore((s) => s.isGuest);
  const user = useAppStore((s) => s.user);
  const customCities = useAppStore((s) => s.customCities);
  const setSelectedCityId = useAppStore((s) => s.setSelectedCityId);
  const mergeCustomCities = useAppStore((s) => s.mergeCustomCities);
  const upsertCustomCity = useAppStore((s) => s.upsertCustomCity);
  const goToWelcome = useGoToWelcome();
  const fade = useRef(new Animated.Value(0)).current;
  const hasCity = Boolean(selectedCityId);

  const [searchSelected, setSearchSelected] = useState<ApiCity | null>(null);
  const [remoteCities, setRemoteCities] = useState<City[]>([]);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [fade]);

  useEffect(() => {
    let cancelled = false;
    listCities()
      .then((rows) => {
        if (cancelled) return;
        const mapped = rows.filter((r) => r.status !== 'COMING_SOON').map(mapApiCity);
        setRemoteCities(mapped);
        mergeCustomCities(mapped);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [mergeCustomCities]);

  const featured = useMemo(() => {
    const map = new Map<string, City>();
    // Prefer API ACTIVE cities; fall back to local catalog shells
    [...remoteCities, ...customCities, ...CITIES.map((c) => ({ ...c, slug: c.id }))].forEach(
      (c) => {
        if (!map.has(c.id)) map.set(c.id, c);
      }
    );
    return Array.from(map.values()).slice(0, 12);
  }, [customCities, remoteCities]);

  const goBack = () => {
    if (isGuest) {
      goToWelcome();
      return;
    }
    if (!hasCity && user) {
      router.replace('/profile-setup');
      return;
    }
    if (hasCity) {
      router.replace('/(tabs)');
      return;
    }
    goToWelcome();
  };

  const selectCity = async (city: City) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    upsertCustomCity(city);
    setSelectedCityId(city.id);
    router.replace({ pathname: '/city/[id]', params: { id: city.id } });
  };

  const selectFromSearch = async (apiCity: ApiCity) => {
    if (apiCity.status === 'COMING_SOON') return;
    const city = mapApiCity(apiCity);
    setSearchSelected(apiCity);
    await selectCity(city);
  };

  return (
    <Screen mist>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 8, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <BackLink
            label={isGuest ? 'Welcome' : !hasCity && user ? 'Profile' : 'Back'}
            onPress={goBack}
          />
          {!hasCity && isGuest ? <StepDots step={2} total={2} /> : <View />}
        </View>

        <Text style={styles.title}>{hasCity ? 'Switch city' : 'Where to?'}</Text>
        <Text style={styles.sub}>
          Search the canonical city database — then select one. No free-text cities.
        </Text>

        <View style={{ marginTop: spacing.lg }}>
          <CitySearchField
            selected={searchSelected}
            onSelect={selectFromSearch}
            onClear={() => setSearchSelected(null)}
          />
        </View>

        <Text style={styles.section}>Featured</Text>
        <Animated.View style={{ opacity: fade, gap: 14, marginTop: spacing.sm }}>
          {featured.map((city, index) => {
            const selected = selectedCityId === city.id;
            const tint = TILE_TINTS[index % TILE_TINTS.length];
            const accent = TILE_ACCENTS[index % TILE_ACCENTS.length];
            return (
              <Pressable
                key={city.id}
                onPress={() => selectCity(city)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.cityCard,
                  { backgroundColor: selected ? colors.primarySoft : tint },
                  selected && styles.citySelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.accentBar, { backgroundColor: accent }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.cityName}>{city.name}</Text>
                        {selected ? (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>Here</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.cityState}>{city.state}</Text>
                    </View>
                    {city.tempC > 0 ? (
                      <Text style={[styles.temp, { color: accent }]}>{city.tempC}°</Text>
                    ) : null}
                  </View>

                  <Text style={styles.hook} numberOfLines={2}>
                    {cityHook(city)}
                  </Text>

                  <Text style={styles.vibe} numberOfLines={1}>
                    {city.mood.slice(0, 3).join('  ·  ')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 40,
    letterSpacing: -1,
    color: colors.text,
  },
  sub: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    maxWidth: 320,
  },
  section: {
    marginTop: spacing.xl,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  cityCard: {
    flexDirection: 'row',
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 118,
  },
  citySelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  accentBar: {
    width: 7,
  },
  cardBody: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityName: {
    fontFamily: fonts.serifBold,
    fontSize: 26,
    letterSpacing: -0.4,
    color: colors.text,
  },
  currentBadge: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.primary,
  },
  cityState: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  temp: {
    fontFamily: fonts.serif,
    fontSize: 24,
    letterSpacing: -0.4,
  },
  hook: {
    marginTop: 12,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  vibe: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 12,
    letterSpacing: 0.2,
    color: colors.textDim,
  },
});
