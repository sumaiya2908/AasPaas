import { apiRequest } from './api';

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  provider: string;
};

export type ApiProfile = {
  homeCityId: string | null;
  homeCity: string | null;
  interests: string[];
  travelStyle: string | null;
  aboutCity: string | null;
  completed: boolean;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user: ApiUser;
  profile: ApiProfile | null;
};

export type ApiCity = {
  /** Canonical AASPAAS city_id (cuid) */
  id: string;
  slug: string;
  geonameId?: number | null;
  dbId: string;
  name: string;
  state: string;
  country: string;
  stateObj?: { id: string; name: string } | null;
  countryObj?: { id: string; name: string; iso2: string } | null;
  latitude?: number | null;
  longitude?: number | null;
  population?: number | null;
  status?: string;
  weather: string;
  tempC: number;
  mood: string[];
  briefing: string;
  activity?: {
    recentPosts: number;
    recentStories: number;
    saves: number;
    score: number;
  };
};

export type ApiPost = {
  id: string;
  type: string;
  text: string;
  neighborhood: string | null;
  vibeTags: string[];
  ago: string;
  createdAt: string;
  author: { id: string; name: string };
  cityId: string;
  cityName: string;
};

export function register(input: { name: string; email: string; password: string }) {
  return apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: input });
}

export function login(input: { email: string; password: string }) {
  return apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input });
}

export function oauthLogin(input: {
  provider: 'google' | 'apple';
  idToken: string;
  email?: string;
  name?: string;
}) {
  return apiRequest<AuthResponse>('/auth/oauth', { method: 'POST', body: input });
}

export function exchangeOAuthCode(code: string) {
  return apiRequest<AuthResponse>('/auth/exchange', {
    method: 'POST',
    body: { code },
  });
}

export function refreshSession(refreshToken: string) {
  return apiRequest<AuthResponse>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
}

export function logoutSession(refreshToken: string) {
  return apiRequest<{ ok: boolean }>('/auth/logout', {
    method: 'POST',
    body: { refreshToken },
  });
}

export function deleteAccount(token: string) {
  return apiRequest<{ ok: boolean }>('/users/me', {
    method: 'DELETE',
    token,
  });
}

export function fetchMe(token: string) {
  return apiRequest<{ user: ApiUser; profile: ApiProfile | null }>('/auth/me', { token });
}

export function updateProfile(
  token: string,
  input: {
    homeCityId?: string;
    homeCity?: string;
    interests?: string[];
    travelStyle?: string;
    aboutCity?: string;
    completed?: boolean;
  }
) {
  return apiRequest<{ user: ApiUser; profile: ApiProfile }>('/users/me/profile', {
    method: 'PATCH',
    token,
    body: input,
  });
}

export function listCities() {
  return apiRequest<ApiCity[]>('/cities');
}

export function searchCities(q: string, limit = 8) {
  const qs = new URLSearchParams({ q, limit: String(limit) });
  return apiRequest<ApiCity[]>(`/cities/search?${qs.toString()}`);
}

export function discoverCities(limit = 8) {
  const qs = new URLSearchParams({ limit: String(limit) });
  return apiRequest<ApiCity[]>(`/cities/discover?${qs.toString()}`);
}

export function nearbyCity(lat: number, lng: number, radiusKm = 80) {
  const qs = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radiusKm: String(radiusKm),
  });
  return apiRequest<{ city: ApiCity | null; distanceKm: number | null }>(
    `/cities/nearby?${qs.toString()}`,
  );
}

export type ApiTodayItem = {
  id: string;
  type: string;
  text: string;
  neighborhood: string | null;
  vibeTags: string[];
  warn: boolean;
  ago: string;
  createdAt: string;
  author: { id: string; name: string };
};

export type ApiExperienceItem = {
  id: string;
  source: 'post' | 'story';
  title: string;
  body: string;
  neighborhood: string | null;
  vibeTags: string[];
  ago: string;
  createdAt: string;
  authorName: string;
};

export type ApiDayDigest = {
  city: ApiCity;
  source: 'nearby' | 'focus' | null;
  distanceKm: number | null;
  dayLabel: string;
  headline: string;
  summary: string;
  counts: {
    updates: number;
    experiences: number;
    questions: number;
    avoids: number;
  };
  updates: ApiTodayItem[];
  tryToday: ApiExperienceItem[];
  mood: string[];
  empty: boolean;
};

export type ApiHomeFeed = {
  nearby: {
    city: ApiCity | null;
    distanceKm: number | null;
    today: {
      city: ApiCity;
      items: ApiTodayItem[];
      emptyMessage: string | null;
    } | null;
  };
  dayDigest: ApiDayDigest | null;
  discoverCities: ApiCity[];
  generatedAt: string;
};

export function fetchHomeFeed(input?: {
  lat?: number;
  lng?: number;
  limit?: number;
  focusCityId?: string;
}) {
  const qs = new URLSearchParams();
  if (input?.lat != null) qs.set('lat', String(input.lat));
  if (input?.lng != null) qs.set('lng', String(input.lng));
  if (input?.limit != null) qs.set('limit', String(input.limit));
  if (input?.focusCityId) qs.set('focusCityId', input.focusCityId);
  const q = qs.toString();
  return apiRequest<ApiHomeFeed>(`/cities/home${q ? `?${q}` : ''}`);
}

export function fetchCityToday(cityIdOrSlug: string) {
  return apiRequest<{
    city: ApiCity;
    items: ApiTodayItem[];
    emptyMessage: string | null;
  }>(`/cities/${encodeURIComponent(cityIdOrSlug)}/today`);
}

export function fetchCityExperiences(cityIdOrSlug: string, limit = 6) {
  const qs = new URLSearchParams({ limit: String(limit) });
  return apiRequest<{
    city: ApiCity;
    items: ApiExperienceItem[];
    experienceCount?: number;
    weekCount?: number;
    emptyMessage: string | null;
  }>(`/cities/${encodeURIComponent(cityIdOrSlug)}/experiences?${qs}`);
}

/** @deprecated Free-text create is disabled on the API */
export function createCity(
  token: string,
  input: { name: string; state?: string; country?: string }
) {
  return apiRequest<ApiCity>('/cities', { method: 'POST', token, body: input });
}

export function createCityStory(
  token: string,
  input: { cityId: string; content: string; source?: 'ONBOARDING' | 'COMMUNITY' }
) {
  return apiRequest<{
    id: string;
    cityId: string;
    citySlug: string;
    cityName: string;
    content: string;
  }>('/cities/stories', { method: 'POST', token, body: input });
}

export function listPosts(cityId?: string, type?: string) {
  const q = new URLSearchParams();
  if (cityId) q.set('cityId', cityId);
  if (type) q.set('type', type);
  const qs = q.toString();
  return apiRequest<ApiPost[]>(`/posts${qs ? `?${qs}` : ''}`);
}

export function createPost(
  token: string,
  input: {
    type: 'experience' | 'question' | 'avoid';
    text: string;
    cityId?: string;
    cityName?: string;
    neighborhood?: string;
    vibeTags?: string[];
  }
) {
  return apiRequest<ApiPost>('/posts', { method: 'POST', token, body: input });
}

export type ApiSavedCity = {
  id: string;
  dbId: string;
  name: string;
  state: string;
  savedAt: string;
};

export type ApiSavedExperience = {
  id: string;
  cityId: string;
  cityName: string;
  title: string;
  body: string | null;
  source: string;
  sourceId: string | null;
  createdAt: string;
};

export type ApiSaves = {
  cities: ApiSavedCity[];
  experiences: ApiSavedExperience[];
};

export function listSaves(token: string) {
  return apiRequest<ApiSaves>('/saves', { token });
}

export function toggleSavedCity(token: string, cityId: string) {
  return apiRequest<{ saved: boolean; cityId: string }>('/saves/cities', {
    method: 'POST',
    token,
    body: { cityId },
  });
}

export function toggleSavedExperience(
  token: string,
  input: {
    title: string;
    body?: string;
    cityId?: string;
    cityName?: string;
    source?: 'moment' | 'place' | 'custom' | 'post';
    sourceId?: string;
  }
) {
  return apiRequest<
    | { saved: false; id: string }
    | {
        saved: true;
        id: string;
        cityId: string;
        cityName: string;
        title: string;
        body: string | null;
        source: string;
        sourceId: string | null;
        createdAt: string;
      }
  >('/saves/experiences', { method: 'POST', token, body: input });
}

export function removeSavedExperience(token: string, id: string) {
  return apiRequest<{ ok: boolean }>(`/saves/experiences/${id}`, {
    method: 'DELETE',
    token,
  });
}

export type RagCitation = {
  id: string;
  title: string;
  sourceType: string;
  authorName: string | null;
  neighborhood: string | null;
  score: number;
};

export type RagJourneyResponse = {
  source: 'rag' | 'empty_corpus' | 'community_first_demo';
  suggestedStops: {
    title: string;
    reason: string;
    neighborhood?: string | null;
    why: string;
  }[];
  whyByTheme: { theme: string; summary: string }[];
  citations: RagCitation[];
  retrieved: number;
  grounded?: boolean;
  confidence?: number;
};

export type RagQueryResponse = {
  answer: string;
  citations: RagCitation[];
  mode: 'rag' | 'empty_corpus';
  retrieved: number;
  grounded?: boolean;
  confidence?: number;
};

export function ragHealth() {
  return apiRequest<{
    ok: boolean;
    chunks: number;
    embeddingProvider: string;
    modelHint: string;
  }>('/rag/health');
}

export function ragSeed() {
  return apiRequest<{ upserted: number }>('/rag/seed', { method: 'POST' });
}

export function ragQuery(input: { citySlug: string; query: string; topK?: number }) {
  return apiRequest<RagQueryResponse>('/rag/query', { method: 'POST', body: input });
}

export function ragJourney(input: {
  citySlug: string;
  cityName?: string;
  days?: number;
  vibe?: string;
  style?: string;
  food?: string;
  interests?: string[];
}) {
  return apiRequest<RagJourneyResponse>('/rag/journey', { method: 'POST', body: input });
}

export type ApiNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  citySlug: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export function listNotifications(token: string) {
  return apiRequest<{ unread: number; items: ApiNotification[] }>('/notifications', {
    token,
  });
}

export function registerPushToken(
  token: string,
  input: { token: string; platform?: string }
) {
  return apiRequest<{ ok: boolean }>('/notifications/push-token', {
    method: 'POST',
    token,
    body: input,
  });
}

export function setNotificationCity(token: string, citySlug: string) {
  return apiRequest<{ ok: boolean; currentCitySlug: string }>('/notifications/current-city', {
    method: 'POST',
    token,
    body: { citySlug },
  });
}

export function markNotificationsRead(token: string, id?: string) {
  if (id) {
    return apiRequest<{ ok: boolean }>(`/notifications/${id}/read`, {
      method: 'PATCH',
      token,
    });
  }
  return apiRequest<{ ok: boolean }>('/notifications/read', {
    method: 'PATCH',
    token,
  });
}

