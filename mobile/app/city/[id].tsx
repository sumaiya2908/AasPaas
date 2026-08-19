import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BackLink, GhostButton, PrimaryButton, Screen } from '@/components/ui';
import { ContributeSheet, ContributeAction } from '@/components/ContributeSheet';
import { getCity } from '@/data/cities';
import { getCityIdentity } from '@/data/cityVibes';
import { getMomentsByCity } from '@/data/moments';
import {
  fetchCityExperiences,
  fetchCityToday,
  type ApiCity,
  type ApiExperienceItem,
  type ApiTodayItem,
} from '@/services/aaspaasApi';
import {
  buildCityPulseFacets,
  collectExperienceTags,
  isGenericCityBriefing,
  momentTitleFromExperience,
} from '@/services/cityPulse';
import { buildYourCityLens } from '@/services/yourCity';
import { colors, fonts, hit, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

type PeopleItem = {
  id: string;
  title: string;
  body: string;
  place: string | null;
  ago: string;
  source: 'api' | 'moment';
  sourceId: string;
};

/**
 * City Page — Hero · Pulse · Essence · Ask · People · Today
 * Opened from Explore with canonical city_id.
 */
export default function CityPageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: paramId } = useLocalSearchParams<{ id: string }>();
  const storeCityId = useAppStore((s) => s.selectedCityId);
  const cityId = paramId || storeCityId || 'jaipur';
  const setSelectedCityId = useAppStore((s) => s.setSelectedCityId);
  const pushRecentCity = useAppStore((s) => s.pushRecentCity);
  const customCities = useAppStore((s) => s.customCities);
  const savedExperiences = useAppStore((s) => s.savedExperiences);
  const profile = useAppStore((s) => s.profile);
  const toggleSaveCity = useAppStore((s) => s.toggleSaveCity);
  const isCitySaved = useAppStore((s) => s.isCitySaved);
  const toggleSaveExperience = useAppStore((s) => s.toggleSaveExperience);
  const isExperienceSaved = useAppStore((s) => s.isExperienceSaved);

  const localCity = getCity(cityId, customCities);
  const [apiCity, setApiCity] = useState<ApiCity | null>(null);

  const city = useMemo(() => {
    if (!apiCity) return localCity;
    const state =
      apiCity.stateObj?.name || apiCity.state || localCity.state;
    const country =
      apiCity.countryObj?.name || apiCity.country || localCity.country || 'India';
    return {
      ...localCity,
      id: apiCity.id || localCity.id,
      slug: apiCity.slug || localCity.slug,
      name: apiCity.name || localCity.name,
      state,
      country,
      mood: apiCity.mood?.length ? apiCity.mood : localCity.mood,
      briefing: apiCity.briefing || localCity.briefing,
    };
  }, [apiCity, localCity]);

  const contentKey = city.slug || city.id;
  const identity = getCityIdentity(contentKey, city.name, {
    briefing: city.briefing,
  });
  const localMoments = getMomentsByCity(contentKey).slice(0, 3);
  const citySaved = isCitySaved(cityId);
  const savedForCity = useMemo(
    () => savedExperiences.filter((e) => e.cityId === cityId),
    [savedExperiences, cityId],
  );
  const yourCity = useMemo(
    () => buildYourCityLens(city.name, savedForCity, profile),
    [city.name, savedForCity, profile],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [todayItems, setTodayItems] = useState<ApiTodayItem[]>([]);
  const [todayEmpty, setTodayEmpty] = useState<string | null>(null);
  const [apiExperiences, setApiExperiences] = useState<ApiExperienceItem[] | null>(
    null,
  );
  const [peopleEmpty, setPeopleEmpty] = useState<string | null>(null);
  const [experienceCount, setExperienceCount] = useState<number | null>(null);
  const [weekCount, setWeekCount] = useState<number | null>(null);
  const [peopleLimit, setPeopleLimit] = useState(6);

  const regionLine = [city.state, city.country]
    .filter(Boolean)
    .filter((part, i, arr) => arr.findIndex((p) => p?.toLowerCase() === part?.toLowerCase()) === i)
    .join(', ');

  useEffect(() => {
    setSelectedCityId(cityId);
    pushRecentCity({
      id: city.id,
      slug: city.slug || city.id,
      name: city.name,
      state: city.state,
      country: city.country,
    });
  }, [
    cityId,
    city.id,
    city.slug,
    city.name,
    city.state,
    city.country,
    setSelectedCityId,
    pushRecentCity,
  ]);

  useEffect(() => {
    let cancelled = false;
    const key = city.id || cityId;
    (async () => {
      try {
        const [today, experiences] = await Promise.all([
          fetchCityToday(key),
          fetchCityExperiences(key, peopleLimit),
        ]);
        if (cancelled) return;
        setApiCity(experiences.city || today.city);
        setTodayItems(today.items);
        setTodayEmpty(today.emptyMessage);
        setApiExperiences(experiences.items);
        setPeopleEmpty(experiences.emptyMessage);
        setExperienceCount(
          typeof experiences.experienceCount === 'number'
            ? experiences.experienceCount
            : experiences.items.length,
        );
        setWeekCount(
          typeof experiences.weekCount === 'number' ? experiences.weekCount : null,
        );
      } catch {
        if (cancelled) return;
        setTodayItems([]);
        setTodayEmpty('No major updates today.');
        setApiExperiences(null);
        setPeopleEmpty(null);
        setExperienceCount(null);
        setWeekCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [city.id, cityId, peopleLimit]);

  const peopleItems: PeopleItem[] = useMemo(() => {
    if (apiExperiences && apiExperiences.length > 0) {
      return apiExperiences.map((e) => ({
        id: e.id,
        title: momentTitleFromExperience(e),
        body: e.body,
        place: e.neighborhood,
        ago: e.ago,
        source: 'api' as const,
        sourceId: e.id,
      }));
    }
    // API responded empty — invite to share; don't pad with unrelated local seeds
    if (apiExperiences !== null) return [];
    // Offline / error — curated moments for known seed cities only
    return localMoments.map((m) => ({
      id: m.id,
      title: m.feeling,
      body: m.story,
      place: m.placeHint,
      ago: '',
      source: 'moment' as const,
      sourceId: m.id,
    }));
  }, [apiExperiences, localMoments]);

  const pulseFacets = useMemo(() => {
    const tags = collectExperienceTags(apiExperiences || []);
    return buildCityPulseFacets({
      vibeTags: tags,
      mood: city.mood,
      curated: identity.vibes,
      max: 5,
    });
  }, [apiExperiences, city.mood, identity.vibes]);

  const heroDescription = useMemo(() => {
    if (!isGenericCityBriefing(city.briefing) && city.briefing) {
      return city.briefing;
    }
    if (
      identity.tagline &&
      !identity.tagline.toLowerCase().includes('still getting to know')
    ) {
      return identity.tagline;
    }
    return `Discover ${city.name} through local moments and stories.`;
  }, [city.briefing, city.name, identity.tagline]);

  const essenceText = useMemo(() => {
    const onboarding = (apiExperiences || []).find(
      (e) =>
        e.source === 'story' &&
        e.title.toLowerCase().includes('lives here'),
    );
    if (onboarding?.body?.trim()) {
      return onboarding.body.trim();
    }
    if (identity.localTake && identity.localAuthor !== 'AasPaas') {
      return identity.localTake;
    }
    if (!isGenericCityBriefing(city.briefing) && city.briefing) {
      return city.briefing;
    }
    return identity.localTake;
  }, [apiExperiences, city.briefing, identity.localAuthor, identity.localTake]);

  const pulseFreshness = useMemo(() => {
    const parts: string[] = [];
    if (experienceCount && experienceCount > 0) {
      parts.push(
        `Based on ${experienceCount} community experience${experienceCount === 1 ? '' : 's'}`,
      );
    }
    if (weekCount && weekCount > 0) {
      parts.push(
        `${weekCount} this week`,
      );
    }
    return parts.join(' · ');
  }, [experienceCount, weekCount]);

  const primaryLabel =
    savedForCity.length >= 2 ? 'Build my journey' : 'Plan my trip';

  const switchCity = () => router.push('/choose-city');

  const onSaveCity = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSaveCity(cityId);
  };

  const onSavePeople = async (item: PeopleItem) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSaveExperience({
      cityId,
      cityName: city.name,
      title: item.title,
      body: item.body,
      source: item.source === 'api' ? 'post' : 'moment',
      sourceId: item.sourceId,
    });
  };

  const goPlan = () => {
    router.push({
      pathname: '/journey/build',
      params: { cityId, fromSaved: savedForCity.length >= 2 ? '1' : '0' },
    });
  };

  const goAsk = (prompt?: string) => {
    router.push({
      pathname: '/ask',
      params: prompt ? { q: prompt } : undefined,
    });
  };

  const goShareExperience = () => {
    router.push({ pathname: '/share', params: { mode: 'experience' } });
  };

  const onContribute = (action: ContributeAction) => {
    if (action === 'ask') {
      goAsk();
      return;
    }
    if (action === 'experience') {
      goShareExperience();
      return;
    }
    router.push({ pathname: '/share', params: { mode: 'avoid' } });
  };

  const hasCommunityData = (apiExperiences?.length || 0) > 0 || localMoments.length > 0;

  return (
    <Screen mist>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 8, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <BackLink label="Explore" onPress={() => router.back()} />
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={10}
            style={styles.alertsHit}
          >
            <Text style={styles.alerts}>Alerts</Text>
          </Pressable>
        </View>

        <Pressable onPress={switchCity} style={styles.cityHit} accessibilityRole="button">
          <Text style={styles.cityName}>{city.name}</Text>
          {regionLine ? <Text style={styles.region}>{regionLine}</Text> : null}
        </Pressable>

        <Text style={styles.tagline}>{heroDescription}</Text>

        <Pressable onPress={onSaveCity} hitSlop={10} style={styles.saveCityHit}>
          <Text style={[styles.saveCity, citySaved && styles.saveCityOn]}>
            {citySaved ? '♥ Saved city' : '♡ Save city'}
          </Text>
        </Pressable>

        {/* CITY PULSE — aggregated personality */}
        <Text style={styles.section}>City Pulse</Text>
        <Text style={styles.sectionLead}>What {city.name} feels like</Text>
        <View style={styles.pulseCard}>
          <View style={styles.vibeList}>
            {pulseFacets.map((v) => (
              <View key={v.label} style={styles.vibeRow}>
                <Text style={styles.vibeIcon}>{v.icon}</Text>
                <Text style={styles.vibeLabel}>{v.label}</Text>
              </View>
            ))}
          </View>
          {pulseFreshness ? (
            <Text style={styles.pulseMeta}>{pulseFreshness}</Text>
          ) : !hasCommunityData ? (
            <Text style={styles.pulseMeta}>
              People are just starting to share what this city means to them.
            </Text>
          ) : null}
        </View>

        {/* CITY ESSENCE */}
        <Text style={styles.section}>The {city.name} essence</Text>
        <View style={styles.essenceCard}>
          <Text style={styles.essenceQuote}>“{essenceText}”</Text>
        </View>

        {/* ASK A LOCAL */}
        <Text style={styles.section}>Want to know something specific?</Text>
        <View style={styles.askCard}>
          <Text style={styles.askLead}>Ask people who know {city.name}.</Text>
          <Pressable
            onPress={() => goAsk('Where should I go for a quiet evening?')}
            style={styles.askPrompt}
            accessibilityRole="button"
          >
            <Text style={styles.askPromptText}>
              Where should I go for a quiet evening?
            </Text>
          </Pressable>
          <PrimaryButton label="Ask a local →" onPress={() => goAsk()} />
        </View>

        {yourCity ? (
          <View style={styles.yourCity}>
            <Text style={styles.yourCityTitle}>{yourCity.headline}</Text>
            <Text style={styles.yourCityLead}>{yourCity.lead}</Text>
            <View style={styles.yourThreads}>
              {yourCity.threads.map((t) => (
                <Text key={t} style={styles.yourThread}>
                  {t}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {/* PEOPLE ARE SAYING — moments */}
        <Text style={styles.section}>People are saying</Text>
        {peopleItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {peopleEmpty ||
                'People are just starting to share what this city means to them.'}
            </Text>
            <GhostButton
              label="Share an experience"
              onPress={goShareExperience}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        ) : (
          <View style={styles.sayList}>
            {peopleItems.map((m) => {
              const saved = isExperienceSaved(m.sourceId);
              const meta = [m.place, m.ago].filter(Boolean).join(' · ');
              return (
                <View key={m.id} style={styles.sayCard}>
                  <Text style={styles.sayTitle}>{m.title}</Text>
                  <Text style={styles.sayBody} numberOfLines={4}>
                    “{m.body}”
                  </Text>
                  <View style={styles.sayFooter}>
                    <Text style={styles.sayMeta}>{meta}</Text>
                    <Pressable
                      onPress={() => onSavePeople(m)}
                      hitSlop={10}
                      accessibilityLabel={saved ? 'Unsave experience' : 'Save experience'}
                    >
                      <Text style={[styles.saveExp, saved && styles.saveExpOn]}>
                        {saved ? '♥' : '♡'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
            {(experienceCount || 0) > peopleItems.length ? (
              <GhostButton
                label="See more experiences →"
                onPress={() => setPeopleLimit((n) => Math.min(n + 6, 18))}
                style={{ marginTop: spacing.xs }}
              />
            ) : null}
          </View>
        )}

        {/* TODAY — fast signals only */}
        <Text style={styles.section}>Today in {city.name}</Text>
        <Text style={styles.sectionLead}>What&apos;s happening right now</Text>
        {todayItems.length === 0 ? (
          <View style={styles.todayEmpty}>
            <Text style={styles.emptyText}>
              {todayEmpty || 'No major updates today.'}
            </Text>
          </View>
        ) : (
          <View style={styles.todayList}>
            {todayItems.map((b) => (
              <Text key={b.id} style={[styles.todayItem, b.warn && styles.todayWarn]}>
                {b.warn ? '⚠️ ' : '• '}
                {b.text}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.ctaBlock}>
          <PrimaryButton label={primaryLabel} onPress={goPlan} />
          {savedForCity.length >= 2 ? (
            <Text style={styles.ctaHint}>
              You&apos;ve saved {savedForCity.length} experiences in {city.name}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 88 }]}
        onPress={goShareExperience}
        onLongPress={() => setSheetOpen(true)}
        accessibilityLabel="Share an experience"
      >
        <Text style={styles.fabLabel}>Share</Text>
      </Pressable>

      <ContributeSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelect={onContribute}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertsHit: {
    minHeight: hit.min,
    justifyContent: 'center',
    paddingLeft: 12,
  },
  alerts: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  cityHit: {
    minHeight: hit.min,
    justifyContent: 'center',
    paddingRight: 12,
  },
  cityName: {
    fontFamily: fonts.serifBold,
    fontSize: 36,
    letterSpacing: -0.8,
    color: colors.text,
  },
  region: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  saveCityHit: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    minHeight: hit.min,
    justifyContent: 'center',
  },
  saveCity: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textMuted,
  },
  saveCityOn: {
    color: colors.accent,
  },
  tagline: {
    marginTop: spacing.md,
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: colors.text,
    maxWidth: 340,
  },
  yourCity: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  yourCityTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 24,
    letterSpacing: -0.4,
    color: colors.primary,
  },
  yourCityLead: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  yourThreads: {
    marginTop: spacing.sm,
    gap: 8,
  },
  yourThread: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text,
  },
  section: {
    marginTop: spacing.xxl,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  sectionLead: {
    marginTop: 6,
    marginBottom: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  pulseCard: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.cream,
  },
  vibeList: {
    gap: 12,
  },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
  },
  vibeIcon: {
    fontSize: 20,
    width: 28,
  },
  vibeLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text,
    flexShrink: 1,
  },
  pulseMeta: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
  },
  essenceCard: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
  },
  essenceQuote: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 30,
    color: colors.text,
  },
  askCard: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    gap: spacing.md,
  },
  askLead: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
  },
  askPrompt: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  askPromptText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textDim,
    fontStyle: 'italic',
  },
  sayList: {
    marginTop: spacing.sm,
    gap: 12,
  },
  sayCard: {
    padding: spacing.lg,
    borderRadius: 22,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  sayTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.text,
    marginBottom: 8,
  },
  sayBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
  },
  sayFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sayMeta: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textDim,
  },
  saveExp: {
    fontFamily: fonts.bodyMedium,
    fontSize: 20,
    color: colors.accent,
    paddingHorizontal: 4,
  },
  saveExpOn: {
    color: colors.primary,
  },
  todayList: {
    marginTop: spacing.sm,
    gap: 10,
  },
  todayItem: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  todayWarn: {
    color: colors.warning,
  },
  todayEmpty: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  emptyBox: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  emptyText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
  },
  ctaBlock: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  ctaHint: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
  },
  fab: {
    position: 'absolute',
    right: 16,
    minWidth: 88,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  fabLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.white,
  },
});
