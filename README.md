# Agape-weather-app
# Agape Weather App

A small weather dashboard built with React, TypeScript and Vite. Type a city to see the weather right now and the next 3 days. It works on phones, and a city that doesn't exist gets a friendly message instead of an error.

## Features

- Search for any city, or tap a popular city (Lagos, London, Tokyo, New York, Paris)
- Current temperature, "feels like", humidity, wind and the city's local time
- Forecast for the next 3 days with highs and lows
- Loading indicator, "City not found" notice and a general error message
- Mobile-friendly layout; no API key needed

## Getting started

Requires Node.js 20 or newer.

```bash
cd weather
npm install
npm run dev
```

Then open the `localhost` address that Vite prints.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `weather/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

> If `npm install` fails with `Cannot read properties of null (reading 'edgesOut')`, run `npm install --legacy-peer-deps`. If the build then says it can't resolve `@typescript/typescript-<platform>`, install that package for your platform, for example `npm install --no-save @typescript/typescript-darwin-arm64@7.0.2`.

## Project structure

```text
weather/
  src/
    App.tsx      The page: search, status messages, current weather, 3-day forecast
    App.css      All styling
    weather.ts   Helpers for geocoding (with Photon backup) and forecast requests
    main.tsx     App entry point
```

## How the app gets the weather

The app uses two free Open-Meteo APIs. The geocoding API turns a place name into coordinates; the forecast API uses those coordinates to return weather information.

### 1. City to coordinates

The app first looks up the city with Open-Meteo Geocoding:

```text
https://geocoding-api.open-meteo.com/v1/search?name=Lagos&count=1
```

`name` is the city to search for, and `count=1` asks for one match. When a result is found, the app reads its `latitude` and `longitude` (for example, Lagos is approximately `6.45, 3.39`). If the lookup returns no results, the city was not found.

If Open-Meteo does not respond within 2 seconds, the app can try Photon as a backup:

```text
https://photon.komoot.io/api/?q=Lagos&limit=1&layer=city
```

Photon's `layer=city` limits the search to cities, and `limit=1` requests one match. Its coordinates are returned in `features[0].geometry.coordinates` in **longitude, latitude** order. Open-Meteo returns `results[0].latitude` and `results[0].longitude` as named fields, so the app can read each coordinate directly.

> The 2-second limit and Photon backup are implemented in `weather/src/weather.ts`, but `App.tsx` currently calls Open-Meteo directly and does not use them yet.

### 2. Coordinates to weather

Once the city coordinates are known, the app requests its forecast from Open-Meteo:

```text
https://api.open-meteo.com/v1/forecast?latitude=6.45&longitude=3.39
  &current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day
  &daily=temperature_2m_max,temperature_2m_min,weather_code
  &forecast_days=4
  &timezone=auto
```

(Shown on several lines for readability; it is a single URL.)

| Parameter | Meaning |
| --- | --- |
| `latitude`, `longitude` | Where to get the weather for (from step 1) |
| `current=…` | Conditions right now |
| `daily=…` | Each day's highest and lowest temperature and sky code |
| `forecast_days=4` | Today plus the next 3 days (the page shows the 3 days after today) |
| `timezone=auto` | Use the city's local time |

Photon is only a backup for city lookup; the forecast request always uses Open-Meteo.

## Deploying

```bash
cd weather
npm run build
npx vercel --prod
```

If Vercel fails, drag the `weather/dist` folder onto [Netlify Drop](https://app.netlify.com/drop).

## Credits

Weather and geocoding data from [Open-Meteo](https://open-meteo.com/); backup geocoding from [Photon](https://photon.komoot.io/).
