import type { Router } from 'expo-router';
import { mapApiCityToLocal } from '@/services/exploreCopy';
import type { ApiCity } from '@/services/aaspaasApi';
import { useAppStore } from '@/store/useAppStore';
import type { City } from '@/data/cities';

function isApiCity(city: ApiCity | City): city is ApiCity {
  return typeof (city as ApiCity).dbId === 'string' || 'population' in city;
}

/** Open canonical City Page and remember for Continue Exploring. */
export function openCityExperience(
  router: Router,
  city: ApiCity | City,
  opts?: { replace?: boolean },
) {
  const store = useAppStore.getState();
  const local = isApiCity(city) ? mapApiCityToLocal(city) : city;

  store.upsertCustomCity(local);
  store.setSelectedCityId(local.id);
  store.pushRecentCity({
    id: local.id,
    slug: local.slug || local.id,
    name: local.name,
    state: local.state,
    country: local.country,
  });

  const href = {
    pathname: '/city/[id]' as const,
    params: { id: local.id },
  };
  if (opts?.replace) router.replace(href);
  else router.push(href);
}
