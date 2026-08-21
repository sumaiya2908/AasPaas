import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { GhostButton, PrimaryButton, Screen } from '@/components/ui';
import { CitySearchSheet } from '@/components/CitySearchSheet';
import { DayDashboard } from '@/components/DayDashboard';
import { getCityIdentity } from '@/data/cityVibes';
import { cityExploreLine, greetingForNow } from '@/services/exploreCopy';
import {
  buildBecauseYouSaved,
  buildVibeTiles,
  planReadyCity,
  type StoryPull,
} from '@/services/exploreDashboard';
import {
  fetchCityExperiences,
  fetchCityToday,
  fetchHomeFeed,
  type ApiCity,
  type ApiDayDigest,
  type ApiTodayItem,
} from '@/services/aaspaasApi';
import {
  getLocationPermissionStatus,
  readApproximateLocation,
  requestApproximateLocation,
} from '@/services/location';
import { openCityExperience } from '@/services/openCity';
import { colors, fonts, motion, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

type ContinueCity = {
  city: ApiCity;
  today: ApiTodayItem[];
  source: 'recent' | 'nearby' | 'home';
};

function todayIcon(type: string) {
  if (type === 'avoid') return '⚠';
  if (type === 'question') return '❓';
  if (type === 'experience') return '✦';
  return '·';
}

/**
 * Explore home — day digest first, then discovery.
 * Greeting → search → today’s digest → vibe → continue.
 */
export default function ExploreHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const recentCities = useAppStore((s) => s.recentCities);
  const customCities = useAppStore((s) => s.customCities);
  const savedExperiences = useAppStore((s) => s.savedExperiences);
  const locationPromptDismissed = useAppStore((s) => s.locationPromptDismissed);
  const dismissLocationPrompt = useAppStore((s) => s.dismissLocationPrompt);
  const toggleSaveCity = useAppStore((s) => s.toggleSaveCity);
  const isCitySaved = useAppStore((s) => s.isCitySaved);
  const setSelectedCityId = useAppStore((s) => s.setSelectedCityId);

  const [searchOpen, setSearchOpen] = useState(false);
  const [trending, setTrending] = useState<ApiCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dayDigest, setDayDigest] = useState<ApiDayDigest | null>(null);
  const [continueCity, setContinueCity] = useState<ContinueCity | null>(null);
  const [storyPull, setStoryPull] = useState<StoryPull | null>(null);
  const [locStatus, setLocStatus] = useState<'granted' | 'denied' | 'undetermined'>(
    'undetermined',
  );
  const [showLocPrompt, setShowLocPrompt] = useState(false);
  // Detected city name from reverse-geocode / nearby API (e.g. "Jaipur")
  const [locCityName, setLocCityName] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(true);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(12)).current;
  const storyFade = useRef(new Animated.Value(0)).current;

  const greeting = greetingForNow(user?.name);

  const runEntrance = useCallback(() => {
    fadeIn.setValue(0);
    rise.setValue(16);
    storyFade.setValue(0);
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: motion.entrance,
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: motion.entrance,
        useNativeDriver: true,
      }),
      Animated.timing(storyFade, {
        toValue: 1,
        duration: motion.entrance + 180,
        delay: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeIn, rise, storyFade]);

  const loadStoryPull = useCallback(
    async (cities: ApiCity[], excludeId?: string | null) => {
      const candidate = cities.find((c) => c.id !== excludeId) || cities[0] || null;
      if (!candidate) {
        setStoryPull(null);
        return;
      }
      try {
        const exp = await fetchCityExperiences(candidate.id, 3);
        const item = exp.items.find((i) => i.body?.trim().length > 20);
        if (item) {
          setStoryPull({
            city: candidate,
            quote: item.body.trim(),
            meta: [item.authorName, item.ago].filter(Boolean).join(' · '),
            kind: 'community',
          });
          return;
        }
      } catch {
        // curated local take only when no community item
      }
      const identity = getCityIdentity(candidate.slug || candidate.id, candidate.name);
      if (identity.localTake && !identity.localTake.includes('Be the first')) {
        setStoryPull({
          city: candidate,
          quote: identity.localTake,
          meta: identity.localAuthor,
          kind: 'localTake',
        });
      } else {
        setStoryPull(null);
      }
    },
    [],
  );

  const loadDashboard = useCallback(
    async (coords?: { latitude: number; longitude: number } | null) => {
      setLoading(true);
      setError(false);
      try {
        const focusCityId =
          profile?.homeCityId?.trim() ||
          recentCities[0]?.id ||
          recentCities[0]?.slug ||
          undefined;

        const feed = await fetchHomeFeed({
          lat: coords?.latitude,
          lng: coords?.longitude,
          limit: 8,
          focusCityId,
        });
        const discover = feed.discoverCities.slice(0, 6);
        setTrending(discover);
        setDayDigest(feed.dayDigest ?? null);

        // Continue exploring — only if different from day digest city
        let nextContinue: ContinueCity | null = null;
        const digestId = feed.dayDigest?.city.id;
        const recent = recentCities[0];

        if (recent && recent.id !== digestId) {
          const cached = customCities.find((c) => c.id === recent.id);
          const fromDiscover = discover.find((c) => c.id === recent.id);
          try {
            const today = await fetchCityToday(recent.id || recent.slug);
            nextContinue = {
              city: today.city,
              today: today.items,
              source: 'recent',
            };
          } catch {
            if (fromDiscover) {
              nextContinue = { city: fromDiscover, today: [], source: 'recent' };
            } else if (cached) {
              nextContinue = {
                city: {
                  id: cached.id,
                  slug: cached.slug || cached.id,
                  dbId: cached.id,
                  name: cached.name,
                  state: cached.state || '',
                  country: cached.country || '',
                  weather: cached.weather || '',
                  tempC: cached.tempC || 0,
                  mood: cached.mood || [],
                  briefing: cached.briefing || '',
                },
                today: [],
                source: 'recent',
              };
            }
          }
        }

        setContinueCity(nextContinue);
        await loadStoryPull(discover, digestId || nextContinue?.city.id);
        runEntrance();
      } catch {
        setTrending([]);
        setDayDigest(null);
        setContinueCity(null);
        setStoryPull(null);
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [
      profile?.homeCityId,
      recentCities,
      customCities,
      loadStoryPull,
      runEntrance,
    ],
  );

  const openAppSettings = () => {
    if (Platform.OS === 'android') {
      void Linking.openSettings();
    } else {
      void Linking.openURL('app-settings:');
    }
  };

  // Resolve the location label from feed result or profile fallback
  const resolveLocLabel = (
    feed: import('@/services/aaspaasApi').ApiHomeFeed,
    status: 'granted' | 'denied' | 'undetermined',
    homeCityName?: string | null,
  ) => {
    if (status === 'granted' && feed.dayDigest?.source === 'nearby' && feed.dayDigest.city) {
      return feed.dayDigest.city.name;
    }
    if (homeCityName) return homeCityName;
    if (feed.dayDigest?.city) return feed.dayDigest.city.name;
    return null;
  };

  // Run once on mount — check location permission and load dashboard.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLocLoading(true);
      const status = await getLocationPermissionStatus();
      if (cancelled) return;
      setLocStatus(status);
      let coords = null;
      if (status === 'granted') {
        coords = await readApproximateLocation();
      }
      if (cancelled) return;
      await loadDashboard(coords);
      if (cancelled) return;
      // Resolve location label from what the feed returned
      setLocLoading(false);
      if (status === 'undetermined' && !locationPromptDismissed) {
        setTimeout(() => {
          if (!cancelled) setShowLocPrompt(true);
        }, 600);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // After dashboard loads, derive the city label
  useEffect(() => {
    if (loading) return;
    const label = resolveLocLabel(
      { dayDigest, discoverCities: trending, nearby: { city: null, distanceKm: null, today: null }, generatedAt: '' },
      locStatus,
      profile?.homeCity || profile?.homeCityId || null,
    );
    setLocCityName(label);
    setLocLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, dayDigest, locStatus]);

  const onDetectLocation = async () => {
    setLocLoading(true);
    setShowLocPrompt(false);
    dismissLocationPrompt();
    const coords = await requestApproximateLocation();
    const newStatus = await getLocationPermissionStatus();
    setLocStatus(newStatus);
    await loadDashboard(coords);
  };

  const onMaybeLater = () => {
    setShowLocPrompt(false);
    dismissLocationPrompt();
  };

  // Legacy alias used inside jsx
  const onShowNearby = onDetectLocation;

  const openCity = (city: ApiCity) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openCityExperience(router, city);
  };

  const onToggleSave = (cityId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSaveCity(cityId);
  };

  const goPlan = (cityId: string) => {
    router.push({
      pathname: '/journey/build',
      params: { cityId, fromSaved: '1' },
    });
  };

  const vibeTiles = useMemo(() => buildVibeTiles(trending), [trending]);

  const becauseYouSaved = useMemo(
    () =>
      buildBecauseYouSaved(
        savedExperiences,
        trending,
        dayDigest?.city.id || continueCity?.city.id,
        profile?.interests || [],
      ),
    [
      savedExperiences,
      trending,
      dayDigest?.city.id,
      continueCity?.city.id,
      profile?.interests,
    ],
  );

  const planReady = useMemo(
    () =>
      planReadyCity(
        savedExperiences,
        dayDigest?.city.id || continueCity?.city.id,
      ),
    [savedExperiences, dayDigest?.city.id, continueCity?.city.id],
  );

  const continueIdentity = continueCity
    ? getCityIdentity(
        continueCity.city.slug || continueCity.city.id,
        continueCity.city.name,
      )
    : null;

  const continueToday =
    continueCity && continueCity.city.id !== dayDigest?.city.id
      ? continueCity.today.slice(0, 3)
      : [];

  // Compute why the digest city is showing when it's not nearby
  const digestFallbackLabel = useMemo(() => {
    if (!dayDigest || dayDigest.source === 'nearby') return null;
    const digestCityId = dayDigest.city.id;
    if (profile?.homeCityId && digestCityId === profile.homeCityId) {
      return `Home · ${dayDigest.city.name}`;
    }
    if (recentCities.some((r) => r.id === digestCityId || r.slug === digestCityId)) {
      return `Recently explored`;
    }
    return 'Featured city';
  }, [dayDigest, profile?.homeCityId, recentCities]);

  const goShareDigest = () => {
    if (!dayDigest) return;
    setSelectedCityId(dayDigest.city.id);
    router.push({ pathname: '/share', params: { mode: 'experience' } });
  };

  return (
    <Screen atmosphere>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 8, paddingBottom: insets.bottom + 108 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Swiggy/Zomato-style location header ── */}
        <View style={styles.topBar}>
          {/* Left: location selector */}
          <Pressable
            style={styles.locBar}
            onPress={locStatus === 'denied' ? openAppSettings : locStatus === 'granted' ? undefined : onDetectLocation}
            accessibilityRole="button"
            accessibilityLabel="Location"
          >
            <View style={styles.locBarLeft}>
              <Ionicons
                name={locStatus === 'granted' ? 'navigate' : 'navigate-outline'}
                size={16}
                color={locStatus === 'granted' ? colors.primary : colors.accent}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.locBarLabel}>
                  {locStatus === 'granted' ? 'Near you' : locStatus === 'denied' ? 'Location off' : 'Set location'}
                </Text>
                {locLoading ? (
                  <Text style={styles.locBarCity} numberOfLines={1}>Detecting…</Text>
                ) : locCityName ? (
                  <Text style={styles.locBarCity} numberOfLines={1}>{locCityName}</Text>
                ) : locStatus === 'denied' ? (
                  <Text style={[styles.locBarCity, styles.locBarDenied]} numberOfLines={1}>
                    Tap to enable in Settings
                  </Text>
                ) : (
                  <Text style={[styles.locBarCity, styles.locBarCta]} numberOfLines={1}>
                    Detect my location
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={14} color={colors.textDim} />
            </View>
          </Pressable>

          {/* Right: alerts */}
          <Pressable onPress={() => router.push('/notifications')} hitSlop={10} style={styles.alertsBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <Text style={styles.greeting}>{greeting}</Text>

        <Pressable
          onPress={() => setSearchOpen(true)}
          style={({ pressed }) => [styles.searchHit, pressed && { opacity: 0.9 }]}
          accessibilityRole="search"
          accessibilityLabel="Search a city or place"
        >
          <Ionicons name="search-outline" size={16} color={colors.textDim} />
          <Text style={styles.searchPlaceholder}>Search a city or place…</Text>
        </Pressable>

{/* Location prompt only shown first time for undetermined — top bar handles denied/granted */}
        {showLocPrompt && locStatus === 'undetermined' ? (
          <View style={styles.locPrompt}>
            <Text style={styles.locTitle}>What’s near you?</Text>
            <Text style={styles.locBody}>
              Share approximate location to see what’s happening in the nearest city.
            </Text>
            <PrimaryButton label="Detect my location" onPress={onDetectLocation} />
            <GhostButton
              label="Not now"
              onPress={onMaybeLater}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.softNote}>Couldn’t load Explore right now.</Text>
            <GhostButton
              label="Try again"
              onPress={() => void loadDashboard(null)}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: rise }] }}>
            {/* EXPLORE BY VIBE — above the day dashboard */}
            {vibeTiles.length > 0 ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.section}>Explore by vibe</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.vibeRow}
                  decelerationRate="fast"
                >
                  {vibeTiles.map((tile) => {
                    const saved = isCitySaved(tile.city.id);
                    return (
                      <Pressable
                        key={`${tile.city.id}-${tile.title}`}
                        onPress={() => openCity(tile.city)}
                        style={({ pressed }) => [
                          styles.vibeCard,
                          pressed && { opacity: 0.9 },
                        ]}
                      >
                        <View style={styles.vibeTop}>
                          <Text style={styles.vibeIcon}>{tile.icon}</Text>
                          <Pressable
                            onPress={() => onToggleSave(tile.city.id)}
                            hitSlop={10}
                            accessibilityLabel={saved ? 'Unsave city' : 'Save city'}
                          >
                            <Text style={[styles.vibeSaveIcon, saved && styles.vibeSaveOn]}>
                              {saved ? '♥' : '♡'}
                            </Text>
                          </Pressable>
                        </View>
                        <Text style={styles.vibeTitle} numberOfLines={2}>
                          {tile.title}
                        </Text>
                        <Text style={styles.vibeCity}>{tile.city.name}</Text>
                        <Text style={styles.vibeDesc} numberOfLines={2}>
                          {tile.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Day dashboard */}
            {dayDigest ? (
              <DayDashboard
                digest={dayDigest}
                onOpenCity={() => openCity(dayDigest.city)}
                onShare={goShareDigest}
                fallbackLabel={digestFallbackLabel}
              />
            ) : locStatus !== 'granted' && !showLocPrompt ? (
              <View style={styles.digestEmpty}>
                <Text style={styles.section}>Your day</Text>
                <Text style={styles.digestEmptyTitle}>
                  Nothing on your dashboard yet
                </Text>
                <Text style={styles.digestEmptyBody}>
                  Search a city, or turn on approximate location to see today’s updates the moment you open AASPAAS.
                </Text>
                {locStatus === 'denied' ? (
                  <GhostButton
                    label="Enable location in Settings"
                    onPress={openAppSettings}
                    style={{ marginTop: spacing.md }}
                  />
                ) : locStatus === 'undetermined' ? (
                  <GhostButton
                    label="Detect my location"
                    onPress={onDetectLocation}
                    style={{ marginTop: spacing.md }}
                  />
                ) : null}
              </View>
            ) : null}

            {/* CONTINUE EXPLORING — only if different from nearby */}
            {continueCity && continueIdentity ? (
              <View style={styles.continueBlock}>
                <Text style={styles.section}>Continue exploring</Text>
                <Pressable onPress={() => openCity(continueCity.city)}>
                  <Text style={styles.cityName}>{continueCity.city.name}</Text>
                  <Text style={styles.cityInvite}>
                    {cityExploreLine(continueCity.city)}
                  </Text>
                </Pressable>

                <View style={styles.moodStrip}>
                  {(continueCity.city.mood?.length
                    ? continueCity.city.mood.slice(0, 3)
                    : continueIdentity.vibes.slice(0, 3).map((v) => v.label)
                  ).map((label) => (
                    <Text key={label} style={styles.moodWord}>
                      {label.split('&')[0].trim()}
                    </Text>
                  ))}
                </View>

                {continueToday.length > 0 ? (
                  <View style={styles.nearSection}>
                    <Text style={styles.nearSubhead}>
                      Today in {continueCity.city.name}
                    </Text>
                    {continueToday.map((item) => (
                      <Text
                        key={item.id}
                        style={[styles.todayLine, item.warn && styles.todayWarn]}
                        numberOfLines={2}
                      >
                        {todayIcon(item.type)} {item.text}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <PrimaryButton
                  label={`Explore ${continueCity.city.name} →`}
                  onPress={() => openCity(continueCity.city)}
                  style={{ marginTop: spacing.lg }}
                />
              </View>
            ) : null}

            {/* Optional personalization — not the hero of Home */}
            {becauseYouSaved ? (
              <Pressable
                onPress={() => openCity(becauseYouSaved.city)}
                style={({ pressed }) => [styles.personalCard, pressed && { opacity: 0.92 }]}
              >
                <Text style={styles.section}>Because you saved</Text>
                <Text style={styles.personalHook}>{becauseYouSaved.hook}</Text>
                <Text style={styles.personalTease}>{becauseYouSaved.tease}</Text>
                <Text style={styles.personalCta}>
                  Explore {becauseYouSaved.city.name} →
                </Text>
              </Pressable>
            ) : null}

            {storyPull ? (
              <Animated.View style={[styles.storyPull, { opacity: storyFade }]}>
                <Text style={styles.section}>
                  {storyPull.kind === 'community'
                    ? 'Experiences people remember'
                    : 'A local’s take'}
                </Text>
                <Pressable
                  onPress={() => openCity(storyPull.city)}
                  style={({ pressed }) => pressed && { opacity: 0.9 }}
                >
                  <Text style={styles.storyQuote}>“{storyPull.quote}”</Text>
                  <Text style={styles.storyMeta}>
                    {storyPull.meta} · {storyPull.city.name}
                  </Text>
                  <Text style={styles.storyCta}>
                    Explore {storyPull.city.name} →
                  </Text>
                </Pressable>
              </Animated.View>
            ) : null}

            {planReady ? (
              <View style={styles.planBridge}>
                <Text style={styles.section}>Ready when you are</Text>
                <Text style={styles.planLine}>
                  You’ve saved {planReady.count} experiences in {planReady.cityName}.
                  What kind of trip do you want?
                </Text>
                <PrimaryButton
                  label={`Plan my ${planReady.cityName}`}
                  onPress={() => goPlan(planReady.cityId)}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            ) : null}
          </Animated.View>
        )}
      </ScrollView>

      <CitySearchSheet
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        popular={trending}
        onSelect={(city) => {
          setSearchOpen(false);
          openCity(city);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  locBar: {
    flex: 1,
    paddingRight: 12,
  },
  locBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locBarLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  locBarCity: {
    fontFamily: fonts.serifBold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.text,
    marginTop: 1,
  },
  locBarDenied: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.accent,
    letterSpacing: 0,
  },
  locBarCta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.primary,
    letterSpacing: 0,
  },
  alertsBtn: {
    padding: 4,
  },
  greeting: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  searchHit: {
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchPlaceholder: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textDim,
    flex: 1,
  },
  locPrompt: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.cream,
  },
  locTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 17,
    color: colors.text,
  },
  locBody: {
    marginTop: 8,
    marginBottom: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  sectionBlock: {
    marginTop: spacing.lg,
  },
  digestEmpty: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 28,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  digestEmptyTitle: {
    marginTop: 4,
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 30,
    color: colors.text,
  },
  digestEmptyBody: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  section: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.textDim,
    marginBottom: 6,
  },
  nearBlock: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 28,
    backgroundColor: colors.dusk,
  },
  nearMeta: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  nearSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  nearSubhead: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.textDim,
    marginBottom: 10,
  },
  nearRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  nearIcon: {
    marginTop: 2,
    fontSize: 14,
    color: colors.primary,
    width: 18,
  },
  nearItemText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  nearItemMeta: {
    marginTop: 3,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textDim,
  },
  tryCard: {
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  tryTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 14,
    color: colors.text,
  },
  tryBody: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  secondaryLink: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    paddingVertical: 10,
  },
  secondaryLinkText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.accent,
  },
  vibeRow: {
    marginTop: spacing.sm,
    gap: 12,
    paddingRight: spacing.lg,
  },
  vibeCard: {
    width: 168,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  vibeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vibeIcon: {
    fontSize: 22,
  },
  vibeSaveIcon: {
    fontSize: 18,
    color: colors.textDim,
  },
  vibeSaveOn: {
    color: colors.accent,
  },
  vibeTitle: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    minHeight: 44,
  },
  vibeCity: {
    marginTop: 10,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
  vibeDesc: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  continueBlock: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: 28,
    backgroundColor: colors.dusk,
  },
  cityName: {
    fontFamily: fonts.serifBold,
    fontSize: 34,
    letterSpacing: -0.8,
    color: colors.text,
  },
  digestHeadline: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: colors.text,
  },
  cityInvite: {
    marginTop: 8,
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 26,
    color: colors.text,
    maxWidth: 320,
  },
  moodStrip: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodWord: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statChip: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primary,
    backgroundColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  todayBlock: {
    marginTop: spacing.xxl,
  },
  todayLine: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  todayWarn: {
    color: colors.warning,
  },
  personalCard: {
    marginTop: spacing.xxl,
  },
  personalHook: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
    color: colors.text,
    maxWidth: 320,
  },
  personalTease: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    maxWidth: 300,
  },
  personalCta: {
    marginTop: 12,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.primary,
  },
  storyPull: {
    marginTop: spacing.xxl,
  },
  storyQuote: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 32,
    letterSpacing: -0.3,
    color: colors.text,
    maxWidth: 320,
  },
  storyMeta: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  storyCta: {
    marginTop: 10,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.primary,
  },
  planBridge: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: 22,
    backgroundColor: colors.cream,
  },
  planLine: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 26,
    color: colors.text,
    maxWidth: 300,
  },
  softNote: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  errorBox: {
    marginTop: spacing.xxl,
  },
});

