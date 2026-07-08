# MWBD Organic Producers — Ireland

Map organic operators from Ireland’s Mid-West / Border area and show where they concentrate.

**Live demo:** [ireland-topaz.vercel.app](https://ireland-topaz.vercel.app)  
**Goal:** CSV addresses + Eircodes → lat/lon → producer density heat map

## What this is

The dataset has **1,106 certified organic operators** across **Clare, Galway, Limerick and Tipperary**. Each row has an operator name, postal address and, for most records, an **Eircode**.

This project turns that table into an interactive map:

1. Clean and explore the CSV  
2. Visualise density by county (current interim view)  
3. Geocode Eircode / address → coordinates *(next)*  
4. Point heat map of real producer concentration *(target)*

## Current features

- County choropleth of operator counts (Leaflet)
- Pipeline status: CSV → zones → geocoding → heat map
- Geocoding readiness stats (**723 / 1,106** with Eircode)
- Click a county to inspect records and locate paths (`Eircode` vs address-only)
- **View more** producer directory with contact fields from the CSV  
  (name, postal address, Eircode, county, certification body — no email/phone in source)

## Dataset snapshot

| County | Operators | With Eircode |
|--------|----------:|-------------:|
| Galway | 424 | 280 |
| Clare | 288 | 197 |
| Tipperary | 218 | 161 |
| Limerick | 176 | 85 |
| **Total** | **1,106** | **723 (65.4%)** |

Source file: `datasets/operators_in_MWBD.csv`  
Cleaned parse: `datasets/operators_in_MWBD.clean.csv`

> Many raw rows are wrapped in an extra pair of quotes. Always prefer the cleaned CSV (or re-run the unwrap step) before analysis.

## Project structure

```
ireland/
├── index.html              # Map UI
├── css/styles.css
├── js/map.js               # Leaflet map + inspector + directory
├── data/
│   ├── county_stats.json   # Aggregates + geocode counters
│   ├── county_detail.json  # Per-county locateability / breakdowns
│   ├── mwbd_counties.geojson
│   └── operators.json      # Operator records for the UI
├── datasets/
│   ├── operators_in_MWBD.csv
│   └── operators_in_MWBD.clean.csv
├── cursor.md               # Project context / agent notes
└── vercel.json
```

## Run locally

Static site — needs a local HTTP server so `fetch` can load JSON:

```bash
cd ireland
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## Deploy

- **GitHub:** https://github.com/bedomax/ireland  
- **Vercel:** connected to `main` — push deploys automatically  
- Production URL: https://ireland-topaz.vercel.app

```bash
# optional manual deploy
vercel --prod
```

## Roadmap

- [x] Clean CSV and county choropleth
- [x] County inspector + producer directory
- [ ] Geocode Eircodes (preferred) and addresses (fallback)
- [ ] Persist `lat` / `lon` per operator
- [ ] Kernel / hex heat map of producer density
- [ ] Optional filters (primary producer, certification body, activity)

## Notes

- Tipperary polygons merge North + South; Galway / Limerick merge city + county.
- “Contact” in the directory means postal identity fields from the CSV only.
- `cursor.md` holds detailed parsing notes and acceptance checks for agents.

## Licence / data

Operator data originates from the MWBD organic operators extract used for this project. County boundaries for the map are derived from open Ireland counties GeoJSON (Click That Hood). Map tiles: © OpenStreetMap, © CARTO.
