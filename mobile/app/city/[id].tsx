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
  type ApiExperienceItem,
  type ApiTodayItem,
} from '@/services/aaspaasApi';
import { buildYourCityLens } from '@/services/yourCity';
import { colors, fonts, hit, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

type PeopleItem = {
  id: string;
  title: string;
  body: string;
  meta: string;
  source: 'api' | 'moment';
  sourceId: string;
};

/**
 * City Page — City Vibe · Local take · People · Today
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

  const city = getCity(cityId, customCities);
  const contentKey = city.slug || city.id;
  const identity = getCityIdentity(contentKey, city.name);
  const localMoments = getMomentsByCity(contentKey).slice(0, 3);
  const citySaved = isCitySaved(cityId);
  const savedForCity = useMemo(
    () => savedExperiences.filter((e) => e.cityId === cityId),
    [savedExperiences, cityId]
  );
  const yourCity = useMemo(
    () => buildYourCityLens(city.name, savedForCity, profile),
    [city.name, savedForCity, profile]
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [todayItems, setTodayItems] = useState<ApiTodayItem[]>([]);
  const [todayEmpty, setTodayEmpty] = useState<string | null>(null);
  const [apiExperiences, setApiExperiences] = useState<ApiExperienceItem[] | null>(
    null,
  );
  const [peopleEmpty, setPeopleEmpty] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCityId(cityId);
    pushRecentCity({
      id: city.id,
      slug: city.slug || city.id,
      name: city.name,
      state: city.state,
      country: city.country,
    });
  }, [cityId, city.id, city.slug, city.name, city.state, city.country, setSelectedCityId, pushRecentCity]);

  useEffect(() => {
    let cancelled = false;
    const key = city.id || cityId;
    (async () => {
      try {
        const [today, experiences] = await Promise.all([
          fetchCityToday(key),
          fetchCityExperiences(key, 6),
        ]);
        if (cancelled) return;
        setTodayItems(today.items);
        setTodayEmpty(today.emptyMessage);
        setApiExperiences(experiences.items);
        setPeopleEmpty(experiences.emptyMessage);
      } catch {
        if (cancelled) return;
        setTodayItems([]);
        setTodayEmpty('No major updates today.');
        setApiExperiences(null);
        setPeopleEmpty(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [city.id, cityId]);

  const peopleItems: PeopleItem[] = useMemo(() => {
    if (apiExperiences && apiExperiences.length > 0) {
      return apiExperiences.map((e) => ({
        id: e.id,
        title: e.title,
        body: e.body,
        meta: [e.neighborhood, e.authorName, e.ago].filter(Boolean).join(' · '),
        source: 'api' as const,
        sourceId: e.id,
      }));
    }
    if (apiExperiences === null || apiExperiences.length === 0) {
      return localMoments.map((m) => ({
        id: m.id,
        title: m.feeling,
        body: m.story,
        meta: `${m.placeHint} · ${m.author}`,
        source: 'moment' as const,
        sourceId: m.id,
      }));
    }
    return [];
  }, [apiExperiences, localMoments]);

  const primaryLabel =
    savedForCity.length >= 2 ? `Build my ${city.name} journey` : `Plan my ${city.name}`;

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

  const onContribute = (action: ContributeAction) => {
    if (action === 'ask') {
      router.push('/ask');
      return;
    }
    if (action === 'experience') {
      router.push({ pathname: '/share', params: { mode: 'experience' } });
      return;
    }
    router.push({ pathname: '/share', params: { mode: 'avoid' } });
  };

  return (
    <Screen mist>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 8, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BackLink label="Explore" onPress={() => router.back()} />

        <View style={styles.header}>
          <Pressable onPress={switchCity} style={styles.cityHit} accessibilityRole="button">
            <Text style={styles.cityName}>{city.name}</Text>
            <Text style={styles.region}>{city.state}</Text>
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/notifications')} hitSlop={10} style={styles.saveCityHit}>
              <Text style={styles.saveCity}>Alerts</Text>
            </Pressable>
            <Pressable onPress={onSaveCity} hitSlop={10} style={styles.saveCityHit}>
              <Text style={[styles.saveCity, citySaved && styles.saveCityOn]}>
                {citySaved ? '♥ Saved' : '♡ Save city'}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.tagline}>{identity.tagline}</Text>

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

        <Text style={styles.section}>City vibe</Text>
        <Text style={styles.sectionLead}>One city. Many ways to experience it.</Text>
        <View style={styles.vibeList}>
          {identity.vibes.map((v) => (
            <View key={v.label} style={styles.vibeRow}>
              <Text style={styles.vibeIcon}>{v.icon}</Text>
              <Text style={styles.vibeLabel}>{v.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>A local&apos;s take</Text>
        <View style={styles.localCard}>
          <Text style={styles.localQuote}>“{identity.localTake}”</Text>
          <Text style={styles.localAuthor}>— {identity.localAuthor}</Text>
        </View>

        <Text style={styles.section}>People are saying</Text>
        {peopleItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {peopleEmpty || 'Just getting started on AASPAAS.'}
            </Text>
            <GhostButton
              label="Share a moment"
              onPress={() => setSheetOpen(true)}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        ) : (
          <View style={styles.sayList}>
            {peopleItems.map((m) => {
              const saved = isExperienceSaved(m.sourceId);
              return (
                <View key={m.id} style={styles.sayCard}>
                  <Text style={styles.sayTitle}>{m.title}</Text>
                  <Text style={styles.sayBody} numberOfLines={3}>
                    {m.body}
                  </Text>
                  <View style={styles.sayFooter}>
                    <Text style={styles.sayMeta}>{m.meta}</Text>
                    <Pressable onPress={() => onSavePeople(m)} hitSlop={8}>
                      <Text style={[styles.saveExp, saved && styles.saveExpOn]}>
                        {saved ? '✓ Saved' : '♡ Save'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.section}>Today in {city.name}</Text>
        {todayItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {todayEmpty || 'No major updates today.'}
            </Text>
            <Text style={styles.emptySub}>Be the first to share what&apos;s happening.</Text>
          </View>
        ) : (
          <View style={styles.todayList}>
            {todayItems.map((b) => (
              <Text key={b.id} style={[styles.todayItem, b.warn && styles.todayWarn]}>
                {b.text}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.ctaBlock}>
          <PrimaryButton label={primaryLabel} onPress={goPlan} />
          <GhostButton
            label="Ask a local"
            onPress={() => router.push('/ask')}
            style={{ marginTop: spacing.sm }}
          />
          {savedForCity.length >= 2 ? (
            <Text style={styles.ctaHint}>
              You&apos;ve saved {savedForCity.length} experiences in {city.name}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 88 }]}
        onPress={() => setSheetOpen(true)}
        accessibilityLabel="Share or ask"
      >
        <Text style={styles.fabPlus}>+</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cityHit: {
    minHeight: hit.min,
    justifyContent: 'center',
    flex: 1,
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
    minHeight: hit.min,
    justifyContent: 'center',
  },
  saveCity: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  saveCityOn: {
    color: colors.accent,
  },
  tagline: {
    marginTop: spacing.md,
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: colors.text,
    maxWidth: 320,
  },
  yourCity: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  yourCityTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 26,
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
  experienceHint: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
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
  vibeList: {
    marginTop: spacing.sm,
    gap: 12,
  },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  vibeIcon: {
    fontSize: 20,
    width: 28,
  },
  vibeLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text,
  },
  localCard: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.cream,
  },
  localQuote: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 28,
    color: colors.text,
  },
  localAuthor: {
    marginTop: spacing.md,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textDim,
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
    fontSize: 17,
    color: colors.text,
    marginBottom: 8,
  },
  sayBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
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
    fontSize: 14,
    color: colors.accent,
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
  emptySub: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
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
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  fabPlus: {
    fontSize: 28,
    color: colors.white,
    marginTop: -1,
  },
});
