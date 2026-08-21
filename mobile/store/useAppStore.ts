import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { City } from '@/data/cities';
import { createCityShell, findCityByName, slugifyCity } from '@/data/cities';
import * as api from '@/services/aaspaasApi';
import { clearAccessToken, clearSessionTokens, saveAccessToken } from '@/services/secureSession';

export type JourneyStop = {
  time: string;
  title: string;
  place?: string;
  reason: string;
  budget?: string;
  why?: {
    summary: string;
    communitySignals?: { label: string; count: number }[];
  };
};

export type JourneyDay = {
  day: number;
  label: string;
  stops: JourneyStop[];
};

export type SavedJourney = {
  id: string;
  cityId: string;
  cityName: string;
  title: string;
  days: number;
  budget: string;
  style: string;
  food: string;
  createdAt: string;
  estimate: string;
  daysPlan: JourneyDay[];
};

export type Question = {
  id: string;
  cityId: string;
  placeId?: string;
  text: string;
  tags: string[];
  createdAt: string;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  provider: 'email' | 'google' | 'apple';
};

export type UserProfile = {
  homeCityId: string;
  homeCity: string;
  interests: string[];
  travelStyle: string;
  aboutCity: string;
  completed: boolean;
};

export type SavedExperience = {
  id: string;
  cityId: string;
  cityName: string;
  title: string;
  body?: string;
  /** moment | place | custom — internal only */
  source: 'moment' | 'place' | 'custom' | 'post';
  sourceId?: string;
  createdAt: string;
};

export type RecentCity = {
  id: string;
  slug: string;
  name: string;
  state?: string;
  country?: string;
  exploredAt: string;
};

type AppState = {
  _hasHydrated: boolean;
  accessToken: string | null;
  user: AppUser | null;
  profile: UserProfile | null;
  hasOnboarded: boolean;
  isGuest: boolean;
  selectedCityId: string | null;
  customCities: City[];
  guestNudgeDismissed: boolean;
  savedCities: string[];
  savedExperiences: SavedExperience[];
  savedJourneys: SavedJourney[];
  questions: Question[];
  recentCities: RecentCity[];
  locationPromptDismissed: boolean;
  setHasHydrated: (value: boolean) => void;
  setHasOnboarded: (value: boolean) => void;
  setSelectedCityId: (cityId: string) => void;
  upsertCustomCity: (city: City) => void;
  mergeCustomCities: (cities: City[]) => void;
  ensureCity: (name: string, state?: string) => City;
  continueAsGuest: () => void;
  exitToSignIn: () => void;
  applyAuthSession: (session: {
    accessToken: string;
    user: AppUser;
    profile: UserProfile | null;
  }) => void;
  /** @deprecated local-only fallback — prefer register/login API */
  signUpDemo: (input: { name: string; email: string; provider?: AppUser['provider'] }) => void;
  signInDemo: (input: { name?: string; email: string; provider?: AppUser['provider'] }) => void;
  signOut: () => void;
  saveProfile: (input: Omit<UserProfile, 'completed'> & { completed?: boolean }) => void;
  dismissGuestNudge: () => void;
  dismissLocationPrompt: () => void;
  pushRecentCity: (city: Omit<RecentCity, 'exploredAt'>) => void;
  clearRecentCities: () => void;
  toggleSaveCity: (cityId: string) => void;
  isCitySaved: (cityId: string) => boolean;
  toggleSaveExperience: (
    item: Omit<SavedExperience, 'id' | 'createdAt'>
  ) => { saved: boolean; id: string };
  isExperienceSaved: (sourceId: string) => boolean;
  removeSavedExperience: (id: string) => void;
  replaceSavesFromApi: (payload: {
    cities: string[];
    experiences: SavedExperience[];
  }) => void;
  addQuestion: (question: Omit<Question, 'id' | 'createdAt'>) => boolean;
  saveJourney: (journey: Omit<SavedJourney, 'id' | 'createdAt'>) => SavedJourney;
  removeJourney: (id: string) => void;
};

function mapApiProfile(p: api.ApiProfile | null): UserProfile | null {
  if (!p) return null;
  return {
    homeCityId: p.homeCityId || slugifyCity(p.homeCity || 'home'),
    homeCity: p.homeCity || '',
    interests: p.interests || [],
    travelStyle: p.travelStyle || '',
    aboutCity: p.aboutCity || '',
    completed: Boolean(p.completed),
  };
}

/** Shared mapper for session bootstrap and auth responses. */
export function mapApiProfileFromStore(p: api.ApiProfile | null): UserProfile | null {
  return mapApiProfile(p);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      accessToken: null,
      user: null,
      profile: null,
      hasOnboarded: false,
      isGuest: false,
      selectedCityId: null,
      customCities: [],
      guestNudgeDismissed: false,
      savedCities: [],
      savedExperiences: [],
      savedJourneys: [],
      questions: [],
      recentCities: [],
      locationPromptDismissed: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setHasOnboarded: (value) => set({ hasOnboarded: value }),
      setSelectedCityId: (cityId) => {
        set({ selectedCityId: cityId, hasOnboarded: true });
        const token = get().accessToken;
        if (token) {
          void api.setNotificationCity(token, cityId).catch(() => undefined);
        }
      },
      upsertCustomCity: (city) => {
        const others = get().customCities.filter((c) => c.id !== city.id && c.name.toLowerCase() !== city.name.toLowerCase());
        set({ customCities: [city, ...others] });
      },
      mergeCustomCities: (cities) => {
        if (!cities.length) return;
        const map = new Map<string, City>();
        [...get().customCities, ...cities].forEach((c) => map.set(c.id, c));
        set({ customCities: Array.from(map.values()) });
      },
      ensureCity: (name, state) => {
        const existing = findCityByName(name, get().customCities);
        if (existing) return existing;
        const city = createCityShell({ name, state });
        get().upsertCustomCity(city);
        return city;
      },
      continueAsGuest: () => {
        void clearSessionTokens();
        set({
          isGuest: true,
          user: null,
          profile: null,
          accessToken: null,
          selectedCityId: null,
          hasOnboarded: false,
          guestNudgeDismissed: false,
        });
      },
      exitToSignIn: () => {
        void clearSessionTokens();
        set({
          isGuest: false,
          user: null,
          profile: null,
          accessToken: null,
          hasOnboarded: false,
          selectedCityId: null,
          guestNudgeDismissed: false,
        });
      },
      applyAuthSession: ({ accessToken, user, profile }) => {
        void saveAccessToken(accessToken);
        set({
          accessToken,
          user,
          profile,
          isGuest: false,
          guestNudgeDismissed: true,
          hasOnboarded: Boolean(profile?.completed),
          selectedCityId:
            get().selectedCityId ??
            (profile?.homeCityId || null),
        });
      },
      signUpDemo: ({ name, email, provider = 'email' }) =>
        set({
          accessToken: null,
          user: {
            id: `u_${Date.now()}`,
            name: name.trim() || email.split('@')[0],
            email: email.trim().toLowerCase(),
            provider,
          },
          profile: null,
          isGuest: false,
          hasOnboarded: false,
          guestNudgeDismissed: true,
        }),
      signInDemo: ({ name, email, provider = 'email' }) => {
        const normalized = email.trim().toLowerCase();
        const existing = get().user;
        const sameUser = existing?.email === normalized;
        set({
          accessToken: null,
          user: {
            id: sameUser && existing ? existing.id : `u_${Date.now()}`,
            name: name?.trim() || existing?.name || normalized.split('@')[0] || 'Traveler',
            email: normalized,
            provider,
          },
          isGuest: false,
          guestNudgeDismissed: true,
          profile: sameUser ? get().profile : null,
        });
      },
      signOut: () => {
        void clearSessionTokens();
        set({
          accessToken: null,
          user: null,
          profile: null,
          isGuest: false,
          hasOnboarded: false,
          selectedCityId: null,
          guestNudgeDismissed: false,
        });
      },
      saveProfile: (input) => {
        const homeCity = input.homeCity?.trim() || input.homeCityId;
        const homeCityId = input.homeCityId || slugifyCity(homeCity);
        set({
          profile: {
            homeCityId,
            homeCity,
            interests: input.interests,
            travelStyle: input.travelStyle,
            aboutCity: input.aboutCity,
            completed: input.completed ?? true,
          },
          selectedCityId: get().selectedCityId ?? homeCityId,
          hasOnboarded: true,
        });
      },
      dismissGuestNudge: () => set({ guestNudgeDismissed: true }),
      dismissLocationPrompt: () => set({ locationPromptDismissed: true }),
      pushRecentCity: (city) => {
        const next: RecentCity = {
          ...city,
          exploredAt: new Date().toISOString(),
        };
        const rest = get().recentCities.filter((c) => c.id !== city.id);
        set({ recentCities: [next, ...rest].slice(0, 8) });
      },
      clearRecentCities: () => set({ recentCities: [] }),
      toggleSaveCity: (cityId) => {
        const has = get().savedCities.includes(cityId);
        set({
          savedCities: has
            ? get().savedCities.filter((id) => id !== cityId)
            : [...get().savedCities, cityId],
        });
        const token = get().accessToken;
        if (token) {
          void api.toggleSavedCity(token, cityId).catch(() => {
            // Keep optimistic local state; next sync reconciles
          });
        }
      },
      isCitySaved: (cityId) => get().savedCities.includes(cityId),
      toggleSaveExperience: (item) => {
        const existing = item.sourceId
          ? get().savedExperiences.find((e) => e.sourceId === item.sourceId)
          : undefined;
        if (existing) {
          set({
            savedExperiences: get().savedExperiences.filter((e) => e.id !== existing.id),
          });
          const token = get().accessToken;
          if (token && !existing.id.startsWith('se_')) {
            void api.removeSavedExperience(token, existing.id).catch(() => undefined);
          }
          return { saved: false, id: existing.id };
        }
        const id = `se_${Date.now()}`;
        set({
          savedExperiences: [
            { ...item, id, createdAt: new Date().toISOString() },
            ...get().savedExperiences,
          ],
        });
        const token = get().accessToken;
        if (token) {
          void api
            .toggleSavedExperience(token, {
              title: item.title,
              body: item.body,
              cityId: item.cityId,
              cityName: item.cityName,
              source: item.source,
              sourceId: item.sourceId || id,
            })
            .then((res) => {
              if (res.saved) {
                set({
                  savedExperiences: get().savedExperiences.map((e) =>
                    e.id === id
                      ? {
                          ...e,
                          id: res.id,
                          sourceId: res.sourceId || e.sourceId,
                          createdAt: res.createdAt,
                        }
                      : e
                  ),
                });
              }
            })
            .catch(() => undefined);
        }
        return { saved: true, id };
      },
      isExperienceSaved: (sourceId) =>
        get().savedExperiences.some((e) => e.sourceId === sourceId),
      removeSavedExperience: (id) => {
        set({ savedExperiences: get().savedExperiences.filter((e) => e.id !== id) });
        const token = get().accessToken;
        if (token && !id.startsWith('se_')) {
          void api.removeSavedExperience(token, id).catch(() => undefined);
        }
      },
      replaceSavesFromApi: ({ cities, experiences }) =>
        set({ savedCities: cities, savedExperiences: experiences }),
      addQuestion: (question) => {
        if (get().isGuest || !get().user) return false;
        set({
          questions: [
            {
              ...question,
              id: `q_${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
            ...get().questions,
          ],
        });
        return true;
      },
      saveJourney: (journey) => {
        const saved: SavedJourney = {
          ...journey,
          id: `j_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set({ savedJourneys: [saved, ...get().savedJourneys] });
        return saved;
      },
      removeJourney: (id) =>
        set({ savedJourneys: get().savedJourneys.filter((j) => j.id !== id) }),
    }),
    {
      name: 'aaspaas-session-v6',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        user: s.user,
        profile: s.profile,
        hasOnboarded: s.hasOnboarded,
        isGuest: s.isGuest,
        selectedCityId: s.selectedCityId,
        customCities: s.customCities,
        guestNudgeDismissed: s.guestNudgeDismissed,
        locationPromptDismissed: s.locationPromptDismissed,
        recentCities: s.recentCities,
        savedCities: s.savedCities,
        savedExperiences: s.savedExperiences,
        savedJourneys: s.savedJourneys,
        questions: s.questions,
      }),
      onRehydrateStorage: () => () => {
        /* Gate runs bootstrapSession before marking hydrated */
      },
    }
  )
);

export const isSignedIn = (s: AppState) => Boolean(s.user) && !s.isGuest;
export const isProfileComplete = (s: AppState) => Boolean(s.profile?.completed);

function mapApiExperience(e: api.ApiSavedExperience): SavedExperience {
  const source =
    e.source === 'moment' || e.source === 'place' || e.source === 'post' || e.source === 'custom'
      ? e.source
      : 'custom';
  return {
    id: e.id,
    cityId: e.cityId,
    cityName: e.cityName,
    title: e.title,
    body: e.body || undefined,
    source,
    sourceId: e.sourceId || undefined,
    createdAt: e.createdAt,
  };
}

/** Pull server saves and merge with any local guest saves, then push locals up. */
export async function syncSavesWithApi() {
  const state = useAppStore.getState();
  const token = state.accessToken;
  if (!token) return;

  const localCities = [...state.savedCities];
  const localExperiences = [...state.savedExperiences];

  try {
    const remote = await api.listSaves(token);
    const citySet = new Set([
      ...remote.cities.map((c) => c.id),
      ...localCities,
    ]);
    const bySource = new Map<string, SavedExperience>();
    remote.experiences.map(mapApiExperience).forEach((e) => {
      bySource.set(e.sourceId || e.id, e);
    });
    localExperiences.forEach((e) => {
      const key = e.sourceId || e.id;
      if (!bySource.has(key)) bySource.set(key, e);
    });

    useAppStore.getState().replaceSavesFromApi({
      cities: Array.from(citySet),
      experiences: Array.from(bySource.values()),
    });

    // Push local-only cities / experiences that server doesn't have yet
    const remoteCityIds = new Set(remote.cities.map((c) => c.id));
    for (const cityId of localCities) {
      if (!remoteCityIds.has(cityId)) {
        await api.toggleSavedCity(token, cityId).catch(() => undefined);
      }
    }
    const remoteSourceIds = new Set(
      remote.experiences.map((e) => e.sourceId || e.id)
    );
    for (const exp of localExperiences) {
      const key = exp.sourceId || exp.id;
      if (remoteSourceIds.has(key)) continue;
      await api
        .toggleSavedExperience(token, {
          title: exp.title,
          body: exp.body,
          cityId: exp.cityId,
          cityName: exp.cityName,
          source: exp.source,
          sourceId: exp.sourceId || exp.id,
        })
        .catch(() => undefined);
    }

    const refreshed = await api.listSaves(token);
    useAppStore.getState().replaceSavesFromApi({
      cities: refreshed.cities.map((c) => c.id),
      experiences: refreshed.experiences.map(mapApiExperience),
    });
  } catch {
    // Offline / API down — local saves remain
  }
}

export async function registerWithApi(input: {
  name: string;
  email: string;
  password: string;
}) {
  const res = await api.register(input);
  const { applyAuthResponse } = await import('@/services/sessionBootstrap');
  await applyAuthResponse(res);
  return res;
}

export async function loginWithApi(input: { email: string; password: string }) {
  const res = await api.login(input);
  const { applyAuthResponse } = await import('@/services/sessionBootstrap');
  await applyAuthResponse(res);
  return res;
}

export async function oauthWithApi(input: {
  provider: 'google' | 'apple';
  idToken: string;
  email?: string;
  name?: string;
}) {
  const res = await api.oauthLogin(input);
  const { applyAuthResponse } = await import('@/services/sessionBootstrap');
  await applyAuthResponse(res);
  const cityId = useAppStore.getState().selectedCityId;
  if (cityId && res.accessToken) {
    void api.setNotificationCity(res.accessToken, cityId).catch(() => undefined);
  }
  return res;
}

export async function saveProfileWithApi(
  input: Omit<UserProfile, 'completed'> & { completed?: boolean }
) {
  const token = useAppStore.getState().accessToken;
  useAppStore.getState().saveProfile(input);
  if (!token) return;
  try {
    const res = await api.updateProfile(token, {
      homeCityId: input.homeCityId,
      homeCity: input.homeCity,
      interests: input.interests,
      travelStyle: input.travelStyle,
      aboutCity: input.aboutCity,
      completed: input.completed ?? true,
    });
    useAppStore.getState().applyAuthSession({
      accessToken: token,
      user: {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        provider:
          res.user.provider === 'google' || res.user.provider === 'apple'
            ? res.user.provider
            : useAppStore.getState().user?.provider || 'email',
      },
      profile: mapApiProfile(res.profile),
    });
  } catch {
    // Local profile already saved; sync can retry later
  }
}
