export type Experience = {
  id: string;
  type: 'recommendation' | 'hidden_gem' | 'warning' | 'question' | 'photo';
  title: string;
  body: string;
  author: string;
  badge?: string;
  helpful: number;
  ago: string;
};

export type Place = {
  id: string;
  cityId: string;
  name: string;
  area: string;
  category: string;
  livingScore: number;
  bestTime: string;
  aiSummary: string;
  vibe: string[];
  experiences: Experience[];
};

export const PLACES: Place[] = [
  {
    id: 'johari-bazaar',
    cityId: 'jaipur',
    name: 'Johari Bazaar',
    area: 'Old City',
    category: 'Street Food',
    livingScore: 92,
    bestTime: '5–8 PM',
    aiSummary:
      'Locals say tonight is perfect for chaat hopping. Expect crowds, bright lights, and the best kachori under ₹80. Skip the main tourist sweet shops — turn into the second lane.',
    vibe: ['Street Food', 'Night Market', 'Local'],
    experiences: [
      {
        id: 'e1',
        type: 'recommendation',
        title: 'Best kachori under ₹80',
        body: 'Skip the front stalls. Walk 40 meters into the second lane — the uncle with the blue canopy is the real deal. Pair with mirchi vada.',
        author: 'Meera',
        badge: 'Local Guide',
        helpful: 48,
        ago: '2h',
      },
      {
        id: 'e2',
        type: 'hidden_gem',
        title: 'Rooftop tea after chaat',
        body: 'Tiny rooftop above the silver shop. Ask for masala chai. Sunset views of Hawa Mahal lane without the tourist density.',
        author: 'Arjun',
        badge: 'Food Expert',
        helpful: 31,
        ago: '5h',
      },
      {
        id: 'e3',
        type: 'warning',
        title: 'Auto rates spike after 8',
        body: 'Autos quote tourist prices after dinner rush. Walk to the metro edge or use a prepaid booth.',
        author: 'Priya',
        badge: 'Traveler',
        helpful: 22,
        ago: '1d',
      },
      {
        id: 'e4',
        type: 'question',
        title: 'Vegetarian thali nearby under ₹200?',
        body: 'Staying near the bazaar tonight. Looking for a proper thali, not tourist buffet.',
        author: 'Sam',
        badge: 'Backpacker',
        helpful: 6,
        ago: '3h',
      },
    ],
  },
  {
    id: 'nahargarh',
    cityId: 'jaipur',
    name: 'Nahargarh Fort',
    area: 'Aravalli Hills',
    category: 'Sunset Spot',
    livingScore: 88,
    bestTime: 'Golden hour',
    aiSummary:
      'Community agrees tonight’s sunset will be clear. Arrive 45 minutes early. Food stalls near the parking are average — bring water and a light snack.',
    vibe: ['Sunset', 'Views', 'Photography'],
    experiences: [
      {
        id: 'e5',
        type: 'recommendation',
        title: 'Arrive 45 mins early',
        body: 'Best light is before the main crowd. The western rampart is quieter than the café viewpoint.',
        author: 'Kabir',
        badge: 'Photographer',
        helpful: 39,
        ago: '4h',
      },
      {
        id: 'e6',
        type: 'hidden_gem',
        title: 'Quiet rampart for photos',
        body: 'Walk past the café, left along the wall. Fewer people, better silhouette shots of the city.',
        author: 'Nina',
        badge: 'Photographer',
        helpful: 27,
        ago: '8h',
      },
    ],
  },
  {
    id: 'assagao-cafe',
    cityId: 'goa',
    name: 'Assagao Courtyard Café',
    area: 'Assagao',
    category: 'Café',
    livingScore: 85,
    bestTime: '10 AM – 1 PM',
    aiSummary:
      'Locals reopened the courtyard this morning. Slow brunch energy, great filter coffee, and shade if the sun gets sharp.',
    vibe: ['Café', 'Quiet', 'Work-friendly'],
    experiences: [
      {
        id: 'e7',
        type: 'recommendation',
        title: 'Order the coconut pancakes',
        body: 'Small menu, big payoff. Sit under the mango tree if you can — cooler and quieter.',
        author: 'Lara',
        badge: 'Local',
        helpful: 18,
        ago: '1h',
      },
      {
        id: 'e8',
        type: 'hidden_gem',
        title: 'Ask for the back table',
        body: 'There’s a table near the herb garden that never shows on Instagram. Perfect for reading.',
        author: 'Dev',
        badge: 'Digital Nomad',
        helpful: 14,
        ago: '6h',
      },
    ],
  },
  {
    id: 'fort-kochi-nets',
    cityId: 'kochi',
    name: 'Chinese Fishing Nets',
    area: 'Fort Kochi',
    category: 'Landmark',
    livingScore: 90,
    bestTime: 'Sunset + dinner',
    aiSummary:
      'Seafood stalls are excellent today. Walk the promenade before sunset, then eat after the day-trip buses leave.',
    vibe: ['Seafood', 'Heritage', 'Sunset'],
    experiences: [
      {
        id: 'e9',
        type: 'recommendation',
        title: 'Eat after 6:30 for fresher catch',
        body: 'The third stall from the left has today’s pearl spot. Ask the price before they grill.',
        author: 'Ananya',
        badge: 'Local Guide',
        helpful: 42,
        ago: '2h',
      },
      {
        id: 'e10',
        type: 'warning',
        title: 'Day-trip bus rush 4–5:30',
        body: 'Photos get crowded. Come earlier or wait until buses leave — magic returns fast.',
        author: 'Tom',
        badge: 'Traveler',
        helpful: 17,
        ago: '5h',
      },
    ],
  },
  {
    id: 'matanga-hill',
    cityId: 'hampi',
    name: 'Matanga Hill',
    area: 'Hampi Bazaar',
    category: 'Sunrise Trek',
    livingScore: 94,
    bestTime: 'Sunrise',
    aiSummary:
      'Sunrise was confirmed stunning this morning. Carry a torch for the scramble, and descend before it gets too hot.',
    vibe: ['Sunrise', 'Adventure', 'Views'],
    experiences: [
      {
        id: 'e11',
        type: 'recommendation',
        title: 'Start climb by 5:15',
        body: 'Path is rocky but short. Torch essential. Sit on the eastern rocks for the temple silhouette.',
        author: 'Ravi',
        badge: 'Backpacker',
        helpful: 55,
        ago: '6h',
      },
      {
        id: 'e12',
        type: 'hidden_gem',
        title: 'Breakfast after descent',
        body: 'Small banana leaf place near the base opens early. Perfect after the climb.',
        author: 'Sofia',
        badge: 'Traveler',
        helpful: 23,
        ago: '1d',
      },
    ],
  },
];

export function getPlacesByCity(cityId: string) {
  return PLACES.filter((p) => p.cityId === cityId);
}

export function getPlace(id: string) {
  return PLACES.find((p) => p.id === id);
}
