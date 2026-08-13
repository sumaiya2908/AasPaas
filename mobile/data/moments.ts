/**
 * Local moments — the emotional unit of AASPAAS.
 * Not ratings. Stories, memories, and little feelings that make a city alive.
 *
 * Shape is RAG-ready: city, feeling, place hint, narrative, freshness, author trust.
 */

export type LocalMoment = {
  id: string;
  cityId: string;
  /** Emotional hook — why someone would seek this */
  feeling: string;
  /** Neighborhood / spot at city level — never precise GPS */
  placeHint: string;
  /** The story itself */
  story: string;
  author: string;
  ago: string;
};

export const MOMENTS: LocalMoment[] = [
  {
    id: 'jm1',
    cityId: 'jaipur',
    feeling: 'After a difficult day',
    placeHint: 'Nahargarh · western rampart',
    story:
      'I come here when the Old City has been too loud. The light softens around 6:20, and for twenty minutes the whole pink city feels quiet enough to breathe again.',
    author: 'Kabir',
    ago: '2h ago',
  },
  {
    id: 'jm2',
    cityId: 'jaipur',
    feeling: 'The tea stall locals never leave',
    placeHint: 'Second lane off Johari Bazaar',
    story:
      'Blue canopy, same uncle for years. He doesn’t smile for tourists — he smiles when you order the second cup. Masala chai, standing, watching the silver shops wake up.',
    author: 'Meera',
    ago: '5h ago',
  },
  {
    id: 'jm3',
    cityId: 'jaipur',
    feeling: 'A street that feels magical after rain',
    placeHint: 'Tripolia Bazaar side lanes',
    story:
      'When it rains, the pink walls darken and the smell of wet stone mixes with jalebi oil. Walk slowly. The tourist rush thins, and the lanes feel like a secret again.',
    author: 'Ananya',
    ago: 'Yesterday',
  },
  {
    id: 'jm4',
    cityId: 'jaipur',
    feeling: 'The noodle corner guides never list',
    placeHint: 'Near Chandpole · evening cart',
    story:
      'No signboard worth photographing. Just a cart, a wok, and regulars who arrive without checking Google. Ask for less oil if you want it the way locals do.',
    author: 'Arjun',
    ago: '3h ago',
  },
  {
    id: 'gm1',
    cityId: 'goa',
    feeling: 'Where the evening slows down',
    placeHint: 'Fontainhas · quiet lane',
    story:
      'After the beach noise, I walk these yellow houses until the light turns gold. There’s a tiny bakery that still smells like butter at 7pm — that’s my reset.',
    author: 'Leah',
    ago: '4h ago',
  },
  {
    id: 'gm2',
    cityId: 'goa',
    feeling: 'A stall that feels like home',
    placeHint: 'Mapusa market edge',
    story:
      'Same woman, same steel tumblers, same sweet tea. She remembers faces. That matters more than any café ranking.',
    author: 'Rohan',
    ago: '1d ago',
  },
  {
    id: 'km1',
    cityId: 'kochi',
    feeling: 'Harbor light after a long day',
    placeHint: 'Fort Kochi sea walk',
    story:
      'When Chinese nets silhouette against the sky, the city exhales. Bring nothing. Just walk until the ferries look like floating lanterns.',
    author: 'Nisha',
    ago: '6h ago',
  },
  {
    id: 'km2',
    cityId: 'kochi',
    feeling: 'Rain on old stones',
    placeHint: 'Jew Town backstreets',
    story:
      'After rain, the spice smell rises from the wood and the lanes empty for a moment. That’s when Kochi feels like a story you’re allowed inside.',
    author: 'Dev',
    ago: 'Yesterday',
  },
  {
    id: 'hm1',
    cityId: 'hampi',
    feeling: 'Sunrise that resets everything',
    placeHint: 'Matanga Hill',
    story:
      'Climb in the dark with a small torch. At the top, the ruins wake pink. I’ve never needed a guidebook after that morning — only quieter days.',
    author: 'Sana',
    ago: '8h ago',
  },
];

export function getMomentsByCity(cityId: string): LocalMoment[] {
  return MOMENTS.filter((m) => m.cityId === cityId);
}

/** Story prompts that teach contributors what “good” looks like on AasPaas */
export const STORY_PROMPT_OPTIONS = [
  {
    id: 'hard-day',
    label: 'After a hard day',
    prompt: 'Where do you go after a difficult day?',
  },
  {
    id: 'tea',
    label: 'Beloved tea stall',
    prompt: 'Which tea stall have locals loved for years?',
  },
  {
    id: 'rain',
    label: 'After it rains',
    prompt: 'Which street feels magical after it rains?',
  },
  {
    id: 'hidden',
    label: 'Never in guides',
    prompt: 'Which corner vendor never shows up in travel guides?',
  },
] as const;

export const STORY_PROMPTS = STORY_PROMPT_OPTIONS.map((p) => p.prompt);
