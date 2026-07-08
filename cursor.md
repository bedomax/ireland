# Ireland / MWBD organic operators — Cursor context

## Project objectives

The CSV contains **organic operators** from a region of Ireland. Each row includes an **address** and, when available, an **Eircode**.

The core goal is to:

1. **Geocode** those addresses / Eircodes into geographic coordinates (**latitude and longitude**) so each operator can be placed on a map.
2. Use those points to generate a **heatmap** that shows where **organic producers concentrate** in the region.

In short: CSV → coordinates → heatmap of organic producer density.

Primary dataset:

- `datasets/operators_in_MWBD.csv`

Scope of the extract: Mid-West / Border counties (`county_final`: Clare, Galway, Limerick, Tipperary).

### Milestone note

The current HTML/JS map is a **county choropleth** (aggregates by zone). That is an interim visualization. The intended end state is a **point-based / kernel density heatmap** once operators are geocoded.

## Live map (basic structure)

The UI is framed around the project objective (CSV → geocode → heat density). The current map is still the **interim county choropleth**; copy and stats surface geocoding progress (`eircodes_present`, `geocoded`).

| Path | Role |
|------|------|
| `index.html` | Map page: objetivo, pipeline, estado de geocoding |
| `css/styles.css` | Layout + theme |
| `js/map.js` | Leaflet choropleth + interactions + geocode status |
| `data/county_stats.json` | Aggregates by county + geocode counters |
| `data/mwbd_counties.geojson` | County polygons + operator counts |
| `data/county_detail.json` | Per-county locateability + activity/category breakdowns |
| `data/operators.json` | Full operator records for the click inspector (address, Eircode, locate path) |
| `datasets/operators_in_MWBD.clean.csv` | Parsed CSV (outer quotes removed) |

Serve locally (required for `fetch`):

```bash
cd /Users/bedomax/startups/ireland
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Dataset review (findings)

| Item | Value |
|------|--------|
| Rows | 1,106 operators |
| Geography | Clare, Galway, Limerick, Tipperary (`county_final`) |
| `geo_status` | all `in_region` |
| Coordinates | **none** (no lat/lon columns) |
| Eircodes present | **723 / 1,106 (65.4%)** — usable for geocoding |
| Primary producers | Yes 1,050 / No 56 |

### Counts by `county_final`

| County | Operators |
|--------|-----------:|
| Galway | 424 |
| Clare | 288 |
| Tipperary | 218 |
| Limerick | 176 |

### Useful columns

| Column | Role for maps |
|--------|----------------|
| `county_final` / `County` | Zone key for choropleth (same values; no mismatches) |
| `Eircode` | Point geocoding (~65% coverage) |
| `Address` | Fallback geocoding when Eircode is missing |
| `Activities` | Filter (mostly `Production`) |
| `Product categories` | Filter / facet heatmaps (`a, b` dominant) |
| `Primary producer?` | Filter heatmap layers |
| `Certification body` | Optional facet (IOA vs Organic Trust) |
| `Data note` | Edge cases (secondary county mentions); rare |

### Product category codes (observed)

Most common: `a, b` (853), then `a, b, g` (134), `a` (43), `d` (42). Treat letters as categorical facets when documenting or filtering maps; expand legend from official TRACES/organic product category definitions if needed.

## CSV parsing caveat (important)

Many data rows are wrapped in an **extra outer pair of quotes**, so a naive `pd.read_csv(...)` collapses almost every row into the first column.

Before analysis / mapping, normalize the file:

1. Read as UTF-8 with BOM (`utf-8-sig`).
2. For each data line: if it starts and ends with `"`, strip the outer quotes and unescape `""` → `"`.
3. Then parse with standard CSV (`csv.DictReader` or pandas).

Prefer writing a cleaned file (e.g. `datasets/operators_in_MWBD.clean.csv`) once and using that for all map pipelines.

## Heatmap strategy

### 1. County choropleth (zone heatmap — do this first)

- Aggregate count (or filters) by `county_final`.
- Join to Ireland county polygons (OSi / CSO / Natural Earth / OpenStreetMap admin boundaries).
- Color scale = operator density (absolute count or per km² / per agricultural area).
- Scope polygons to these four counties unless a national basemap is intentionally shown faded.

This matches “zonas” already present in the CSV without geocoding.

### 2. Point / kernel density heatmap (finer grains)

Requires geocoding:

1. Prefer **Eircode** → lat/lon (e.g. Eircode API, or open Eircode→centroid tables if licensed for use).
2. Fallback: geocode `Address` + county (Nominatim / Google / here) for the ~35% without Eircode.
3. Persist results as e.g. `datasets/operators_geocoded.csv` (`reference`, `lat`, `lon`, `geocode_source`, `geocode_confidence`).
4. Render KDE / hexbin / Folium or MapLibre heatmap on top of the Mid-West basemap.

### 3. Optional faceted layers

Same geography, separate heatmaps or toggles for:

- Primary producers only
- By `Certification body`
- By activity family (Production vs distribution/import/etc.)
- By product category group

## Suggested stack

Keep it simple unless the repo already has a web app:

- **Explore / static:** Python (`pandas` + `geopandas` + `matplotlib`/`folium`/`plotly`)
- **Interactive web:** MapLibre GL or Leaflet + GeoJSON joins
- **Outputs:** `maps/` (HTML or static PNG/SVG) + cleaned CSV alongside geocodes

## Acceptance checks

- [ ] Cleaned CSV parses to 1,106 rows × 12 columns
- [ ] County choropleth sums to 1,106 (or filtered subset with label)
- [ ] Point heatmap only plots rows with validated coordinates; report unmatched share
- [ ] Legend states units (count vs density) and filter applied
- [ ] `Data note` rows are not dropped silently (include or list exclusions)

## Out of scope for now

- National Ireland heatmaps beyond these four counties (unless requested)
- Guessing lat/lon from county centroids alone for “heatmap” density (too coarse / misleading for point KDE)
