# Geographic data — GeoNames

AASPAAS stores a **normalized copy** of geographic records derived from [GeoNames](https://www.geonames.org/).

- License: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)
- Source attribution required for the geographic database
- Runtime apps query **our** database, not GeoNames directly

## Import

```bash
cd backend
# Curated seed hubs
npm run geonames:import

# All India cities/towns from GeoNames country dump (IN.zip)
npm run geonames:import-india
# optional population floor:
CITY_IMPORT_MIN_POPULATION=1000 npm run geonames:import-india
```

V0 also ships a curated seed (`data/geonames/canonical-cities.seed.json`) with real `geoname_id` values for major India destinations (+ a few COMING_SOON internationals for disambiguation tests).

`geonames:import-india` downloads GeoNames `IN.zip` into `data/geonames/download/` and upserts every populated place (PPL / PPLA / …) into Postgres.

## Principles

| Layer | Responsibility |
|-------|----------------|
| GeoNames / Country / State / City | Geographic truth |
| CityStory / posts / vibes | AASPAAS human experience |
| city_id (cuid) | Internal FK everywhere |
| geoname_id | External uniqueness for imports only |
